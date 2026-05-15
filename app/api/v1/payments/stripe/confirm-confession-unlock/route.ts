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
        const { paymentIntentId } = body;

        // Fetch Stripe Secret Key dynamically
        const secretKey = await getStripeSecretKey();

        if (!secretKey) {
            return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
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
        const { confessionId } = paymentIntent.metadata;

        if (!confessionId) {
            return NextResponse.json({ error: 'Missing confession ID' }, { status: 400 });
        }

        // Check if already unlocked
        const { data: existingUnlock } = await supabase
            .from("confession_unlocks")
            .select("id")
            .eq("user_id", user.id)
            .eq("confession_id", confessionId)
            .maybeSingle();

        if (existingUnlock) {
            return NextResponse.json({ success: true, message: "Already unlocked" });
        }

        // Fetch Confession to get Host ID
        const { data: confession } = await supabase
            .from("confessions")
            .select("rooms(host_id)")
            .eq("id", confessionId)
            .single();

        const hostId = Array.isArray(confession?.rooms) ? confession.rooms[0]?.host_id : (confession?.rooms as any)?.host_id;

        // Insert Unlock Record
        const { error: unlockError } = await supabase
            .from("confession_unlocks")
            .insert([{
                user_id: user.id,
                confession_id: confessionId,
                price_paid: amount
            }]);

        if (unlockError) throw unlockError;

        // Credit Creator
        if (hostId) {
            const { error: addError } = await supabase.rpc("add_balance", {
                p_user_id: hostId,
                p_amount: amount
            });
            if (addError) console.error("Failed to credit creator:", addError);
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Error confirming confession unlock:", err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
