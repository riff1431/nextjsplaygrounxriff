import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/rooms/[roomId]/confessions/request
 * Fan: get their own confession requests for this room.
 *
 * POST /api/v1/rooms/[roomId]/confessions/request
 * Fan submits a confession request (pay from wallet).
 *
 * Body: { type: 'Text'|'Audio'|'Video', topic: string, amount: number }
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is creator (host) of this room
    const { data: room } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", roomId)
        .single();

    let query = supabase
        .from("confession_requests")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

    // If fan, only show their own requests. If creator, show all.
    if (room?.host_id !== user.id) {
        query = query.eq("fan_id", user.id);
    }

    const { data: requests, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: requests || [] });
}

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { type, topic, amount } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!type || !topic || !amount || amount <= 0) {
        return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    // Get room to find creator
    const { data: room } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", roomId)
        .single();

    if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const creatorId = room.host_id;

    // Transfer funds
    const { data: result, error: rpcError } = await supabase.rpc("transfer_funds", {
        p_from_user_id: user.id,
        p_to_user_id: creatorId,
        p_amount: amount,
        p_description: `Confession request: ${type} - ${topic}`,
        p_room_id: roomId,
        p_related_type: "confession_request",
        p_related_id: null, // Will be the request ID after creation
    });

    if (rpcError) {
        return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!result?.success) {
        return NextResponse.json(
            { error: result?.error || "Payment failed" },
            { status: 400 }
        );
    }

    // Create the request
    const { data: req, error: reqError } = await supabase
        .from("confession_requests")
        .insert({
            room_id: roomId,
            fan_id: user.id,
            creator_id: creatorId,
            type,
            topic,
            amount,
            status: "pending_approval",
        })
        .select()
        .single();

    if (reqError) {
        return NextResponse.json({ error: reqError.message }, { status: 500 });
    }

    // Notification for creator
    await supabase.from("notifications").insert({
        user_id: creatorId,
        actor_id: user.id,
        type: "confession_request",
        message: `New ${type} confession request ($${amount}): "${topic}"`,
        reference_id: req.id,
    });

    return NextResponse.json({ success: true, request: req });
}
