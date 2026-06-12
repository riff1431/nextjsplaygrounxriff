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
        let { apiKey, apiUrl, currency } = body;

        // Resolve real secrets from DB if UI transmits masked placeholders (bullets)
        if (!apiKey || apiKey.includes('•') || !apiUrl) {
            const adminSupabase = createAdminClient();
            const { data: existingSettings } = await adminSupabase
                .from('payment_settings')
                .select('*')
                .eq('provider', 'payram')
                .maybeSingle();

            const config = existingSettings?.config || {};
            const secrets = existingSettings?.secret_config || {};
            
            if (!apiKey || apiKey.includes('•')) {
                apiKey = secrets.api_key || "";
            }
            if (!apiUrl) {
                apiUrl = config.api_url || "";
            }
            if (!currency) {
                currency = config.currency || "USDT";
            }
        }

        if (!apiKey || !apiUrl) {
            return NextResponse.json({ error: 'Missing required configuration parameters (API Key & API Base URL)' }, { status: 400 });
        }

        const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const endpointUrl = `${cleanApiUrl}/api/v1/payment`;

        console.log(`[PayRam Connection Test] Sending test request to: ${cleanApiUrl}`);

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
                body: JSON.stringify({
                    amount: "0.01",
                    currency: currency || "USDT",
                    merchantUserId: "test-connection"
                }),
                cache: 'no-store'
            });
            status = response.status;
            responseData = await response.json();
        } catch (fetchErr: any) {
            // Fallback: try simple /healthz check
            try {
                const healthUrl = `${cleanApiUrl}/healthz`;
                const healthResponse = await fetch(healthUrl, { cache: 'no-store' });
                if (healthResponse.ok) {
                    return NextResponse.json({
                        success: false,
                        error: `PayRam Node is running (/healthz OK), but the API key was invalid or rejected. (Network test error: ${fetchErr.message})`
                    });
                }
            } catch (_) {}

            return NextResponse.json({
                success: false,
                error: `Network failure: Unable to reach PayRam server. Verify URL and server accessibility. (${fetchErr.message})`
            });
        }

        // 4. Save audit/log entry using service role client
        const adminSupabase = createAdminClient();
        try {
            await adminSupabase.from('payment_gateway_logs').insert({
                provider: 'payram',
                event_type: 'test_connection',
                status: (response.ok || status === 400) ? 'success' : 'failed',
                request_payload: { url: endpointUrl, currency },
                response_payload: responseData,
                status_code: status
            });
        } catch (dbErr) {
            console.warn('[PayRam Connection Test] Failed to log in DB:', dbErr);
        }

        // 5. Evaluate response
        if (response.ok || status === 400) {
            return NextResponse.json({
                success: true,
                message: `Connection verified successfully! PayRam Node is online and API key is valid.`
            });
        }

        if (status === 401) {
            return NextResponse.json({
                success: false,
                error: `Authentication failed: Invalid API Key. (Status: 401)`
            });
        }

        const errMsg = responseData.message || responseData.error || 'Unknown Node Error';
        return NextResponse.json({
            success: false,
            error: `Node returned error: ${errMsg} (Status code: ${status})`,
            details: responseData
        });

    } catch (err: any) {
        console.error("[PayRam Connection Test] Fatal:", err);
        return NextResponse.json({
            success: false,
            error: `Network failure: Unable to reach PayRam status endpoint. (${err.message})`
        }, { status: 500 });
    }
}
