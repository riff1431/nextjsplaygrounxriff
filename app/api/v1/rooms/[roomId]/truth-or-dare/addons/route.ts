import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { action } = body; // "TOGGLE_DOUBLE_DARE" | "OPEN_REPLAY"

    let updateData = {};

    if (action === 'TOGGLE_DOUBLE_DARE') {
        // We need to fetch current state to toggle, or just set if passed boolean.
        // Let's assume the client sends the *desired* state or we just use SQL toggle?
        // Simpler: Client sends { is_double_dare_armed: boolean }
        if (typeof body.is_double_dare_armed === 'boolean') {
            updateData = { is_double_dare_armed: body.is_double_dare_armed };
        }
    } else if (action === 'OPEN_REPLAY') {
        updateData = { replay_until: new Date(Date.now() + 2 * 60 * 1000).toISOString() }; // +2 mins
    } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: game, error } = await supabase
        .from("truth_dare_games")
        .update(updateData)
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, game });
}
