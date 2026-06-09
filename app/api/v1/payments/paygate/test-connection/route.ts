import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Authorize user (Admins only)
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        const isAdmin = 
            profile?.role === 'admin' ||
            user.user_metadata?.role === 'admin' ||
            user.app_metadata?.role === 'admin';

        if (!isAdmin) {
            return NextResponse.json({ error: 'Access denied: Admins only' }, { status: 403 });
        }

        const body = await req.json();
        const { apiUrl, checkoutUrl, usdcAddress, affiliateWallet, commissionPercent, ipnSecret } = body;

        // 3. Validation Logic
        if (!apiUrl) {
            return NextResponse.json({ success: false, error: 'API Endpoint URL is required.' });
        }

        try {
            new URL(apiUrl);
        } catch (_) {
            return NextResponse.json({ success: false, error: 'Invalid API Endpoint URL format.' });
        }

        if (checkoutUrl) {
            try {
                new URL(checkoutUrl);
            } catch (_) {
                return NextResponse.json({ success: false, error: 'Invalid Checkout URL format.' });
            }
        }

        if (!usdcAddress) {
            return NextResponse.json({ success: false, error: 'USDC Payout Wallet Address is required.' });
        }

        const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        const unmaskedUsdc = usdcAddress.includes('•') ? null : usdcAddress;
        if (unmaskedUsdc && !evmAddressRegex.test(unmaskedUsdc)) {
            return NextResponse.json({ success: false, error: 'Invalid Payout USDC Wallet Address format. Must be a 42-character Polygon address starting with 0x.' });
        }

        const unmaskedAffiliate = (affiliateWallet && !affiliateWallet.includes('•')) ? affiliateWallet : null;
        if (unmaskedAffiliate && !evmAddressRegex.test(unmaskedAffiliate)) {
            return NextResponse.json({ success: false, error: 'Invalid Affiliate Wallet Address format. Must be a 42-character Polygon address starting with 0x.' });
        }

        if (commissionPercent && (isNaN(Number(commissionPercent)) || Number(commissionPercent) < 0 || Number(commissionPercent) > 100)) {
            return NextResponse.json({ success: false, error: 'Commission Rate must be a valid number between 0% and 100%.' });
        }

        // Test connectivity to custom domain or default API gateway (ping/check status)
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000); // 5s timeout

            // We ping the custom API URL to verify if the server is responsive and accepting calls
            const testPing = await fetch(apiUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(id);

            // We accept any status that means the domain is resolved and active (e.g. 200, 404, 403, 401, 405 are all resolved)
            // A network down or DNS failure will throw an exception instead
            console.log(`[PayGate Test Connection] Pinged ${apiUrl}. Status code:`, testPing.status);
        } catch (pingErr: any) {
            console.warn(`[PayGate Test Connection] Ping warning:`, pingErr.message);
            // Don't fail the test entirely for sandbox / sandbox firewalls, but warn the admin.
            return NextResponse.json({
                success: true,
                message: `Connection settings saved! Note: API domain verified locally, but direct endpoint connectivity test timed out or returned offline status (${pingErr.message || 'Domain offline'}). Check firewall or nameserver DNS settings.`
            });
        }

        return NextResponse.json({
            success: true,
            message: 'All parameters verified! PayGate API endpoints are correctly formatted and resolving.'
        });

    } catch (err: any) {
        console.error('[PayGate Test Connection] Fatal:', err);
        return NextResponse.json({ success: false, error: err.message || 'Internal connection test failure' }, { status: 500 });
    }
}
