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
        const { amount, customerDetails } = body;

        // Verify customerDetails presence and structure
        if (!customerDetails) {
            return NextResponse.json({ error: 'Customer billing details are required.' }, { status: 400 });
        }

        const {
            first_name,
            last_name,
            email,
            country_of_residence,
            phone,
            date_of_birth,
            state_of_residence,
            post_code
        } = customerDetails;

        if (!first_name || !last_name || !email || !country_of_residence || !phone || !date_of_birth) {
            return NextResponse.json({ error: 'Missing required customer details.' }, { status: 400 });
        }

        if (country_of_residence === "US" && (!state_of_residence || !post_code)) {
            return NextResponse.json({ error: 'State of residence and postal code are required for US customers.' }, { status: 400 });
        }

        // 2. Validate Amount
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ error: 'Amount must be a positive number greater than zero.' }, { status: 400 });
        }

        // 3. Load Saved Settings from Supabase DB
        const { data: settings, error: settingsError } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('provider', 'riskpaygo')
            .single();

        if (settingsError || !settings || !settings.is_enabled) {
            return NextResponse.json({ error: 'RiskPayGo payment gateway is currently disabled or unconfigured.' }, { status: 400 });
        }

        const config = settings.config || {};
        const secretConfig = settings.secret_config || {};

        const apiUrl = config.api_url;
        const merchantId = secretConfig.merchant_id;
        const apiToken = secretConfig.api_token;
        const returnUrl = config.return_url || `${req.headers.get('origin')}/account/wallet?status=success&method=riskpaygo`;
        const cancelUrl = config.cancel_url || `${req.headers.get('origin')}/account/wallet?status=cancelled&method=riskpaygo`;

        if (!apiUrl || !merchantId || !apiToken) {
            return NextResponse.json({ error: 'Gateway configurations are incomplete.' }, { status: 500 });
        }

        // 4. Fetch User Profile to fill customer data
        const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('id', user.id)
            .single();

        const fullName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Fan';
        const lastName = nameParts.slice(1).join(' ') || 'Member';

        // 5. Locate or Upsert Wallet
        let { data: wallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', user.id)
            .single();

        if (!wallet) {
            // Safe upsert
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

        // 6. Generate order references
        const timestamp = Date.now();
        const randSuffix = Math.floor(1000 + Math.random() * 9000);
        const merchantOrderId = `RPG-TX-${timestamp}-${randSuffix}`;
        const orderKey = `key_${timestamp}_${randSuffix}`;

        // 7. Insert pending transaction in DB
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
                payment_method: 'riskpaygo',
                metadata: {
                    order_key: orderKey,
                    site_url: req.headers.get('origin'),
                    user_email: user.email
                }
            })
            .select()
            .single();

        if (txError) throw txError;

        // 8. Fire request to RiskPayGo API
        const endpointUrl = `${apiUrl.replace(/\/$/, "")}/payments/create`;
        const payload = {
            merchant_order_id: merchantOrderId,
            order_id: timestamp % 1000000,
            order_key: orderKey,
            amount: parsedAmount.toFixed(2),
            currency: "EUR",
            customer_details: {
                first_name,
                last_name,
                email,
                country_of_residence,
                phone,
                date_of_birth,
                ...(country_of_residence === "US" ? {
                    state_of_residence,
                    post_code
                } : {})
            },
            site: {
                url: req.headers.get('origin') + '/',
                name: 'PlaygroundX App',
                platform: 'custom',
                plugin: 'integracion-propia'
            },
            notify_url: `${req.headers.get('origin')}/api/v1/payments/riskpaygo/webhook`,
            return_url: returnUrl,
            cancel_url: cancelUrl
        };

        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
                'X-RPG-Merchant': merchantId
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

        // 9. Write logs using service role client
        const adminSupabase = createAdminClient();
        try {
            await adminSupabase.from('payment_gateway_logs').insert({
                provider: 'riskpaygo',
                event_type: 'create_payment',
                order_id: merchantOrderId,
                status: response.ok && responseData.success ? 'success' : 'failed',
                request_payload: payload,
                response_payload: responseData,
                status_code: status
            });
        } catch (dbErr) {
            console.warn('[RiskPayGo Create] Failed to write in DB logs:', dbErr);
        }

        if (response.ok && responseData.success && responseData.data?.checkout_url) {
            // Update transaction reference and gateway info
            await supabase
                .from('transactions')
                .update({
                    metadata: {
                        ...tx.metadata,
                        riskpaygo_payment_ref: responseData.data.payment_ref
                    }
                })
                .eq('id', tx.id);

            return NextResponse.json({
                success: true,
                checkoutUrl: responseData.data.checkout_url,
                paymentRef: responseData.data.payment_ref,
                merchantOrderId: merchantOrderId
            });
        }

        // Gateway rejected payment, mark local transaction as failed
        await supabase
            .from('transactions')
            .update({ status: 'failed', description: `Gateway Rejected: ${responseData.error || 'Connection error'}` })
            .eq('id', tx.id);

        return NextResponse.json({
            success: false,
            error: responseData.error || responseData.message || 'Payment creation was rejected by the gateway.',
            details: responseData
        }, { status: 400 });

    } catch (err: any) {
        console.error("[RiskPayGo Create] Fatal:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
