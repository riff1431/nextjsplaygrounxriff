import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/v1/rooms/[roomId]/confessions/request/[requestId]
 * Creator updates request status (accept, reject, deliver).
 *
 * Body: { status: string, deliveryContent?: string }
 */
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; requestId: string }> }
) {
    const params = await props.params;
    const { roomId, requestId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { status, deliveryContent } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is the creator (room host)
    const { data: room } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", roomId)
        .single();

    if (!room || room.host_id !== user.id) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const updates: any = { status, updated_at: new Date().toISOString() };
    if (deliveryContent !== undefined) {
        updates.delivery_content = deliveryContent;
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

    // Notify the fan about status change
    if (updated) {
        const statusMessages: Record<string, string> = {
            in_progress: "Your confession request has been accepted!",
            delivered: "Your confession request has been delivered!",
            completed: "Your confession request is complete!",
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

    return NextResponse.json({ success: true, request: updated });
}
