import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

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

    // Payment with revenue split (85% creator / 15% platform)
    const splitResult = await applyRevenueSplit({
        supabase,
        fanUserId: user.id,
        creatorUserId: room.host_id,
        grossAmount: amount,
        splitType: 'GLOBAL',
        description: `X Chat reaction: ${reactionType}`,
        roomId,
        relatedType: 'xchat_reaction',
        relatedId: null,
        earningsCategory: 'reactions',
    });

    if (!splitResult.success) return NextResponse.json({ error: splitResult.error || "Payment failed" }, { status: 400 });

    const { data: reaction, error: insertError } = await supabase
        .from("x_chat_reactions")
        .insert({ room_id: roomId, fan_id: user.id, reaction_type: reactionType, amount })
        .select().single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    await supabase.from("notifications").insert({
        user_id: room.host_id, actor_id: user.id, type: "xchat_reaction",
        message: `Fan sent ${reactionType} reaction ($${amount})`, reference_id: reaction.id,
    });

    return NextResponse.json({ success: true, reaction, new_balance: splitResult.newBalance });
}
