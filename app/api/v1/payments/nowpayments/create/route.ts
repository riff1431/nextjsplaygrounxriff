import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = await createClient();

    try {
        // 1. Verify Authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { amount } = body;

        // 2. Validate Amount
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ error: 'Amount must be a positive number greater than zero.' }, { status: 400 });
        }

        // 3. Load Saved Settings from DB
        const { data: settings, error: settingsError } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('provider', 'nowpayments')
            .single();

        if (settingsError || !settings || !settings.is_enabled) {
            return NextResponse.json({ error: 'NOWPayments crypto gateway is currently disabled or unconfigured.' }, { status: 400 });
        }

        const config = settings.config || {};
        const secretConfig = settings.secret_config || {};

        const apiKey = secretConfig.api_key;
        const mode = config.mode || 'sandbox';

        if (!apiKey) {
            return NextResponse.json({ error: 'Gateway configurations are incomplete.' }, { status: 500 });
        }

        // 4. Locate or Upsert Wallet
        let { data: wallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', user.id)
            .single();

        if (!wallet) {
            const { error: walletCreateErr } = await supabase
                .from('wallets')
                .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id', ignoreDuplicates: true });

            if (walletCreateErr) throw walletCreateErr;

            const { data: newWallet } = await supabase
                .from('wallets')
                .select('id, balance')
                .eq('user_id', user.id)
                .single();
            
            wallet = newWallet;
        }

        if (!wallet) {
            throw new Error("Unable to locate or initialize user wallet.");
        }

        // 5. Generate order references
        const timestamp = Date.now();
        const randSuffix = Math.floor(1000 + Math.random() * 9000);
        const merchantOrderId = `NOW-TX-${timestamp}-${randSuffix}`;
        const origin = req.headers.get('origin') || 'http://localhost:3000';

        // 6. Insert pending transaction in DB
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .insert({
                wallet_id: wallet.id,
                user_id: user.id,
                amount: parsedAmount,
                currency: 'EUR',
                type: 'deposit',
                status: 'pending',
                reference_id: merchantOrderId,
                payment_method: 'nowpayments',
                metadata: {
                    site_url: origin,
                    user_email: user.email
                }
            })
            .select()
            .single();

        if (txError) throw txError;

        // 7. Fire request to NOWPayments API
        const isSandbox = mode === 'sandbox';
        const endpointUrl = isSandbox 
            ? 'https://api-sandbox.nowpayments.io/v1/invoice' 
            : 'https://api.nowpayments.io/v1/invoice';

        const payload = {
            price_amount: parsedAmount,
            price_currency: "EUR",
            order_id: merchantOrderId,
            order_description: `Top Up Wallet - €${parsedAmount.toFixed(2)}`,
            ipn_callback_url: `${origin}/api/v1/payments/nowpayments/webhook`,
            success_url: `${origin}/account/wallet?status=success&method=nowpayments`,
            cancel_url: `${origin}/account/wallet?status=cancelled&method=nowpayments`
        };

        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        const status = response.status;
        let responseData: any = {};

        try {
            responseData = await response.json();
        } catch (e) {
            responseData = { rawResponse: await response.text() };
        }

        // 8. Write logs using service role client
        const adminSupabase = createAdminClient();
        try {
            await adminSupabase.from('payment_gateway_logs').insert({
                provider: 'nowpayments',
                event_type: 'create_payment',
                order_id: merchantOrderId,
                status: response.ok && responseData.invoice_url ? 'success' : 'failed',
                request_payload: payload,
                response_payload: responseData,
                status_code: status
            });
        } catch (dbErr) {
            console.warn('[NOWPayments Create] Failed to write in DB logs:', dbErr);
        }

        if (response.ok && responseData.invoice_url) {
            // Update transaction reference and gateway info
            await supabase
                .from('transactions')
                .update({
                    metadata: {
                        ...tx.metadata,
                        nowpayments_invoice_id: responseData.id
                    }
                })
                .eq('id', tx.id);

            return NextResponse.json({
                success: true,
                checkoutUrl: responseData.invoice_url,
                invoiceId: responseData.id,
                merchantOrderId: merchantOrderId
            });
        }

        // Gateway rejected payment, mark local transaction as failed
        await supabase
            .from('transactions')
            .update({ status: 'failed', description: `Gateway Rejected: ${responseData.message || 'Connection error'}` })
            .eq('id', tx.id);

        return NextResponse.json({
            success: false,
            error: responseData.message || 'Payment creation was rejected by the gateway.',
            details: responseData
        }, { status: 400 });

    } catch (err: any) {
        console.error("[NOWPayments Create] Fatal:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
