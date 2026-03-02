import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/v1/rooms/[roomId]/confessions/request/[requestId]
 * Creator updates request status (accept, reject, deliver).
 * Fan can update status to 'completed' (accept delivery) or 'rejected' (decline delivery).
 *
 * Body: { status: string, deliveryContent?: string, delivery_media_url?: string }
 */
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; requestId: string }> }
) {
    const params = await props.params;
    const { roomId, requestId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { status, deliveryContent, delivery_media_url } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the request to check permissions
    const { data: existingReq } = await supabase
        .from("confession_requests")
        .select("*")
        .eq("id", requestId)
        .eq("room_id", roomId)
        .single();

    if (!existingReq) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Determine if user is creator or fan
    const isCreator = existingReq.creator_id === user.id;
    const isFan = existingReq.fan_id === user.id;

    if (!isCreator && !isFan) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Validate allowed status transitions
    if (isFan) {
        // Fan can only: accept delivery (completed) or decline delivery (rejected)
        if (!["completed", "rejected"].includes(status)) {
            return NextResponse.json({ error: "Fan can only accept or decline delivery" }, { status: 400 });
        }
        if (existingReq.status !== "delivered") {
            return NextResponse.json({ error: "Can only respond to delivered requests" }, { status: 400 });
        }
    }

    if (isCreator) {
        // Creator can: accept (in_progress), reject (rejected), deliver (delivered)
        if (!["in_progress", "rejected", "delivered"].includes(status)) {
            return NextResponse.json({ error: "Invalid status for creator" }, { status: 400 });
        }
    }

    const updates: any = { status, updated_at: new Date().toISOString() };
    if (deliveryContent !== undefined) {
        updates.delivery_content = deliveryContent;
    }
    if (delivery_media_url !== undefined) {
        updates.delivery_media_url = delivery_media_url;
    }

    const { data: updated, error } = await supabase
        .from("confession_requests")
        .update(updates)
        .eq("id", requestId)
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify the relevant user about status change
    if (updated) {
        if (isCreator) {
            const statusMessages: Record<string, string> = {
                in_progress: "Your confession request has been accepted!",
                delivered: "Your confession request has been delivered! Check it out.",
                rejected: "Your confession request was declined.",
            };
            const message = statusMessages[status];
            if (message) {
                await supabase.from("notifications").insert({
                    user_id: updated.fan_id,
                    actor_id: user.id,
                    type: "confession_request_update",
                    message,
                    reference_id: requestId,
                });
            }
        }

        if (isFan && status === "completed") {
            // Notify creator that fan accepted the delivery
            await supabase.from("notifications").insert({
                user_id: updated.creator_id,
                actor_id: user.id,
                type: "confession_completed",
                message: `Fan accepted your confession delivery! You earned $${updated.amount}.`,
                reference_id: requestId,
            });
        }
    }

    return NextResponse.json({ success: true, request: updated });
}
