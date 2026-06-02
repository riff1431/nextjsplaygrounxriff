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

        const body = await req.json();
        let { apiUrl, merchantId, apiToken, webhookSecret, mode } = body;

        // Resolve real secrets from DB if UI transmits masked placeholders (bullets)
        if (!apiToken || apiToken.includes('•') || !webhookSecret || webhookSecret.includes('•') || !merchantId) {
            const adminSupabase = createAdminClient();
            const { data: existingRiskSettings } = await adminSupabase
                .from('payment_settings')
                .select('secret_config')
                .eq('provider', 'riskpaygo')
                .maybeSingle();

            const secrets = existingRiskSettings?.secret_config || {};
            if (!apiToken || apiToken.includes('•')) {
                apiToken = secrets.api_token || "";
            }
            if (!webhookSecret || webhookSecret.includes('•')) {
                webhookSecret = secrets.webhook_secret || "";
            }
            if (!merchantId) {
                merchantId = secrets.merchant_id || "";
            }
        }

        if (!apiUrl || !merchantId || !apiToken) {
            return NextResponse.json({ error: 'Missing required configuration parameters' }, { status: 400 });
        }

        // Clean base URL and make sure endpoint matches
        const cleanedUrl = apiUrl.replace(/\/$/, ""); // Remove trailing slash
        const endpointUrl = `${cleanedUrl}/payments/create`;

        // 3. Construct a Test Order
        const testOrderId = `CONN-${Date.now().toString().slice(-6)}`;
        const testPayload = {
            merchant_order_id: testOrderId,
            order_id: parseInt(testOrderId.split('-')[1]) || 9999,
            order_key: `key_${testOrderId}`,
            amount: "0.01",
            currency: "EUR",
            customer_details: {
                first_name: "Test",
                last_name: "Admin",
                country_of_residence: "US",
                state_of_residence: "FL",
                post_code: "33101",
                phone: "+13465550123",
                date_of_birth: "1990-05-20"
            },
            site: {
                url: "http://localhost:3000/",
                name: "PlaygroundX Connection Test",
                platform: "custom",
                plugin: "integracion-propia"
            },
            notify_url: "http://localhost:3000/api/v1/payments/riskpaygo/webhook",
            return_url: "http://localhost:3000/account/wallet?status=success",
            cancel_url: "http://localhost:3000/account/wallet?status=cancelled"
        };

        console.log(`[RiskPayGo Connection Test] Sending request to: ${endpointUrl}`);

        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
                'X-RPG-Merchant': merchantId
            },
            body: JSON.stringify(testPayload),
            cache: 'no-store'
        });

        const status = response.status;
        let responseData: any = {};
        
        try {
            responseData = await response.json();
        } catch (e) {
            const rawText = await response.text();
            responseData = { rawResponse: rawText };
        }

        // 4. Save audit/log entry using service role client (bypass client constraints if table exists)
        const adminSupabase = createAdminClient();
        try {
            await adminSupabase.from('payment_gateway_logs').insert({
                provider: 'riskpaygo',
                event_type: 'test_connection',
                order_id: testOrderId,
                status: response.ok ? 'success' : 'failed',
                request_payload: { url: endpointUrl, ...testPayload },
                response_payload: responseData,
                status_code: status
            });
        } catch (dbErr) {
            console.warn('[RiskPayGo Connection Test] Failed to log in DB (table might not exist yet):', dbErr);
        }

        // 5. Evaluate response
        if (response.ok && responseData.success) {
            return NextResponse.json({
                success: true,
                message: 'Connection verified successfully! Formed dummy order checkouts.',
                data: responseData.data
            });
        }

        // Check for specific error scenarios
        const errMsg = responseData.error || responseData.message || 'Unknown Gateway Error';
        
        if (status === 401 || status === 403 || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('credentials')) {
            return NextResponse.json({
                success: false,
                error: 'Invalid API Token or Merchant ID. Please double check credentials.',
                status,
                details: errMsg
            });
        }

        if (errMsg.toLowerCase().includes('domain') || errMsg.toLowerCase().includes('site')) {
            return NextResponse.json({
                success: true, // Credentials work, but warning is needed
                warning: true,
                error: 'Credentials are valid! However, this domain (site.url) is not yet registered/approved in your RiskPayGo account.',
                status,
                details: errMsg
            });
        }

        return NextResponse.json({
            success: false,
            error: errMsg,
            status,
            details: responseData
        });

    } catch (err: any) {
        console.error("[RiskPayGo Connection Test] Fatal:", err);
        return NextResponse.json({
            success: false,
            error: `Network failure: Unable to reach gateway. Check API URL. (${err.message})`
        }, { status: 500 });
    }
}
