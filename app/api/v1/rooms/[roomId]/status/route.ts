import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/v1/rooms/[roomId]/status
 * Creator updates room status (go live / end session).
 * Body: { status: 'live' | 'offline' | 'ended' }
 *
 * GET /api/v1/rooms/[roomId]/status
 * Get room status.
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data: room, error } = await supabase
        .from("rooms")
        .select("id, status, host_id, title, type, viewer_count, created_at")
        .eq("id", roomId)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ room });
}

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { status } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is room host
    const { data: room } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", roomId)
        .single();

    if (!room || room.host_id !== user.id) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const validStatuses = ["live", "offline", "ended"];
    if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
        .from("rooms")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, room: updated });
}
