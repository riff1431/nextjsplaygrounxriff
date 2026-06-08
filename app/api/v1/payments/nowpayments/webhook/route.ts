import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
    const supabase = createAdminClient();
    const rawBody = await req.text();
    const signature = req.headers.get('x-nowpayments-sig');

    let payload: any = {};
    let orderId = '';
    let status = '';
    let paymentId = '';

    try {
        // 1. Parse JSON from raw body
        payload = JSON.parse(rawBody);
        orderId = payload.order_id || '';
        status = payload.payment_status || '';
        paymentId = String(payload.payment_id || '');
    } catch (parseErr) {
        console.error('[NOWPayments Webhook] Failed to parse payload:', parseErr);
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    try {
        // 2. Fetch NOWPayments secret configurations from database
        const { data: settings, error: settingsError } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('provider', 'nowpayments')
            .single();

        if (settingsError || !settings) {
            console.error('[NOWPayments Webhook] NOWPayments settings not found in database:', settingsError);
            return NextResponse.json({ error: 'Gateway settings missing' }, { status: 500 });
        }

        const secretConfig = settings.secret_config || {};
        const ipnSecret = secretConfig.ipn_secret;

        if (!ipnSecret) {
            console.error('[NOWPayments Webhook] Webhook IPN secret is not configured.');
            return NextResponse.json({ error: 'Webhook secret unconfigured' }, { status: 500 });
        }

        // 3. Verify HMAC Signature
        if (!signature) {
            console.warn('[NOWPayments Webhook] Rejected: Missing x-nowpayments-sig header.');
            // Log failure in gateway logs
            await supabase.from('payment_gateway_logs').insert({
                provider: 'nowpayments',
                event_type: 'webhook_signature_failed',
                order_id: orderId,
                payment_ref: paymentId,
                status: 'failed',
                request_payload: { headers: { 'x-nowpayments-sig': null }, body: payload },
                status_code: 401
            });
            return NextResponse.json({ error: 'Signature header required' }, { status: 401 });
        }

        // Sort keys alphabetically and stringify
        const sortedString = JSON.stringify(payload, Object.keys(payload).sort());

        // Create HMAC-SHA512 hash
        const computedSignature = crypto
            .createHmac('sha512', ipnSecret)
            .update(sortedString)
            .digest('hex');

        // Constant-time signature comparison to prevent timing attacks
        const sigBuffer = Buffer.from(signature, 'utf8');
        const compBuffer = Buffer.from(computedSignature, 'utf8');
        let isValid = false;
        
        if (sigBuffer.length === compBuffer.length) {
            isValid = crypto.timingSafeEqual(sigBuffer, compBuffer);
        }

        if (!isValid) {
            console.error(`[NOWPayments Webhook] Signature verification failed. Received: ${signature}, Computed: ${computedSignature}`);
            
            await supabase.from('payment_gateway_logs').insert({
                provider: 'nowpayments',
                event_type: 'webhook_signature_failed',
                order_id: orderId,
                payment_ref: paymentId,
                status: 'failed',
                request_payload: { headers: { 'x-nowpayments-sig': signature }, body: payload },
                status_code: 401
            });
            return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
        }

        console.log(`[NOWPayments Webhook] Verified signature successfully! Order ID: ${orderId}, Status: ${status}`);

        // 4. Load the pending transaction from local DB matching reference_id (order_id)
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('reference_id', orderId)
            .single();

        if (txError || !tx) {
            console.error(`[NOWPayments Webhook] No local transaction found matching reference_id (order_id): ${orderId}`);
            await supabase.from('payment_gateway_logs').insert({
                provider: 'nowpayments',
                event_type: 'webhook_unmatched_tx',
                order_id: orderId,
                payment_ref: paymentId,
                status: 'ignored',
                request_payload: payload,
                status_code: 404
            });
            return NextResponse.json({ error: 'Transaction matching order_id not found' }, { status: 404 });
        }

        // 5. Duplicate Webhook Prevention (Idempotency Guard)
        if (tx.status === 'completed' || tx.status === 'failed') {
            console.log(`[NOWPayments Webhook] Order ${orderId} already processed (Status: ${tx.status}). Responding HTTP 200.`);
            await supabase.from('payment_gateway_logs').insert({
                provider: 'nowpayments',
                event_type: 'webhook_duplicate_ignored',
                order_id: orderId,
                payment_ref: paymentId,
                status: 'success',
                request_payload: payload,
                status_code: 200
            });
            return NextResponse.json({ success: true, message: 'Already processed' });
        }

        // 6. Process Payment Outcomes
        if (status === 'finished') {
            console.log(`[NOWPayments Webhook] Crypto deposit approved for transaction ${tx.id}. Amount: €${tx.amount}`);

            // Fetch the user's wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('id', tx.wallet_id)
                .single();

            if (walletError || !wallet) {
                console.error('[NOWPayments Webhook] Wallet matching transaction was not found.');
                return NextResponse.json({ error: 'Associated wallet missing' }, { status: 500 });
            }

            // Perform balance increment and complete transaction status atomically
            const newBalance = parseFloat(wallet.balance) + parseFloat(tx.amount);

            // Update Transaction
            const { error: txUpdateError } = await supabase
                .from('transactions')
                .update({
                    status: 'completed',
                    metadata: {
                        ...tx.metadata,
                        nowpayments_webhook_payload: payload,
                        nowpayments_payment_id: paymentId,
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
                // Rollback transaction status to pending in case wallet increment fails
                await supabase.from('transactions').update({ status: 'pending' }).eq('id', tx.id);
                throw walletUpdateError;
            }

            console.log(`[NOWPayments Webhook] Balance topped up successfully! User UUID: ${tx.user_id}, New Balance: €${newBalance}`);

            // Log final successful event
            await supabase.from('payment_gateway_logs').insert({
                provider: 'nowpayments',
                event_type: 'webhook_verified',
                order_id: orderId,
                payment_ref: paymentId,
                status: 'success',
                request_payload: payload,
                status_code: 200
            });

            return NextResponse.json({ success: true, message: 'Balance updated successfully' });

        } else if (status === 'failed' || status === 'expired') {
            console.log(`[NOWPayments Webhook] Crypto deposit failed/expired for transaction ${tx.id}.`);
            
            await supabase
                .from('transactions')
                .update({
                    status: 'failed',
                    description: `Gateway reported payment ${status}.`,
                    metadata: { ...tx.metadata, nowpayments_webhook_payload: payload }
                })
                .eq('id', tx.id);

            await supabase.from('payment_gateway_logs').insert({
                provider: 'nowpayments',
                event_type: 'webhook_verified',
                order_id: orderId,
                payment_ref: paymentId,
                status: 'failed',
                request_payload: payload,
                status_code: 200
            });

            return NextResponse.json({ success: true, message: `Transaction marked failed (${status})` });
        }

        // Catch pending or unresolved states (e.g. confirming, sending)
        await supabase.from('payment_gateway_logs').insert({
            provider: 'nowpayments',
            event_type: 'webhook_verified',
            order_id: orderId,
            payment_ref: paymentId,
            status: status || 'pending',
            request_payload: payload,
            status_code: 200
        });

        return NextResponse.json({ success: true, message: 'Received status: ' + status });

    } catch (err: any) {
        console.error('[NOWPayments Webhook] Fatal Error processing callback:', err);
        return NextResponse.json({ error: 'Webhook processing failed: ' + err.message }, { status: 500 });
    }
}
