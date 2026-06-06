import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET() {
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

        // 3. Load configurations from DB
        const { data: adminSettings } = await adminClient
            .from('admin_settings')
            .select('value')
            .eq('key', 'agora_config')
            .maybeSingle();

        const config = adminSettings?.value || {};

        // Mask sensitive items
        const responseData = {
            appId: config.appId || '',
            appCertificate: config.appCertificate ? '••••••••••••••••••••••••••••••••' : '',
            customerId: config.customerId || '',
            customerSecret: config.customerSecret ? '••••••••••••••••••••••••••••••••' : '',
        };

        return NextResponse.json({ config: responseData });
    } catch (err: any) {
        console.error('[Admin Agora Settings GET API] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
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

        // 3. Load existing configurations from DB to handle secret merge
        const { data: existingSettings } = await adminClient
            .from('admin_settings')
            .select('value')
            .eq('key', 'agora_config')
            .maybeSingle();

        const oldConfig = existingSettings?.value || {};

        // Merge incoming payload with old config to preserve masked/empty secrets
        const finalAppId = body.appId || oldConfig.appId || "";
        const finalAppCertificate = (body.appCertificate && !body.appCertificate.includes('•'))
            ? body.appCertificate
            : oldConfig.appCertificate || "";

        const finalCustomerId = body.customerId || oldConfig.customerId || "";
        const finalCustomerSecret = (body.customerSecret && !body.customerSecret.includes('•'))
            ? body.customerSecret
            : oldConfig.customerSecret || "";

        const mergedConfig = {
            appId: finalAppId,
            appCertificate: finalAppCertificate,
            customerId: finalCustomerId,
            customerSecret: finalCustomerSecret,
        };

        // 4. Update admin_settings table (key: 'agora_config')
        const { error: adminSettingsError } = await adminClient
            .from('admin_settings')
            .upsert({
                key: 'agora_config',
                value: mergedConfig,
                updated_at: new Date().toISOString()
            });

        if (adminSettingsError) {
            console.error('[Admin Agora Settings API] admin_settings upsert error:', adminSettingsError);
            return NextResponse.json({ error: 'Failed to update settings: ' + adminSettingsError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Admin Agora Settings POST API] Fatal error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
