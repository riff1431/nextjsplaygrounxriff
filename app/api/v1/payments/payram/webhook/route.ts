import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = createAdminClient();
    const rawBody = await req.text();

    const signature = 
        req.headers.get('api-key') || 
        req.headers.get('x-api-key') || 
        req.headers.get('API-Key');

    let payload: any = {};
    let referenceId = '';
    let status = '';

    try {
        payload = JSON.parse(rawBody);
        referenceId = payload.reference_id || payload.referenceId || '';
        status = payload.status || '';
    } catch (parseErr) {
        console.error('[PayRam Webhook] Failed to parse payload:', parseErr);
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    try {
        // 2. Fetch PayRam settings from database (admin client)
        const { data: settings, error: settingsError } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('provider', 'payram')
            .single();

        if (settingsError || !settings) {
            console.error('[PayRam Webhook] Settings not found in database:', settingsError);
            return NextResponse.json({ error: 'Gateway settings missing' }, { status: 500 });
        }

        const secretConfig = settings.secret_config || {};
        const apiKey = secretConfig.api_key;

        if (!apiKey) {
            console.warn('[PayRam Webhook] Webhook signature key (apiKey) is not configured.');
            return NextResponse.json({ error: 'Gateway api_key missing' }, { status: 500 });
        }

        // 3. Verify Signature/API-Key header
        if (signature !== apiKey) {
            console.error('[PayRam Webhook] API Key mismatch.');
            await supabase.from('payment_gateway_logs').insert({
                provider: 'payram',
                event_type: 'webhook_signature_failed',
                order_id: referenceId,
                payment_ref: referenceId,
                status: 'failed',
                request_payload: { headers: { 'api-key': signature ? 'present' : 'missing' }, body: payload },
                status_code: 401
            });
            return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
        }

        console.log(`[PayRam Webhook] Verified signature successfully! Reference ID: ${referenceId}, Status: ${status}`);

        // 4. Load the transaction from Supabase matching metadata payram_reference_id
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('metadata->>payram_reference_id', referenceId)
            .maybeSingle();

        if (txError) {
            console.error(`[PayRam Webhook] DB Error looking up transaction:`, txError);
            return NextResponse.json({ error: 'Database transaction lookup error' }, { status: 500 });
        }

        if (!tx) {
            console.error(`[PayRam Webhook] No local transaction found matching reference ID: ${referenceId}`);
            await supabase.from('payment_gateway_logs').insert({
                provider: 'payram',
                event_type: 'webhook_unmatched_tx',
                order_id: referenceId,
                payment_ref: referenceId,
                status: 'ignored',
                request_payload: payload,
                status_code: 404
            });
            return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
        }

        // 5. Idempotency Guard: prevent duplicate webhook logic
        if (tx.status === 'completed' || tx.status === 'failed') {
            console.log(`[PayRam Webhook] Transaction ${tx.id} already processed (Status: ${tx.status}). Ignoring duplicate.`);
            await supabase.from('payment_gateway_logs').insert({
                provider: 'payram',
                event_type: 'webhook_duplicate_ignored',
                order_id: tx.reference_id,
                payment_ref: referenceId,
                status: 'success',
                request_payload: payload,
                status_code: 200
            });
            return NextResponse.json({ received: true });
        }

        // 6. Handle webhook statuses
        const isPaid = status === 'FILLED';
        const isFailed = status === 'FAILED';

        if (isPaid) {
            console.log(`[PayRam Webhook] Top-up approved for transaction ${tx.id}. Amount: €${tx.amount}`);

            // Fetch the user's wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('id', tx.wallet_id)
                .single();

            if (walletError || !wallet) {
                console.error('[PayRam Webhook] Associated wallet not found.');
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
                        payram_webhook_payload: payload,
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

            console.log(`[PayRam Webhook] Balance updated successfully! Wallet UUID: ${wallet.id}, New Balance: €${newBalance}`);

            // Log success event
            await supabase.from('payment_gateway_logs').insert({
                provider: 'payram',
                event_type: 'webhook_verified',
                order_id: tx.reference_id,
                payment_ref: referenceId,
                status: 'paid',
                request_payload: payload,
                status_code: 200
            });

            return NextResponse.json({ received: true });

        } else if (isFailed) {
            console.log(`[PayRam Webhook] Transaction failed. Status: ${status}`);

            await supabase
                .from('transactions')
                .update({
                    status: 'failed',
                    description: `PayRam reported status: ${status}`,
                    metadata: { ...tx.metadata, payram_webhook_payload: payload }
                })
                .eq('id', tx.id);

            await supabase.from('payment_gateway_logs').insert({
                provider: 'payram',
                event_type: 'webhook_verified',
                order_id: tx.reference_id,
                payment_ref: referenceId,
                status: 'failed',
                request_payload: payload,
                status_code: 200
            });

            return NextResponse.json({ received: true });
        }

        // Return pending response for unhandled codes
        await supabase.from('payment_gateway_logs').insert({
            provider: 'payram',
            event_type: 'webhook_verified',
            order_id: tx.reference_id,
            payment_ref: referenceId,
            status: status || 'pending',
            request_payload: payload,
            status_code: 200
        });

        return NextResponse.json({ received: true });

    } catch (err: any) {
        console.error('[PayRam Webhook] Webhook execution error:', err);
        return NextResponse.json({ error: 'Internal callback processing error: ' + err.message }, { status: 500 });
    }
}
