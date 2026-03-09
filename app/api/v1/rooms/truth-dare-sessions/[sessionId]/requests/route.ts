import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/truth-dare-sessions/[sessionId]/requests
// List pending join requests for creator
// ──────────────────────────────────────────────────
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const supabase = await createClient();
    const { sessionId } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: session } = await supabase
            .from("truth_dare_sessions")
            .select("id, room_id, creator_id")
            .eq("id", sessionId)
            .single();

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Check ownership via creator_id or via rooms table
        const { data: room } = await supabase
            .from("rooms")
            .select("host_id")
            .eq("id", session.room_id)
            .single();

        if (session.creator_id !== user.id && room?.host_id !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { data: requests, error } = await supabase
            .from("room_join_requests")
            .select(`
                *,
                profile:profiles(full_name, username, avatar_url)
            `)
            .eq("session_id", sessionId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ requests: requests || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// PATCH /api/v1/rooms/truth-dare-sessions/[sessionId]/requests
// Accept or decline a join request
// Body: { requestId, action: 'accept' | 'decline' }
// ──────────────────────────────────────────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const supabase = await createClient();
    const { sessionId } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { requestId, action } = body;

        if (!requestId || !["accept", "decline"].includes(action)) {
            return NextResponse.json({ error: "requestId and action (accept/decline) required" }, { status: 400 });
        }

        // Verify session ownership
        const { data: session } = await supabase
            .from("truth_dare_sessions")
            .select("id, room_id, creator_id, title, price")
            .eq("id", sessionId)
            .single();

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const { data: room } = await supabase
            .from("rooms")
            .select("host_id")
            .eq("id", session.room_id)
            .single();

        if (session.creator_id !== user.id && room?.host_id !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Get the request
        const { data: req } = await supabase
            .from("room_join_requests")
            .select("*")
            .eq("id", requestId)
            .single();

        if (!req || req.session_id !== sessionId) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        const newStatus = action === "accept" ? "approved" : "rejected";

        // Update request status
        const { error: updateError } = await supabase
            .from("room_join_requests")
            .update({
                status: newStatus,
                responded_at: new Date().toISOString(),
            })
            .eq("id", requestId);

        if (updateError) throw updateError;

        // Notify fan
        const notifType = action === "accept" ? "truth_dare_request_accepted" : "truth_dare_request_declined";
        const notifMessage = action === "accept"
            ? `Your request to join "${session.title}" was approved! You can now pay and enter.`
            : `Your request to join "${session.title}" was declined.`;

        await supabase.from("notifications").insert({
            user_id: req.user_id,
            type: notifType,
            message: notifMessage,
            reference_id: sessionId,
        });

        return NextResponse.json({ success: true, status: newStatus });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
