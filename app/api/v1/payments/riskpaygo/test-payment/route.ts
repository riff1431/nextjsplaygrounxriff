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

        // 2. Verify Admin Role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Retrieve saved RiskPayGo credentials from DB
        const { data: settings, error: settingsError } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('provider', 'riskpaygo')
            .single();

        if (settingsError || !settings || !settings.is_enabled) {
            return NextResponse.json({ error: 'RiskPayGo is not configured or is disabled.' }, { status: 400 });
        }

        const config = settings.config || {};
        const secretConfig = settings.secret_config || {};

        const apiUrl = config.api_url;
        const merchantId = secretConfig.merchant_id;
        const apiToken = secretConfig.api_token;
        const returnUrl = config.return_url || `${req.headers.get('origin')}/account/wallet?status=success&method=riskpaygo`;
        const cancelUrl = config.cancel_url || `${req.headers.get('origin')}/account/wallet?status=cancelled&method=riskpaygo`;

        if (!apiUrl || !merchantId || !apiToken) {
            return NextResponse.json({ error: 'Gateway secrets are missing from the configuration database.' }, { status: 400 });
        }

        // 4. Locate or Create Wallet
        const { data: wallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', user.id)
            .single();

        if (!wallet) {
            return NextResponse.json({ error: 'No wallet associated with this administrative account.' }, { status: 404 });
        }

        // 5. Generate unique transaction references
        const orderIdVal = Date.now();
        const merchantOrderId = `RPG-TEST-${orderIdVal.toString().slice(-6)}`;
        const orderKey = `key_test_${orderIdVal}`;

        // 6. Create local pending transaction
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .insert({
                wallet_id: wallet.id,
                user_id: user.id,
                amount: 1.00,
                currency: 'EUR',
                type: 'deposit',
                status: 'pending',
                reference_id: merchantOrderId,
                payment_method: 'riskpaygo',
                metadata: {
                    test_payment: true,
                    order_key: orderKey,
                    site_url: req.headers.get('origin')
                }
            })
            .select()
            .single();

        if (txError) throw txError;

        // 7. Fire RiskPayGo API request
        const endpointUrl = `${apiUrl.replace(/\/$/, "")}/payments/create`;
        const payload = {
            merchant_order_id: merchantOrderId,
            order_id: orderIdVal % 1000000,
            order_key: orderKey,
            amount: "1.00",
            currency: "EUR",
            customer: {
                email: user.email || 'admin@playgroundx.com',
                first_name: 'Admin',
                last_name: 'Test',
                country: 'US'
            },
            site: {
                url: req.headers.get('origin') + '/',
                name: 'PlaygroundX Admin Sandbox',
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

        // 8. Log inside payment_gateway_logs using service role client
        const adminSupabase = createAdminClient();
        try {
            await adminSupabase.from('payment_gateway_logs').insert({
                provider: 'riskpaygo',
                event_type: 'test_payment',
                order_id: merchantOrderId,
                status: response.ok && responseData.success ? 'success' : 'failed',
                request_payload: payload,
                response_payload: responseData,
                status_code: status
            });
        } catch (dbErr) {
            console.warn('[RiskPayGo Test Payment] Failed to write in DB logs:', dbErr);
        }

        if (response.ok && responseData.success && responseData.data?.checkout_url) {
            // Update transaction with the retrieved gateway payment reference
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

        // Mark local transaction as failed if gateway rejected
        await supabase
            .from('transactions')
            .update({ status: 'failed', description: `Gateway Rejected: ${responseData.error || 'Connection error'}` })
            .eq('id', tx.id);

        return NextResponse.json({
            success: false,
            error: responseData.error || responseData.message || 'Gateway rejected test payment creation.',
            details: responseData
        }, { status: 400 });

    } catch (err: any) {
        console.error("[RiskPayGo Test Payment] Fatal:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
