import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/rooms/[roomId]/x-chat/reaction
 * Fan sends a paid reaction.
 * Body: { reactionType, amount }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const reactionType = body.reactionType || body.type;
    const amount = body.amount;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Transfer funds
    const { data: result, error: rpcError } = await supabase.rpc("transfer_funds", {
        p_from_user_id: user.id, p_to_user_id: room.host_id, p_amount: amount,
        p_description: `X Chat reaction: ${reactionType}`, p_room_id: roomId,
        p_related_type: "xchat_reaction", p_related_id: null,
    });

    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });
    if (!result?.success) return NextResponse.json({ error: result?.error || "Payment failed" }, { status: 400 });

    const { data: reaction, error: insertError } = await supabase
        .from("x_chat_reactions")
        .insert({ room_id: roomId, fan_id: user.id, reaction_type: reactionType, amount })
        .select().single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    await supabase.from("notifications").insert({
        user_id: room.host_id, actor_id: user.id, type: "xchat_reaction",
        message: `Fan sent ${reactionType} reaction ($${amount})`, reference_id: reaction.id,
    });

    return NextResponse.json({ success: true, reaction, new_balance: result.new_balance });
}
