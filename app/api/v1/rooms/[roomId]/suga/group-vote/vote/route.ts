import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    // 1. Auth and User Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get Game State to verify active and price
    let room: any = null;
    try {
        const { data, error } = await supabase
            .from('rooms')
            .select('host_id, group_vote_state')
            .eq('id', roomId)
            .single();

        if (error) throw error;
        room = data;
    } catch (e) {
        console.error("Error fetching room for group vote:", e);
        return NextResponse.json({ error: "Room state unavailable" }, { status: 500 });
    }

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const state = room.group_vote_state as any;

    if (!state || !state.isActive) {
        return NextResponse.json({ error: "Group vote campaign not active" }, { status: 400 });
    }

    const price = Number(state.price);
    const hostId = room.host_id;

    // 3. Payment Processing
    // A. Check Fan Balance
    const { data: fanWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

    if (!fanWallet || Number(fanWallet.balance) < price) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
    }

    // B. Transfer Money
    // Deduct
    const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: Number(fanWallet.balance) - price })
        .eq('user_id', user.id);

    if (deductError) return NextResponse.json({ error: "Transaction failed" }, { status: 500 });

    // Add to Creator
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: creatorWallet } = await adminSupabase
        .from('wallets')
        .select('balance')
        .eq('user_id', hostId)
        .single();

    let newBalance = price;
    if (creatorWallet) {
        newBalance += Number(creatorWallet.balance);
    }

    await adminSupabase.from('wallets').upsert({ user_id: hostId, balance: newBalance });

    // 4. Update Game State (Increment Vote Count)
    const { data: freshRoom } = await supabase
        .from('rooms')
        .select('group_vote_state')
        .eq('id', roomId)
        .single();

    const freshState = (freshRoom?.group_vote_state as any) || {};
    if (freshState && freshState.isActive) {
        freshState.current = (Number(freshState.current) || 0) + 1;
    }

    await supabase
        .from('rooms')
        .update({ group_vote_state: freshState })
        .eq('id', roomId);

    // 5. Record the Transaction in suga4u_requests
    await supabase.from('suga4u_requests').insert({
        room_id: roomId,
        fan_id: user.id,
        request_type: `group_vote`,
        content: `Contributed to Group Goal: ${state.label}`,
        amount: price,
        status: 'completed',
        fan_name: user.user_metadata?.full_name || 'Fan'
    });

    // 6. Broadcast
    await supabase.channel(`room:${roomId}`).send({
        type: 'broadcast',
        event: 'group_vote_update',
        payload: { current: freshState.current, target: freshState.target, isActive: freshState.isActive }
    });

    return NextResponse.json({ success: true, newCount: freshState.current });
}
