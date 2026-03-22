import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/confessions/global/accept
 * Creator claims a global confession request.
 * Body: { request_id: string }
 *
 * Steps:
 * 1. Verify the request is global + pending_approval
 * 2. Transfer funds from fan → accepting creator
 * 3. Update creator_id, room_id, and status on the request
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { request_id } = body;

    if (!request_id) {
        return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    // Fetch the global request
    const { data: confReq, error: fetchErr } = await supabase
        .from("confession_requests")
        .select("*")
        .eq("id", request_id)
        .eq("confession_mode", "global")
        .eq("status", "pending_approval")
        .single();

    if (fetchErr || !confReq) {
        return NextResponse.json(
            { error: "Request not found or already claimed" },
            { status: 404 }
        );
    }

    // Find the creator's active confessions room
    const { data: room } = await supabase
        .from("rooms")
        .select("id")
        .eq("host_id", user.id)
        .eq("type", "confessions")
        .eq("status", "live")
        .limit(1)
        .maybeSingle();

    const creatorRoomId = room?.id || confReq.room_id;

    // Transfer funds from fan to this creator
    const { data: result, error: rpcError } = await supabase.rpc("transfer_funds", {
        p_from_user_id: confReq.fan_id,
        p_to_user_id: user.id,
        p_amount: confReq.amount,
        p_description: `Global confession accepted: ${confReq.type} - ${confReq.topic}`,
        p_room_id: creatorRoomId,
        p_related_type: "confession_request",
        p_related_id: confReq.id,
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

    // Claim the request: update creator_id, room_id, status
    const { data: updated, error: updateErr } = await supabase
        .from("confession_requests")
        .update({
            creator_id: user.id,
            room_id: creatorRoomId,
            status: "in_progress",
        })
        .eq("id", request_id)
        .eq("status", "pending_approval") // optimistic lock
        .select()
        .single();

    if (updateErr || !updated) {
        return NextResponse.json(
            { error: "Failed to claim request — it may have been taken by another creator" },
            { status: 409 }
        );
    }

    // Notify the fan
    await supabase.from("notifications").insert({
        user_id: confReq.fan_id,
        actor_id: user.id,
        type: "confession_request",
        message: `Your global ${confReq.type} confession request has been accepted!`,
        reference_id: confReq.id,
    });

    return NextResponse.json({ success: true, request: updated });
}
