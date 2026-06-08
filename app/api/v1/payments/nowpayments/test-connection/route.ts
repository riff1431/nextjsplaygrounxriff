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
        let { apiKey, mode } = body;

        // Resolve real secrets from DB if UI transmits masked placeholders (bullets)
        if (!apiKey || apiKey.includes('•')) {
            const adminSupabase = createAdminClient();
            const { data: existingSettings } = await adminSupabase
                .from('payment_settings')
                .select('secret_config')
                .eq('provider', 'nowpayments')
                .maybeSingle();

            const secrets = existingSettings?.secret_config || {};
            if (!apiKey || apiKey.includes('•')) {
                apiKey = secrets.api_key || "";
            }
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing required configuration parameters (API Key)' }, { status: 400 });
        }

        // 3. Construct endpoint based on mode
        const isSandbox = mode === 'sandbox';
        const endpointUrl = isSandbox 
            ? 'https://api-sandbox.nowpayments.io/v1/currencies' 
            : 'https://api.nowpayments.io/v1/currencies';

        console.log(`[NOWPayments Connection Test] Sending request to: ${endpointUrl}`);

        const response = await fetch(endpointUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'x-api-key': apiKey
            },
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

        // 4. Save audit/log entry using service role client
        const adminSupabase = createAdminClient();
        try {
            await adminSupabase.from('payment_gateway_logs').insert({
                provider: 'nowpayments',
                event_type: 'test_connection',
                status: response.ok && responseData.currencies ? 'success' : 'failed',
                request_payload: { url: endpointUrl, mode },
                response_payload: responseData,
                status_code: status
            });
        } catch (dbErr) {
            console.warn('[NOWPayments Connection Test] Failed to log in DB:', dbErr);
        }

        // 5. Evaluate response
        if (response.ok && responseData.currencies) {
            return NextResponse.json({
                success: true,
                message: `Connection verified successfully! API key is valid. (${mode.toUpperCase()} mode)`
            });
        }

        const errMsg = responseData.message || responseData.error || 'Unknown Gateway Error';
        return NextResponse.json({
            success: false,
            error: `API returned error: ${errMsg} (Status code: ${status})`,
            details: responseData
        });

    } catch (err: any) {
        console.error("[NOWPayments Connection Test] Fatal:", err);
        return NextResponse.json({
            success: false,
            error: `Network failure: Unable to reach NOWPayments status endpoint. (${err.message})`
        }, { status: 500 });
    }
}
