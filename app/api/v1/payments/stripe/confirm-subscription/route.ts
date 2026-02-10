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
        const { creatorId, tier } = paymentIntent.metadata;

        if (!creatorId || !tier) {
            return NextResponse.json({ error: 'Missing subscription details' }, { status: 400 });
        }

        // Calculate Period End
        const days = tier === 'weekly' ? 7 : 30;
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + days);

        // Check for existing active subscription to extend? 
        // For MVP, we'll just insert a new one or assuming unique constraint handles it?
        // Let's check if active subscription exists.
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id, current_period_end')
            .eq('user_id', user.id)
            .eq('creator_id', creatorId)
            .eq('status', 'active')
            .maybeSingle();

        if (existingSub) {
            // Extend
            const currentEnd = new Date(existingSub.current_period_end);
            const newEnd = currentEnd > new Date() ? currentEnd : new Date();
            newEnd.setDate(newEnd.getDate() + days);

            const { error: updateError } = await supabase
                .from('subscriptions')
                .update({
                    current_period_end: newEnd.toISOString(),
                    tier: tier // Update tier if changed?
                })
                .eq('id', existingSub.id);

            if (updateError) throw updateError;
        } else {
            // Insert New
            const { error: insertError } = await supabase
                .from('subscriptions')
                .insert({
                    user_id: user.id,
                    creator_id: creatorId,
                    tier: tier,
                    status: 'active',
                    current_period_end: periodEnd.toISOString()
                });

            if (insertError) throw insertError;
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Error confirming subscription:", err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
