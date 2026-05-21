import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
    const supabase = createAdminClient();
    const rawBody = await req.text();
    const signature = req.headers.get('x-rpg-signature');

    let payload: any = {};
    let orderKey = '';
    let status = '';
    let paymentRef = '';
    let transactionId = '';

    try {
        // 1. Parse JSON from raw body
        payload = JSON.parse(rawBody);
        orderKey = payload.order_key || '';
        status = payload.status || '';
        paymentRef = payload.payment_ref || '';
        transactionId = payload.transaction_id || '';
    } catch (parseErr) {
        console.error('[RiskPayGo Webhook] Failed to parse payload:', parseErr);
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    try {
        // 2. Fetch RiskPayGo secret configs from database (requires service role)
        const { data: settings, error: settingsError } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('provider', 'riskpaygo')
            .single();

        if (settingsError || !settings) {
            console.error('[RiskPayGo Webhook] settings not found in database:', settingsError);
            return NextResponse.json({ error: 'Gateway settings missing' }, { status: 500 });
        }

        const secretConfig = settings.secret_config || {};
        const webhookSecret = secretConfig.webhook_secret;

        if (!webhookSecret) {
            console.error('[RiskPayGo Webhook] Webhook secret is not configured.');
            return NextResponse.json({ error: 'Webhook secret unconfigured' }, { status: 500 });
        }

        // 3. Verify HMAC Signature (MANDATORY)
        if (!signature) {
            console.warn('[RiskPayGo Webhook] Rejected: Missing X-RPG-Signature header.');
            // Log failure in gateway logs
            await supabase.from('payment_gateway_logs').insert({
                provider: 'riskpaygo',
                event_type: 'webhook_signature_failed',
                order_id: orderKey,
                payment_ref: paymentRef,
                status: 'failed',
                request_payload: { headers: { 'x-rpg-signature': null }, body: payload },
                status_code: 401
            });
            return NextResponse.json({ error: 'Signature header required' }, { status: 401 });
        }

        const computedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('base64');

        // Constant-time signature comparison to prevent timing attacks
        const sigBuffer = Buffer.from(signature, 'utf8');
        const compBuffer = Buffer.from(computedSignature, 'utf8');
        let isValid = false;
        
        if (sigBuffer.length === compBuffer.length) {
            isValid = crypto.timingSafeEqual(sigBuffer, compBuffer);
        }

        if (!isValid) {
            console.error(`[RiskPayGo Webhook] Signature verification failed. Received: ${signature}, Computed: ${computedSignature}`);
            
            await supabase.from('payment_gateway_logs').insert({
                provider: 'riskpaygo',
                event_type: 'webhook_signature_failed',
                order_id: orderKey,
                payment_ref: paymentRef,
                status: 'failed',
                request_payload: { headers: { 'x-rpg-signature': signature }, body: payload },
                status_code: 401
            });
            return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
        }

        console.log(`[RiskPayGo Webhook] Verified signature successfully! Order Key: ${orderKey}, Status: ${status}`);

        // 4. Load the pending transaction from local DB matching order_key
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('metadata->>order_key', orderKey)
            .single();

        if (txError || !tx) {
            console.warn(`[RiskPayGo Webhook] Transaction not found matching order_key: ${orderKey}. Trying by reference_id...`);
            
            // Secondary attempt using reference_id
            const { data: tx2 } = await supabase
                .from('transactions')
                .select('*')
                .eq('reference_id', orderKey)
                .single();
                
            if (!tx2) {
                console.error(`[RiskPayGo Webhook] No local transaction found matching order_key: ${orderKey}`);
                await supabase.from('payment_gateway_logs').insert({
                    provider: 'riskpaygo',
                    event_type: 'webhook_unmatched_tx',
                    order_id: orderKey,
                    payment_ref: paymentRef,
                    status: 'ignored',
                    request_payload: payload,
                    status_code: 404
                });
                return NextResponse.json({ error: 'Transaction matching order_key not found' }, { status: 404 });
            }
            
            // Re-assign tx
            // We'll proceed with tx2
        }

        const activeTx = tx || (await supabase.from('transactions').select('*').eq('reference_id', orderKey).single()).data;
        if (!activeTx) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        // 5. Duplicate Webhook Prevention (Idempotency Guard)
        if (activeTx.status === 'completed' || activeTx.status === 'failed' || activeTx.status === 'cancelled') {
            console.log(`[RiskPayGo Webhook] Order ${orderKey} already processed (Status: ${activeTx.status}). Responding HTTP 200.`);
            await supabase.from('payment_gateway_logs').insert({
                provider: 'riskpaygo',
                event_type: 'webhook_duplicate_ignored',
                order_id: orderKey,
                payment_ref: paymentRef,
                status: 'success',
                request_payload: payload,
                status_code: 200
            });
            return NextResponse.json({ success: true, message: 'Already processed' });
        }

        // 6. Process Payment Outcomes
        if (status === 'paid') {
            console.log(`[RiskPayGo Webhook] Top-up approved for transaction ${activeTx.id}. Amount: €${activeTx.amount}`);

            // Fetch the user's wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('id', activeTx.wallet_id)
                .single();

            if (walletError || !wallet) {
                console.error('[RiskPayGo Webhook] Wallet matching transaction was not found.');
                return NextResponse.json({ error: 'Associated wallet missing' }, { status: 500 });
            }

            // Perform balance increment and complete transaction status atomically
            const newBalance = parseFloat(wallet.balance) + parseFloat(activeTx.amount);

            // Update Transaction
            const { error: txUpdateError } = await supabase
                .from('transactions')
                .update({
                    status: 'completed',
                    metadata: {
                        ...activeTx.metadata,
                        riskpaygo_webhook_payload: payload,
                        riskpaygo_transaction_id: transactionId,
                        processed_at: new Date().toISOString()
                    }
                })
                .eq('id', activeTx.id);

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
                await supabase.from('transactions').update({ status: 'pending' }).eq('id', activeTx.id);
                throw walletUpdateError;
            }

            console.log(`[RiskPayGo Webhook] Balance topped up successfully! User UUID: ${activeTx.user_id}, New Balance: €${newBalance}`);

            // Log final successful event
            await supabase.from('payment_gateway_logs').insert({
                provider: 'riskpaygo',
                event_type: 'webhook_verified',
                order_id: orderKey,
                payment_ref: paymentRef,
                status: 'paid',
                request_payload: payload,
                status_code: 200
            });

            return NextResponse.json({ success: true, message: 'Balance updated successfully' });

        } else if (status === 'failed') {
            console.log(`[RiskPayGo Webhook] Top-up failed for transaction ${activeTx.id}.`);
            
            await supabase
                .from('transactions')
                .update({
                    status: 'failed',
                    description: 'Gateway reported payment failed.',
                    metadata: { ...activeTx.metadata, riskpaygo_webhook_payload: payload }
                })
                .eq('id', activeTx.id);

            await supabase.from('payment_gateway_logs').insert({
                provider: 'riskpaygo',
                event_type: 'webhook_verified',
                order_id: orderKey,
                payment_ref: paymentRef,
                status: 'failed',
                request_payload: payload,
                status_code: 200
            });

            return NextResponse.json({ success: true, message: 'Transaction marked failed' });

        } else if (status === 'cancelled') {
            console.log(`[RiskPayGo Webhook] Top-up cancelled for transaction ${activeTx.id}.`);

            await supabase
                .from('transactions')
                .update({
                    status: 'failed', // cancelled maps to failed/cancelled state in main ledger
                    description: 'Gateway reported payment cancelled.',
                    metadata: { ...activeTx.metadata, riskpaygo_webhook_payload: payload }
                })
                .eq('id', activeTx.id);

            await supabase.from('payment_gateway_logs').insert({
                provider: 'riskpaygo',
                event_type: 'webhook_verified',
                order_id: orderKey,
                payment_ref: paymentRef,
                status: 'cancelled',
                request_payload: payload,
                status_code: 200
            });

            return NextResponse.json({ success: true, message: 'Transaction marked cancelled' });
        }

        // Catch pending or unresolved states
        await supabase.from('payment_gateway_logs').insert({
            provider: 'riskpaygo',
            event_type: 'webhook_verified',
            order_id: orderKey,
            payment_ref: paymentRef,
            status: status || 'pending',
            request_payload: payload,
            status_code: 200
        });

        return NextResponse.json({ success: true, message: 'Received status: ' + status });

    } catch (err: any) {
        console.error('[RiskPayGo Webhook] Fatal Error processing callback:', err);
        return NextResponse.json({ error: 'Webhook processing failed: ' + err.message }, { status: 500 });
    }
}
