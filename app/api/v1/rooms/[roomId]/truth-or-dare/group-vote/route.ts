import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;

    // 1. Auth & Host Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: room } = await supabase
        .from('rooms')
        .select('host_id')
        .eq('id', roomId)
        .single();

    if (!room || room.host_id !== user.id) {
        return NextResponse.json({ error: "Only host can manage group votes" }, { status: 403 });
    }

    // 2. Parse Body
    const body = await request.json();
    const { action, type, label, target, price } = body;
    // action: 'START' | 'STOP'
    // type: 'truth' | 'dare'

    if (!['truth', 'dare'].includes(type)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 3. Fetch Current State
    let currentState: any = { truth: { isActive: false }, dare: { isActive: false } };

    try {
        const { data: game, error } = await supabase
            .from('truth_dare_games')
            .select('group_vote_state')
            .eq('room_id', roomId)
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore "No rows" for now, handled by default state if null
            console.error("Error fetching game state:", error);
            // If column missing logic? It will return error.
        }

        if (game?.group_vote_state) {
            currentState = game.group_vote_state;
        }
    } catch (e) {
        console.error("Failed to read group_vote_state", e);
        // Continue with default state if new column is missing, 
        // but remember update will fail if column missing.
    }

    // 4. Update State based on Action
    if (action === 'START') {
        if (!label || !target || !price) {
            return NextResponse.json({ error: "Missing fields for START" }, { status: 400 });
        }

        currentState[type] = {
            isActive: true,
            label,
            target: Number(target),
            price: Number(price),
            current: 0 // Reset progress
        };
    } else if (action === 'STOP') {
        currentState[type] = {
            isActive: false,
            label: "",
            target: 0,
            price: 0,
            current: 0
        };
    } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 5. Save to DB
    const { error: updateError } = await supabase
        .from('truth_dare_games')
        .update({ group_vote_state: currentState })
        .eq('room_id', roomId);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, state: currentState });
}
