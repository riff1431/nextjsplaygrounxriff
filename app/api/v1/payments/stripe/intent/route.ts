import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { amount, currency = 'usd', roomId } = body;

        // Fetch Stripe Secret Key from DB settings
        // Ideally we check `payment_settings` first.
        const { data: settings } = await supabase
            .from('payment_settings')
            .select('secret_config')
            .eq('provider', 'stripe')
            .single();

        // Fallback to Env if DB not configured or empty
        let secretKey = settings?.secret_config?.secret_key || process.env.STRIPE_SECRET_KEY;

        if (!secretKey) {
            console.error("Stripe Secret Key missing");
            return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2024-12-18.acacia' as any, // Use latest or pinning
        });

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: user.id,
                roomId: roomId || 'generic',
                type: body.metadata?.type || 'unlock_session',
                ...body.metadata
            }
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret
        });

    } catch (err: any) {
        console.error("Error creating payment intent:", err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
