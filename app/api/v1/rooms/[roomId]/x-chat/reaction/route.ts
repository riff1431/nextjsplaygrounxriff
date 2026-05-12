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
    const session_id = body.session_id;
    const message = body.message;

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

    const insertPayload: any = { room_id: roomId, fan_id: user.id, reaction_type: reactionType, amount };
    if (session_id) insertPayload.session_id = session_id;

    const { data: reaction, error: insertError } = await supabase
        .from("x_chat_reactions")
        .insert(insertPayload)
        .select().single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    const fanName = user.user_metadata?.full_name || user.email?.split("@")[0] || "A fan";

    let notifMessage = `${fanName} sent ${reactionType} reaction (€${amount})`;
    if (message && message.trim().length > 0) {
        notifMessage += ` - "${message.trim()}"`;
    }

    await supabase.from("notifications").insert({
        user_id: room.host_id, actor_id: user.id, type: "xchat_reaction",
        message: notifMessage, reference_id: reaction.id,
    });

    const cleanType = reactionType.replace('reaction_', '').replace('sticker_', '');
    const EMOJI_MAP: Record<string, string> = {
        boost: "🔥", shine: "💎", crown: "👑", pulse: "⚡",
        kiss: "💋", tease: "😈", rose: "🌹", gift: "🎁",
    };
    const emoji = EMOJI_MAP[cleanType] || "";
    
    const msgContent = message && message.trim().length > 0 ? message.trim() : `Sent ${cleanType} reaction`;
    const finalBody = emoji ? `${emoji} ${msgContent}` : msgContent;

    const chatPayload: any = {
        room_id: roomId,
        sender_id: user.id,
        sender_name: fanName,
        body: finalBody,
        lane: amount >= 50 ? "Priority" : "Paid",
        paid_amount: amount,
        status: "Queued"
    };
    if (session_id) chatPayload.session_id = session_id;

    await supabase.from("x_chat_messages").insert(chatPayload);

    return NextResponse.json({ success: true, reaction, new_balance: splitResult.newBalance });
}
