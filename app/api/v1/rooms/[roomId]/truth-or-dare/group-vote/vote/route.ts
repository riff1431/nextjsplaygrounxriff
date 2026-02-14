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

    // 4. Host Info for Payment
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

    // 6. Update Game State (Increment Vote Count)
    // Re-fetch to minimize race conditions, or just use atomic increment?
    // JSONB atomic update is hard. We will do read-modify-write with optimistic locking if needed, 
    // but for now simple update.

    // We need to fetch the LATEST state again to avoid overwriting other parallel updates
    const { data: freshGame } = await supabase
        .from('truth_dare_games')
        .select('group_vote_state')
        .eq('room_id', roomId)
        .single();

    const freshState = (freshGame?.group_vote_state as any) || {};
    if (freshState[type]) {
        freshState[type].current = (Number(freshState[type].current) || 0) + 1;
    }

    await supabase
        .from('truth_dare_games')
        .update({ group_vote_state: freshState })
        .eq('room_id', roomId);

    // 7. Record the Transaction (Optional: Add to requests for history?)
    // Yes, let's add to requests so it shows in earnings/top spender
    // Format: type='group_vote_truth' or 'group_vote_dare'
    await supabase.from('truth_dare_requests').insert({
        room_id: roomId,
        fan_id: user.id,
        type: `group_vote_${type}`,
        tier: 'custom', // or null
        content: `Voted for Group ${type === 'truth' ? 'Truth' : 'Dare'}`,
        amount: price,
        status: 'completed',
        fan_name: user.user_metadata?.full_name || 'Fan'
    });

    // 8. Broadcast?
    // The Game State update will trigger the `postgres_changes` listener on the client.
    // So we don't strictly *need* a separate broadcast, but we can send one for "Vote Added" animation effects.
    await supabase.channel(`room:${roomId}`).send({
        type: 'broadcast',
        event: 'group_vote_update',
        payload: { type, current: freshState[type].current, target: freshState[type].target }
    });

    return NextResponse.json({ success: true, newCount: freshState[type].current });
}
