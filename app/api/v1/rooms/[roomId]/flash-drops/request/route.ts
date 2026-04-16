import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/flash-drops/request
 * Fan sends a drop request.
 * Body: { content: string, amount: number }
 *
 * GET /api/v1/rooms/[roomId]/flash-drops/request
 * Get drop requests for this room.
 *
 * PATCH /api/v1/rooms/[roomId]/flash-drops/request
 * Creator accepts/declines a request.
 * Body: { requestId: string, status: 'accepted'|'declined' }
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("flash_drop_requests")
        .select("*").eq("room_id", roomId)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ requests: data || [] });
}

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { content, amount, description } = body;
    const finalContent = description || content || "Custom Request";

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
        description: finalContent,
        roomId,
        relatedType: 'flash_drop_request',
        relatedId: null,
        earningsCategory: 'custom_requests',
    });

    if (!splitResult.success) return NextResponse.json({ error: splitResult.error }, { status: 400 });

    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();

    const { data: req, error: reqError } = await supabase
        .from("flash_drop_requests")
        .insert({ room_id: roomId, fan_id: user.id, fan_name: profile?.username || "Anonymous", content: finalContent, amount })
        .select().single();

    if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 });

    const systemMsg = finalContent.includes('Pack') || finalContent.includes('Bundle')
        ? `🎁 ${profile?.username || "Anonymous"} ${finalContent.replace('🎁 ', '')}`
        : `💰 ${profile?.username || "Anonymous"} submitted a €${amount} custom drop request!`;

    // Insert System Message into Chat (Server-side to avoid duplication)
    const { data: existingMsg } = await supabase
        .from("room_chat_messages")
        .select("id")
        .eq("room_id", roomId)
        .eq("is_system", true)
        .eq("message", systemMsg)
        .gt("created_at", new Date(Date.now() - 2000).toISOString())
        .limit(1);

    if (!existingMsg || existingMsg.length === 0) {
        await supabase.from("room_chat_messages").insert({
            room_id: roomId,
            sender_id: null,
            sender_name: "System",
            message: systemMsg,
            is_system: true,
            system_type: "drop_request",
        });
    }

    await supabase.from("notifications").insert({
        user_id: room.host_id, actor_id: user.id, type: "flash_drop_request",
        message: `New drop request (€${amount}): "${finalContent}"`,
        reference_id: req.id,
    });

    return NextResponse.json({ success: true, request: req, new_balance: splitResult.newBalance });
}

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { requestId, status } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room || room.host_id !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const { data: updated, error } = await supabase
        .from("flash_drop_requests")
        .update({ status })
        .eq("id", requestId).eq("room_id", roomId)
        .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, request: updated });
}
