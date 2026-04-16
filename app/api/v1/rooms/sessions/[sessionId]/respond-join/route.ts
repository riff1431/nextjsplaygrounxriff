import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions/[sessionId]/respond-join
// Creator approves or rejects a join request
// Body: { request_id, action: "approve" | "reject" }
// ──────────────────────────────────────────────────
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { request_id, action } = body;

        if (!request_id || !action || !["approve", "reject"].includes(action)) {
            return NextResponse.json({ error: "request_id and action (approve/reject) required" }, { status: 400 });
        }

        // 1. Verify creator owns this session
        const { data: session } = await supabase
            .from("room_sessions")
            .select("id, creator_id, title, entry_fee")
            .eq("id", sessionId)
            .single();

        if (!session || session.creator_id !== user.id) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        // 2. Get the join request
        const { data: joinReq, error: reqError } = await supabase
            .from("room_join_requests")
            .select("id, user_id, status")
            .eq("id", request_id)
            .eq("session_id", sessionId)
            .single();

        if (reqError || !joinReq) {
            return NextResponse.json({ error: "Join request not found" }, { status: 404 });
        }

        if (joinReq.status !== "pending") {
            return NextResponse.json({ error: `Request already ${joinReq.status}` }, { status: 400 });
        }

        // 3. Update request status
        const newStatus = action === "approve" ? "approved" : "rejected";
        const { error: updateError } = await supabase
            .from("room_join_requests")
            .update({ status: newStatus, responded_at: new Date().toISOString() })
            .eq("id", request_id);

        if (updateError) throw updateError;

        // 4. Notify the fan
        const notifMessage = action === "approve"
            ? `Your request to join "${session.title}" was approved! Entry fee: €${session.entry_fee}`
            : `Your request to join "${session.title}" was rejected.`;

        await supabase.from("notifications").insert({
            user_id: joinReq.user_id,
            actor_id: user.id,
            type: action === "approve" ? "join_request_approved" : "join_request_rejected",
            message: notifMessage,
            metadata: { session_id: sessionId, request_id },
        });

        return NextResponse.json({
            success: true,
            status: newStatus,
            request_id,
        });
    } catch (err: any) {
        console.error("Respond join error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/sessions/[sessionId]/respond-join
// Get pending join requests for a session (creator only)
// ──────────────────────────────────────────────────
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Verify creator
        const { data: session } = await supabase
            .from("room_sessions")
            .select("creator_id")
            .eq("id", sessionId)
            .single();

        if (!session || session.creator_id !== user.id) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        const { data: requests, error } = await supabase
            .from("room_join_requests")
            .select(`
                *,
                user:profiles!room_join_requests_user_id_fkey(id, username, avatar_url, full_name)
            `)
            .eq("session_id", sessionId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ requests: requests || [] });
    } catch (err: any) {
        console.error("List join requests error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
