import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

export async function POST(req: NextRequest) {
    try {
        // 1. Verify caller is authenticated
        const supabase = await createClient();
        const { data: { user: caller } } = await supabase.auth.getUser();
        if (!caller) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify caller is admin
        const adminClient = createAdminClient();
        const { data: callerProfile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', caller.id)
            .maybeSingle();

        const isAdmin = 
            callerProfile?.role === 'admin' ||
            caller.user_metadata?.role === 'admin' ||
            caller.app_metadata?.role === 'admin';

        if (!isAdmin) {
            return NextResponse.json({ error: 'Access denied: Admins only' }, { status: 403 });
        }

        const body = await req.json();
        let { appId, appCertificate, customerId, customerSecret } = body;

        // Load existing settings to resolve masked values
        const { data: existingSettings } = await adminClient
            .from('admin_settings')
            .select('value')
            .eq('key', 'agora_config')
            .maybeSingle();

        const config = existingSettings?.value || {};

        if (!appId || appId.includes('•')) appId = config.appId || '';
        if (!appCertificate || appCertificate.includes('•')) appCertificate = config.appCertificate || '';
        if (!customerId || customerId.includes('•')) customerId = config.customerId || '';
        if (!customerSecret || customerSecret.includes('•')) customerSecret = config.customerSecret || '';

        if (!appId) {
            return NextResponse.json({ success: false, error: 'App ID is required' });
        }

        // Test 1: RTC Token Generation
        let token = null;
        let tokenSuccess = false;
        let tokenError = null;

        if (appCertificate) {
            try {
                const channelName = 'connection-test-channel';
                const tempUid = 999999;
                const expirationTimeInSeconds = 3600;
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

                token = RtcTokenBuilder.buildTokenWithUid(
                    appId,
                    appCertificate,
                    channelName,
                    tempUid,
                    RtcRole.PUBLISHER,
                    privilegeExpiredTs,
                    privilegeExpiredTs
                );
                tokenSuccess = true;
            } catch (err: any) {
                tokenError = err.message || 'Failed to generate token';
            }
        } else {
            // App ID only mode
            tokenSuccess = true;
            tokenError = 'App Certificate is empty. Running in App ID-only (unsecured token) mode.';
        }

        // Test 2: Customer ID / Secret developer authentication
        let apiSuccess = false;
        let apiMessage = 'Not Tested (Customer ID or Secret is empty)';

        if (customerId && customerSecret) {
            try {
                const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString('base64');
                const res = await fetch('https://api.agora.io/v1/projects', {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (res.ok) {
                    apiSuccess = true;
                    apiMessage = 'Successfully authenticated with Agora projects API.';
                } else {
                    const errorText = await res.text();
                    apiMessage = `Failed Agora project API authentication (Status: ${res.status}): ${errorText}`;
                }
            } catch (err: any) {
                apiMessage = `Agora API connection error: ${err.message || err}`;
            }
        }

        return NextResponse.json({
            success: tokenSuccess && (!customerId || apiSuccess),
            token,
            appId,
            tokenGenerated: tokenSuccess,
            tokenError,
            apiVerified: apiSuccess,
            apiStatus: apiMessage
        });

    } catch (err: any) {
        console.error('[Agora Test Connection API] Error:', err);
        return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
    }
}
