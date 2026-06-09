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

        // 3. Load Saved Settings from DB (using payment_settings table)
        const { data: settings, error: settingsError } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('provider', 'paygate')
            .single();

        if (settingsError || !settings || !settings.is_enabled) {
            return NextResponse.json({ error: 'PayGate payment gateway is currently disabled or unconfigured.' }, { status: 400 });
        }

        const config = settings.config || {};
        const secretConfig = settings.secret_config || {};

        const apiUrl = config.api_url || 'https://api.paygate.to';
        const checkoutUrl = config.checkout_url || 'https://checkout.paygate.to';
        const returnUrl = config.return_url;
        const cancelUrl = config.cancel_url;
        const commissionPercent = config.commission_percent || 0;

        const usdcAddress = secretConfig.usdc_address;
        const affiliateWallet = secretConfig.affiliate_wallet;
        const ipnSecret = secretConfig.ipn_secret;

        if (!usdcAddress) {
            return NextResponse.json({ error: 'PayGate configuration is incomplete. Payout wallet address missing.' }, { status: 500 });
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
        const merchantOrderId = `PAYGATE-TX-${timestamp}-${randSuffix}`;
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
                payment_method: 'paygate',
                metadata: {
                    site_url: origin,
                    user_email: user.email,
                    paygate_usdc_wallet: usdcAddress,
                    commission_rate: commissionPercent
                }
            })
            .select()
            .single();

        if (txError) throw txError;

        // 7. Fire request to PayGate API
        // Typically, we call /v1/checkout or /v1/invoice endpoint to generate payment
        const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const endpointUrl = `${cleanApiUrl}/v1/checkout`;

        const payload = {
            amount: parsedAmount,
            currency: "EUR",
            order_id: merchantOrderId,
            description: `Top Up Wallet - €${parsedAmount.toFixed(2)}`,
            wallet: usdcAddress,
            affiliate_wallet: affiliateWallet || undefined,
            commission: commissionPercent || undefined,
            notify_url: `${origin}/api/v1/payments/paygate/webhook`,
            return_url: returnUrl || `${origin}/account/wallet?status=success&method=paygate`,
            cancel_url: cancelUrl || `${origin}/account/wallet?status=cancelled&method=paygate`
        };

        console.log('[PayGate Create] Hitting endpoint:', endpointUrl, 'with payload:', payload);

        let response: Response;
        let status: number;
        let responseData: any = {};

        try {
            response = await fetch(endpointUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                cache: 'no-store'
            });

            status = response.status;

            try {
                responseData = await response.json();
            } catch (e) {
                responseData = { rawResponse: await response.text() };
            }
        } catch (fetchErr: any) {
            console.error('[PayGate Create] HTTP Request Error:', fetchErr);
            status = 500;
            responseData = { error: fetchErr.message || 'Network connectivity error' };
            response = { ok: false } as Response;
        }

        // 8. Write logs using service role client
        const adminSupabase = createAdminClient();
        try {
            await adminSupabase.from('payment_gateway_logs').insert({
                provider: 'paygate',
                event_type: 'create_payment',
                order_id: merchantOrderId,
                status: response.ok && (responseData.checkout_url || responseData.id) ? 'success' : 'failed',
                request_payload: payload,
                response_payload: responseData,
                status_code: status
            });
        } catch (dbErr) {
            console.warn('[PayGate Create] Failed to write in DB logs:', dbErr);
        }

        if (response.ok && (responseData.checkout_url || responseData.id)) {
            // Determine redirection checkout URL
            // If the response returns a direct url, use it. Otherwise, build using the checkoutUrl
            const finalCheckoutUrl = responseData.checkout_url || responseData.url || `${checkoutUrl}/pay/${responseData.id}`;

            // Update transaction metadata with paygate invoice ID/transaction ref
            await supabase
                .from('transactions')
                .update({
                    metadata: {
                        ...tx.metadata,
                        paygate_invoice_id: responseData.id || responseData.invoice_id
                    }
                })
                .eq('id', tx.id);

            return NextResponse.json({
                success: true,
                checkoutUrl: finalCheckoutUrl,
                invoiceId: responseData.id || responseData.invoice_id,
                merchantOrderId: merchantOrderId
            });
        }

        // Gateway rejected payment, mark local transaction as failed
        await supabase
            .from('transactions')
            .update({ 
                status: 'failed', 
                description: `Gateway Rejected: ${responseData.error || responseData.message || 'Connection error'}` 
            })
            .eq('id', tx.id);

        return NextResponse.json({
            success: false,
            error: responseData.error || responseData.message || 'Payment creation was rejected by the gateway.',
            details: responseData
        }, { status: 400 });

    } catch (err: any) {
        console.error("[PayGate Create] Fatal Error:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
