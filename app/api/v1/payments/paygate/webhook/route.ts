import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
    const supabase = createAdminClient();
    const rawBody = await req.text();

    // Support multiple signature headers
    const signature = 
        req.headers.get('x-paygate-signature') || 
        req.headers.get('x-signature') || 
        req.headers.get('x-ipn-signature');

    let payload: any = {};
    let orderId = '';
    let status = '';
    let transactionId = '';
    let paymentRef = '';

    try {
        payload = JSON.parse(rawBody);
        orderId = payload.order_id || payload.orderId || payload.reference || '';
        status = payload.status || ''; // e.g., 'paid', 'success', 'completed', 'failed', 'cancelled'
        transactionId = payload.transaction_id || payload.transactionId || payload.hash || '';
        paymentRef = payload.payment_ref || payload.paymentRef || payload.id || '';
    } catch (parseErr) {
        console.error('[PayGate Webhook] Failed to parse payload:', parseErr);
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    try {
        // 2. Fetch PayGate secrets from database (requires service role / admin client)
        const { data: settings, error: settingsError } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('provider', 'paygate')
            .single();

        if (settingsError || !settings) {
            console.error('[PayGate Webhook] Settings not found in database:', settingsError);
            return NextResponse.json({ error: 'Gateway settings missing' }, { status: 500 });
        }

        const secretConfig = settings.secret_config || {};
        const ipnSecret = secretConfig.ipn_secret;

        if (!ipnSecret) {
            console.warn('[PayGate Webhook] Webhook signature key (ipnSecret) is not configured. Trusting webhook (development fallback).');
        }

        // 3. Verify Signature (if secret key is set)
        if (ipnSecret) {
            if (!signature) {
                console.warn('[PayGate Webhook] Signature header missing. Logging failure.');
                await supabase.from('payment_gateway_logs').insert({
                    provider: 'paygate',
                    event_type: 'webhook_signature_failed',
                    order_id: orderId,
                    payment_ref: paymentRef,
                    status: 'failed',
                    request_payload: { headers: { 'signature': null }, body: payload },
                    status_code: 401
                });
                return NextResponse.json({ error: 'Signature header is required.' }, { status: 401 });
            }

            // Generate computed signature digests (handle both hex and base64 encodings)
            const computedHex = crypto
                .createHmac('sha256', ipnSecret)
                .update(rawBody)
                .digest('hex');

            const computedBase64 = crypto
                .createHmac('sha256', ipnSecret)
                .update(rawBody)
                .digest('base64');

            const incomingBuffer = Buffer.from(signature, 'utf8');
            const hexBuffer = Buffer.from(computedHex, 'utf8');
            const base64Buffer = Buffer.from(computedBase64, 'utf8');

            let isValid = false;
            if (incomingBuffer.length === hexBuffer.length && crypto.timingSafeEqual(incomingBuffer, hexBuffer)) {
                isValid = true;
            } else if (incomingBuffer.length === base64Buffer.length && crypto.timingSafeEqual(incomingBuffer, base64Buffer)) {
                isValid = true;
            }

            if (!isValid) {
                console.error(`[PayGate Webhook] Signature verification failed. Received: ${signature}`);
                await supabase.from('payment_gateway_logs').insert({
                    provider: 'paygate',
                    event_type: 'webhook_signature_failed',
                    order_id: orderId,
                    payment_ref: paymentRef,
                    status: 'failed',
                    request_payload: { headers: { 'signature': signature }, body: payload },
                    status_code: 401
                });
                return NextResponse.json({ error: 'Invalid webhook signature verification.' }, { status: 401 });
            }
        }

        console.log(`[PayGate Webhook] Verified signature successfully! Order ID: ${orderId}, Status: ${status}`);

        // 4. Load the transaction from Supabase matching reference_id or metadata paygate_invoice_id
        let { data: tx, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('reference_id', orderId)
            .maybeSingle();

        if (!tx && paymentRef) {
            const { data: txByInvoice } = await supabase
                .from('transactions')
                .select('*')
                .eq('metadata->>paygate_invoice_id', paymentRef)
                .maybeSingle();
            tx = txByInvoice;
        }

        if (!tx) {
            console.error(`[PayGate Webhook] No local transaction found matching reference ID: ${orderId}`);
            await supabase.from('payment_gateway_logs').insert({
                provider: 'paygate',
                event_type: 'webhook_unmatched_tx',
                order_id: orderId,
                payment_ref: paymentRef,
                status: 'ignored',
                request_payload: payload,
                status_code: 404
            });
            return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
        }

        // 5. Idempotency Guard: prevent duplicate webhook logic
        if (tx.status === 'completed' || tx.status === 'failed') {
            console.log(`[PayGate Webhook] Transaction ${tx.id} already processed (Status: ${tx.status}). Ignoring duplicate.`);
            await supabase.from('payment_gateway_logs').insert({
                provider: 'paygate',
                event_type: 'webhook_duplicate_ignored',
                order_id: orderId,
                payment_ref: paymentRef,
                status: 'success',
                request_payload: payload,
                status_code: 200
            });
            return NextResponse.json({ success: true, message: 'Transaction already completed.' });
        }

        // 6. Handle webhook statuses
        const isPaid = status === 'paid' || status === 'success' || status === 'completed';
        const isFailed = status === 'failed';
        const isCancelled = status === 'cancelled';

        if (isPaid) {
            console.log(`[PayGate Webhook] Top-up approved for transaction ${tx.id}. Amount: €${tx.amount}`);

            // Fetch the user's wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('id', tx.wallet_id)
                .single();

            if (walletError || !wallet) {
                console.error('[PayGate Webhook] Associated wallet not found.');
                return NextResponse.json({ error: 'Associated wallet missing' }, { status: 500 });
            }

            const currentBalance = parseFloat(wallet.balance || 0);
            const newBalance = currentBalance + parseFloat(tx.amount);

            // Update Transaction to completed
            const { error: txUpdateError } = await supabase
                .from('transactions')
                .update({
                    status: 'completed',
                    metadata: {
                        ...tx.metadata,
                        paygate_webhook_payload: payload,
                        paygate_transaction_id: transactionId,
                        processed_at: new Date().toISOString()
                    }
                })
                .eq('id', tx.id);

            if (txUpdateError) throw txUpdateError;

            // Increment Wallet Balance
            const { error: walletUpdateError } = await supabase
                .from('wallets')
                .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            if (walletUpdateError) {
                // Rollback transaction to pending if wallet update fails
                await supabase.from('transactions').update({ status: 'pending' }).eq('id', tx.id);
                throw walletUpdateError;
            }

            console.log(`[PayGate Webhook] Balance updated successfully! Wallet UUID: ${wallet.id}, New Balance: €${newBalance}`);

            // Log success event
            await supabase.from('payment_gateway_logs').insert({
                provider: 'paygate',
                event_type: 'webhook_verified',
                order_id: orderId,
                payment_ref: paymentRef,
                status: 'paid',
                request_payload: payload,
                status_code: 200
            });

            return NextResponse.json({ success: true, message: 'Balance loaded successfully.' });

        } else if (isFailed || isCancelled) {
            console.log(`[PayGate Webhook] Transaction failed/cancelled. Status: ${status}`);

            await supabase
                .from('transactions')
                .update({
                    status: 'failed',
                    description: `PayGate reported status: ${status}`,
                    metadata: { ...tx.metadata, paygate_webhook_payload: payload }
                })
                .eq('id', tx.id);

            await supabase.from('payment_gateway_logs').insert({
                provider: 'paygate',
                event_type: 'webhook_verified',
                order_id: orderId,
                payment_ref: paymentRef,
                status: status,
                request_payload: payload,
                status_code: 200
            });

            return NextResponse.json({ success: true, message: `Transaction marked as ${status}.` });
        }

        // Return pending response for unhandled codes
        await supabase.from('payment_gateway_logs').insert({
            provider: 'paygate',
            event_type: 'webhook_verified',
            order_id: orderId,
            payment_ref: paymentRef,
            status: status || 'pending',
            request_payload: payload,
            status_code: 200
        });

        return NextResponse.json({ success: true, message: `Received unresolved status: ${status}` });

    } catch (err: any) {
        console.error('[PayGate Webhook] Webhook execution error:', err);
        return NextResponse.json({ error: 'Internal callback processing error: ' + err.message }, { status: 500 });
    }
}
