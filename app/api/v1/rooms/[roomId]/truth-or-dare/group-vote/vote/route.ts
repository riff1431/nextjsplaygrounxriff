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

    // 2. Body Parser
    const body = await request.json();
    const { type } = body; // 'truth' | 'dare'

    if (!['truth', 'dare'].includes(type)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 3. Get Game State to verify active and price
    let game: any = null;
    try {
        const { data, error } = await supabase
            .from('truth_dare_games')
            .select('*')
            .eq('room_id', roomId)
            .single();

        if (error) throw error;
        game = data;
    } catch (e) {
        console.error("Error fetching game for vote:", e);
        return NextResponse.json({ error: "Game state unavailable" }, { status: 500 });
    }

    if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

    const state = game.group_vote_state as any;
    const campaign = state?.[type];

    if (!campaign || !campaign.isActive) {
        return NextResponse.json({ error: "Group vote campaign not active" }, { status: 400 });
    }

    const price = Number(campaign.price);

    // 4. (Multiple votes allowed) – fans can boost as many times as they like.

    // 5. Host Info for Payment
    const { data: room } = await supabase
        .from('rooms')
        .select('host_id')
        .eq('id', roomId)
        .single();

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    const hostId = room.host_id;

    // 5. Payment Processing (Copied from Interact logic)
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

    // Add to Creator (use Admin for safety if RLS hides it)
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: creatorWallet } = await adminSupabase
        .from('wallets')
        .select('balance')
        .eq('user_id', hostId)
        .single();

    // If wallet doesn't exist, create it (simplified here, assuming exists or create on fly as in previous route)
    let newBalance = price;
    if (creatorWallet) {
        newBalance += Number(creatorWallet.balance);
    }

    await adminSupabase.from('wallets').upsert({ user_id: hostId, balance: newBalance }); // Simple upsert

    // 6. Atomically increment the vote counter (prevents race conditions where
    //    two concurrent votes both read the same value and both write N+1).
    const { data: newCount, error: rpcError } = await supabase
        .rpc('increment_tod_group_vote', { p_room_id: roomId, p_type: type });

    if (rpcError) {
        console.error('Atomic increment error:', rpcError);
        return NextResponse.json({ error: 'Vote count update failed' }, { status: 500 });
    }

    const currentCount = newCount as number;

    // 7. Record the Transaction
    await supabase.from('truth_dare_requests').insert({
        room_id: roomId,
        fan_id: user.id,
        type: `group_vote_${type}`,
        tier: 'custom',
        content: `Voted for Group ${type === 'truth' ? 'Truth' : 'Dare'}`,
        amount: price,
        status: 'completed',
        fan_name: user.user_metadata?.full_name || 'Fan'
    });

    // 8. Broadcast the authoritative count from the DB
    await supabase.channel(`room:${roomId}`).send({
        type: 'broadcast',
        event: 'group_vote_update',
        payload: { type, current: currentCount, target: campaign.target }
    });

    return NextResponse.json({ success: true, newCount: currentCount });
}
