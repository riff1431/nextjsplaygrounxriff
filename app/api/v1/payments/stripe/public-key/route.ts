import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    try {
        // First try payment_settings table (preferred)
        const { data: settings } = await supabase
            .from('payment_settings')
            .select('config, is_enabled')
            .eq('provider', 'stripe')
            .single();

        if (settings?.config?.public_key && settings.is_enabled) {
            return NextResponse.json({
                publicKey: settings.config.public_key,
                enabled: true
            });
        }

        // Fallback to admin_settings (legacy)
        const { data: adminSettings } = await supabase
            .from('admin_settings')
            .select('value')
            .eq('key', 'payment_config')
            .single();

        if (adminSettings?.value?.stripe?.publicKey && adminSettings?.value?.stripe?.enabled) {
            return NextResponse.json({
                publicKey: adminSettings.value.stripe.publicKey,
                enabled: true
            });
        }

        // Final fallback to environment variable
        const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (envKey) {
            return NextResponse.json({
                publicKey: envKey,
                enabled: true
            });
        }

        return NextResponse.json({
            publicKey: null,
            enabled: false,
            error: 'Stripe not configured'
        });

    } catch (err: any) {
        console.error("Error fetching Stripe public key:", err);

        // Fallback to env on error
        const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (envKey) {
            return NextResponse.json({
                publicKey: envKey,
                enabled: true
            });
        }

        return NextResponse.json({
            publicKey: null,
            enabled: false,
            error: err.message
        }, { status: 500 });
    }
}
