import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/rooms/[roomId]/truth-or-dare/vote
 * Fan votes for tier or truth/dare, paying the vote price.
 * Body: { voteType: 'tier'|'truth_or_dare', voteValue: string, amount: number }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { voteType, voteValue, amount } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Transfer funds for paid votes
    if (amount > 0) {
        const { data: result, error: rpcError } = await supabase.rpc("transfer_funds", {
            p_from_user_id: user.id, p_to_user_id: room.host_id, p_amount: amount,
            p_description: `T/D Vote: ${voteType} → ${voteValue}`, p_room_id: roomId,
            p_related_type: "td_vote", p_related_id: null,
        });

        if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });
        if (!result?.success) return NextResponse.json({ error: result?.error || "Payment failed" }, { status: 400 });
    }

    // Record vote
    const { data: vote, error: voteError } = await supabase
        .from("truth_dare_votes")
        .insert({ room_id: roomId, fan_id: user.id, vote_type: voteType, vote_value: voteValue, amount_paid: amount })
        .select().single();

    if (voteError) return NextResponse.json({ error: voteError.message }, { status: 500 });

    // Update game state vote tallies
    const voteField = voteType === "tier" ? "votes_tier" : "votes_tv";
    const { data: game } = await supabase
        .from("truth_dare_games")
        .select(voteField)
        .eq("room_id", roomId)
        .single();

    if (game) {
        const currentVotes = (game as any)[voteField] || {};
        const key = voteValue.toLowerCase();
        currentVotes[key] = (currentVotes[key] || 0) + 1;

        await supabase
            .from("truth_dare_games")
            .update({ [voteField]: currentVotes, updated_at: new Date().toISOString() })
            .eq("room_id", roomId);
    }

    return NextResponse.json({ success: true, vote });
}
