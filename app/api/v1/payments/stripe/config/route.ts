
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    // 1. Try fetching from DB settings first
    const { data: settings } = await supabase
        .from('payment_settings')
        .select('public_config')
        .eq('provider', 'stripe')
        .single();

    const publicKey = settings?.public_config?.public_key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publicKey) {
        return NextResponse.json({ error: 'Stripe Publishable Key not configured' }, { status: 500 });
    }

    return NextResponse.json({ publicKey });
}
