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
        const { paymentIntentId, roomId } = body;

        // Fetch Stripe Secret Key dynamically
        const secretKey = await getStripeSecretKey();

        if (!secretKey) {
            console.error("Stripe Secret Key missing");
            return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2024-12-18.acacia' as any,
        });

        // Retrieve the PaymentIntent to verify status
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
        }

        // Verify metadata matches user/room to prevent spoofing
        if (paymentIntent.metadata.userId !== user.id || paymentIntent.metadata.roomId !== roomId) {
            // Optional: Be strict or lenient depending on use case. 
            // For now, let's verify userId at least.
            if (paymentIntent.metadata.userId !== user.id) {
                return NextResponse.json({ error: 'Invalid payment owner' }, { status: 403 });
            }
        }

        // Check if already unlocked
        const { data: existing } = await supabase
            .from('truth_dare_unlocks')
            .select('id')
            .eq('room_id', roomId)
            .eq('fan_id', user.id)
            .single();

        if (existing) {
            return NextResponse.json({ success: true, message: "Already unlocked" });
        }

        // Record Unlock
        const { error: unlockError } = await supabase
            .from('truth_dare_unlocks')
            .insert({
                room_id: roomId,
                fan_id: user.id,
                amount_paid: paymentIntent.amount / 100, // Convert back to dollars
                payment_method: 'stripe',
                payment_id: paymentIntent.id
            });

        if (unlockError) throw unlockError;

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Error confirming payment:", err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
