import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeSecretKey } from '@/utils/stripe/getStripeKeys';

export async function POST(req: Request) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { amount, currency = 'eur', roomId } = body;

        // Fetch Stripe Secret Key from DB settings (dynamic) → env fallback
        const secretKey = await getStripeSecretKey();

        if (!secretKey) {
            console.error("Stripe Secret Key missing");
            return NextResponse.json({ error: 'Stripe is not configured. Admin needs to set up payment gateway.' }, { status: 500 });
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2024-12-18.acacia' as any,
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
