import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    // 1. Get current game state
    const { data: game } = await supabase
        .from("truth_dare_games")
        .select("current_prompt")
        .eq("room_id", roomId)
        .single();

    if (!game?.current_prompt) {
        return NextResponse.json({ error: "No active prompt to decline" }, { status: 400 });
    }

    // 2. Generate Replacement
    const oldPrompt = game.current_prompt;
    const replacement = {
        ...oldPrompt,
        id: `repl_${Date.now()}`,
        label: `(Replacement) ${oldPrompt.label}`, // Simple mock replacement
        startedAt: Date.now()
    };

    // 3. Update Game State
    const { data: updatedGame, error } = await supabase
        .from("truth_dare_games")
        .update({ current_prompt: replacement })
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, game: updatedGame });
}
