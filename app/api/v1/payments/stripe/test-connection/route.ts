import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/v1/payments/stripe/test-connection
 * Tests the Stripe keys provided by the admin panel. 
 * Accepts { secretKey, publicKey } in the body and tries to connect to Stripe.
 */
export async function POST(req: Request) {
    const supabase = await createClient();

    try {
        // Verify admin access
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { secretKey, publicKey } = body;

        if (!secretKey || !publicKey) {
            return NextResponse.json({
                success: false,
                error: 'Both Public Key and Secret Key are required'
            });
        }

        // Validate key prefixes
        if (!publicKey.startsWith('pk_test_') && !publicKey.startsWith('pk_live_')) {
            return NextResponse.json({
                success: false,
                error: 'Invalid Public Key format. Must start with pk_test_ or pk_live_'
            });
        }

        if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
            return NextResponse.json({
                success: false,
                error: 'Invalid Secret Key format. Must start with sk_test_ or sk_live_'
            });
        }

        // Check for test/live mismatch
        const publicIsLive = publicKey.startsWith('pk_live_');
        const secretIsLive = secretKey.startsWith('sk_live_');
        if (publicIsLive !== secretIsLive) {
            return NextResponse.json({
                success: false,
                error: 'Key mode mismatch: One key is Live and the other is Test. Both must be the same mode.'
            });
        }

        // Test connection by fetching account info
        const stripe = new Stripe(secretKey, {
            apiVersion: '2024-12-18.acacia' as any,
        });

        const account = await stripe.accounts.retrieve();

        return NextResponse.json({
            success: true,
            mode: publicIsLive ? 'live' : 'test',
            accountName: account.settings?.dashboard?.display_name || account.business_profile?.name || 'Stripe Account',
            country: account.country,
            currency: account.default_currency,
        });

    } catch (err: any) {
        console.error("Stripe test connection error:", err);

        let errorMessage = 'Connection failed';
        if (err.type === 'StripeAuthenticationError') {
            errorMessage = 'Invalid Secret Key — authentication failed';
        } else if (err.type === 'StripePermissionError') {
            errorMessage = 'Insufficient permissions for this Stripe account';
        } else if (err.message) {
            errorMessage = err.message;
        }

        return NextResponse.json({
            success: false,
            error: errorMessage
        });
    }
}
