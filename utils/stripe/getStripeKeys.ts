import { createClient } from '@/utils/supabase/server';

/**
 * Fetches the Stripe secret key from the database (payment_settings → admin_settings → .env fallback).
 * This is a server-side utility — never expose to the client.
 */
export async function getStripeSecretKey(): Promise<string | null> {
    const supabase = await createClient();

    // 1. Try payment_settings table (preferred — admin panel configured)
    const { data: settings } = await supabase
        .from('payment_settings')
        .select('secret_config, is_enabled')
        .eq('provider', 'stripe')
        .single();

    if (settings?.secret_config?.secret_key && settings.is_enabled) {
        return settings.secret_config.secret_key;
    }

    // 2. Fallback to admin_settings (legacy)
    const { data: adminSettings } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'payment_config')
        .single();

    if (adminSettings?.value?.stripe?.secretKey && adminSettings?.value?.stripe?.enabled) {
        return adminSettings.value.stripe.secretKey;
    }

    // 3. Fallback to .env
    return process.env.STRIPE_SECRET_KEY || null;
}

/**
 * Fetches the Stripe publishable key from the database (payment_settings → admin_settings → .env fallback).
 * Safe for client exposure.
 */
export async function getStripePublicKey(): Promise<string | null> {
    const supabase = await createClient();

    // 1. Try payment_settings table
    const { data: settings } = await supabase
        .from('payment_settings')
        .select('config, is_enabled')
        .eq('provider', 'stripe')
        .single();

    if (settings?.config?.public_key && settings.is_enabled) {
        return settings.config.public_key;
    }

    // 2. Fallback to admin_settings (legacy)
    const { data: adminSettings } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'payment_config')
        .single();

    if (adminSettings?.value?.stripe?.publicKey && adminSettings?.value?.stripe?.enabled) {
        return adminSettings.value.stripe.publicKey;
    }

    // 3. Fallback to .env
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}
