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
            .eq('provider', 'payram')
            .single();

        if (settingsError || !settings || !settings.is_enabled) {
            return NextResponse.json({ error: 'PayRam payment gateway is currently disabled or unconfigured.' }, { status: 400 });
        }

        const config = settings.config || {};
        const secretConfig = settings.secret_config || {};

        const apiUrl = config.api_url;
        const currency = config.currency || 'USDT';
        const apiKey = secretConfig.api_key;

        if (!apiUrl || !apiKey) {
            return NextResponse.json({ error: 'PayRam configuration is incomplete on server.' }, { status: 500 });
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
        const merchantOrderId = `PAYRAM-TX-${timestamp}-${randSuffix}`;
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
                payment_method: 'payram',
                metadata: {
                    site_url: origin,
                    user_email: user.email,
                    payram_currency: currency
                }
            })
            .select()
            .single();

        if (txError) throw txError;

        // 7. Fire request to PayRam API
        const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const endpointUrl = `${cleanApiUrl}/api/v1/payment`;

        const payload = {
            amount: parsedAmount.toString(),
            currency: currency,
            merchantUserId: user.id,
            customerEmail: user.email,
            customerID: user.id
        };

        console.log('[PayRam Create] Hitting endpoint:', endpointUrl, 'with payload:', payload);

        let response: Response;
        let status = 500;
        let responseData: any = {};

        try {
            response = await fetch(endpointUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'API-Key': apiKey
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
            console.error('[PayRam Create] HTTP Request Error:', fetchErr);
            status = 500;
            responseData = { error: fetchErr.message || 'Network connectivity error' };
            response = { ok: false } as Response;
        }

        // 8. Write logs using service role client
        const adminSupabase = createAdminClient();
        try {
            await adminSupabase.from('payment_gateway_logs').insert({
                provider: 'payram',
                event_type: 'create_payment',
                order_id: merchantOrderId,
                status: response.ok && (responseData.url || responseData.reference_id) ? 'success' : 'failed',
                request_payload: payload,
                response_payload: responseData,
                status_code: status
            });
        } catch (dbErr) {
            console.warn('[PayRam Create] Failed to write in DB logs:', dbErr);
        }

        if (response.ok && (responseData.url || responseData.reference_id)) {
            const payramRef = responseData.reference_id;
            const checkoutUrl = responseData.url;

            // Update transaction metadata with payram reference ID
            await supabase
                .from('transactions')
                .update({
                    metadata: {
                        ...tx.metadata,
                        payram_reference_id: payramRef
                    }
                })
                .eq('id', tx.id);

            return NextResponse.json({
                success: true,
                checkoutUrl: checkoutUrl,
                referenceId: payramRef,
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
        console.error("[PayRam Create] Fatal Error:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
