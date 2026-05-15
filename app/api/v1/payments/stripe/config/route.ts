
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    try {
        // 1. Try fetching from payment_settings table first (admin-configured)
        const { data: settings } = await supabase
            .from('payment_settings')
            .select('config, is_enabled')
            .eq('provider', 'stripe')
            .single();

        if (settings?.config?.public_key && settings.is_enabled) {
            return NextResponse.json({ publicKey: settings.config.public_key });
        }

        // 2. Fallback to admin_settings (legacy)
        const { data: adminSettings } = await supabase
            .from('admin_settings')
            .select('value')
            .eq('key', 'payment_config')
            .single();

        if (adminSettings?.value?.stripe?.publicKey && adminSettings?.value?.stripe?.enabled) {
            return NextResponse.json({ publicKey: adminSettings.value.stripe.publicKey });
        }

        // 3. Final fallback to environment variable
        const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (envKey) {
            return NextResponse.json({ publicKey: envKey });
        }

        return NextResponse.json({ error: 'Stripe Publishable Key not configured' }, { status: 500 });

    } catch (err: any) {
        // Fallback to env on error
        const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (envKey) {
            return NextResponse.json({ publicKey: envKey });
        }
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
}
