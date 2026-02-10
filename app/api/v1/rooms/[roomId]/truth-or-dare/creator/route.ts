import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    // 1. Fetch game state (or create if missing)
    let { data: game, error } = await supabase
        .from("truth_dare_games")
        .select("*")
        .eq("room_id", roomId)
        .single();

    if (!game && !error) {
        // Attempt to upsert default state if none exists (Creator flow)
        const { data: newGame, error: upsertError } = await supabase
            .from("truth_dare_games")
            .insert([{ room_id: roomId }])
            .select()
            .single();
        if (!upsertError) game = newGame;
    }

    // 2. Fetch active creators (for now, assume creator of room + others joined?)
    // Mocking creators list for now, or fetching from room participants if available.
    // In a real system, we'd query room_participants where role='creator'
    const creators: any[] = [];

    // 3. Fetch camera slots (on-camera fans)
    const { data: slots } = await supabase
        .from("truth_dare_camera_slots")
        .select("fan_id, fan_name, is_on_camera")
        .eq("room_id", roomId);

    // 4. Fetch queue summary (counts or recent items)
    // Just returning total count and top recent for initial load could be enough, 
    // but let's just let the client fetch queue separately or return first batch here.
    const { count: queueCount } = await supabase
        .from("truth_dare_queue")
        .select("*", { count: 'exact', head: true })
        .eq("room_id", roomId)
        .eq("is_served", false);

    return NextResponse.json({
        game_state: game,
        creators,
        camera_slots: slots || [],
        queue_count: queueCount || 0,
    });
}
