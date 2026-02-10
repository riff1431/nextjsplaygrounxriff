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
        const { paymentIntentId } = body;

        // Fetch Stripe Secret Key
        const { data: settings } = await supabase
            .from('payment_settings')
            .select('secret_config')
            .eq('provider', 'stripe')
            .single();

        const secretKey = settings?.secret_config?.secret_key || process.env.STRIPE_SECRET_KEY;

        if (!secretKey) {
            return NextResponse.json({ error: 'System config error' }, { status: 500 });
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2024-12-18.acacia' as any,
        });

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
        }

        // Verify Owner
        if (paymentIntent.metadata.userId !== user.id) {
            return NextResponse.json({ error: 'Invalid payment owner' }, { status: 403 });
        }

        const amount = paymentIntent.amount / 100;
        const { postId } = paymentIntent.metadata;

        if (!postId) {
            return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
        }

        // Check if already unlocked
        const { data: existing } = await supabase
            .from('post_unlocks')
            .select('id')
            .eq('user_id', user.id)
            .eq('post_id', postId)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ success: true, message: "Already unlocked" });
        }

        // Insert Unlock Record
        const { error: insertError } = await supabase
            .from('post_unlocks')
            .insert({
                user_id: user.id,
                post_id: postId,
                amount: amount
            });

        if (insertError) throw insertError;

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Error confirming post unlock:", err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
