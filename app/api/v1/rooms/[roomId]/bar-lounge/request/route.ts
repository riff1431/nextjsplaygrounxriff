import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/rooms/[roomId]/bar-lounge/request
 * Fan sends a request (song/drink/champagne/vip_bottle/tip).
 * Body: { type, label, amount }
 *
 * GET /api/v1/rooms/[roomId]/bar-lounge/request
 * Get all requests for this room.
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("bar_lounge_requests")
        .select("*")
        .eq("room_id", roomId)
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
    const { type, label, amount } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!type || !amount || amount <= 0) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Get room creator
    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Get fan profile name
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();

    // Transfer funds
    const { data: result, error: rpcError } = await supabase.rpc("transfer_funds", {
        p_from_user_id: user.id,
        p_to_user_id: room.host_id,
        p_amount: amount,
        p_description: `Bar Lounge: ${label || type}`,
        p_room_id: roomId,
        p_related_type: `bar_${type}`,
        p_related_id: null,
    });

    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });
    if (!result?.success) return NextResponse.json({ error: result?.error || "Payment failed" }, { status: 400 });

    // Insert request
    const { data: req, error: reqError } = await supabase
        .from("bar_lounge_requests")
        .insert({ room_id: roomId, fan_id: user.id, fan_name: profile?.username || "Anonymous", type, label, amount })
        .select().single();

    if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 });

    // Notification
    await supabase.from("notifications").insert({
        user_id: room.host_id, actor_id: user.id, type: "bar_request",
        message: `${profile?.username || "Fan"} ordered ${label || type} ($${amount})`,
        reference_id: req.id,
    });

    // System message in chat feed so both creator and fans see it live
    const emoji = type === "drink" ? "🍸" : type === "tip" ? "💰" : type === "vip" ? "👑" : type === "booth" ? "🛋️" : "⚡";
    await supabase.from("bar_lounge_messages").insert({
        room_id: roomId,
        user_id: user.id,
        handle: profile?.username || "Fan",
        content: `${emoji} ${profile?.username || "Fan"} ${type === "tip" ? "sent a" : "bought"} ${label || type} ($${amount})`,
        is_system: true,
    });

    return NextResponse.json({ success: true, request: req, new_balance: result.new_balance });
}

/**
 * PATCH for updating request status (creator accepts/declines)
 */
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

    // Verify room host
    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room || room.host_id !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const { data: updated, error } = await supabase
        .from("bar_lounge_requests")
        .update({ status })
        .eq("id", requestId)
        .eq("room_id", roomId)
        .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, request: updated });
}
