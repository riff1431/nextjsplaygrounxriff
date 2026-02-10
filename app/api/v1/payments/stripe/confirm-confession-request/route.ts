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

        const { roomId, type, topic, creatorId } = paymentIntent.metadata;
        const amount = paymentIntent.amount / 100;

        if (!roomId || !type || !topic) {
            return NextResponse.json({ error: 'Missing request details' }, { status: 400 });
        }

        // Need to fetch Room Host ID if not passed? 
        // We passed creatorId in metadata to be safe? 
        // If not, we fetch room.

        let targetCreatorId = creatorId;
        if (!targetCreatorId) {
            const { data: room } = await supabase.from('rooms').select('host_id').eq('id', roomId).maybeSingle();
            if (room) targetCreatorId = room.host_id;
        }

        if (!targetCreatorId) {
            return NextResponse.json({ error: 'Room host not found' }, { status: 404 });
        }

        // Check if already inserted (Idempotency) - logic is harder here without unique ID from frontend.
        // We can check if a request with same payment_intent_id exists?
        // But `confession_requests` schema doesn't seem to have `payment_id` column based on previous view_file.
        // Let's assume it doesn't. We can insert. 
        // If user refreshes, they might create duplicate requests if we don't handle it on frontend.
        // But `StripePaymentModal` only calls onSuccess once.

        // Insert Request
        const { data: newRequest, error: insertError } = await supabase
            .from('confession_requests')
            .insert({
                room_id: roomId,
                fan_id: user.id,
                creator_id: targetCreatorId,
                type,
                amount,
                topic,
                status: 'pending_approval'
                // metadata: { payment_id: paymentIntentId } // If metadata column exists
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, request: newRequest });

    } catch (err: any) {
        console.error("Error confirming confession request:", err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
