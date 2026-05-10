import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/truth-dare-sessions/[sessionId]
// Session detail with participants and request counts
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
        const { data: session, error } = await supabase
            .from("truth_dare_sessions")
            .select("*, room:rooms(id, host_id, title)")
            .eq("id", sessionId)
            .single();

        if (error || !session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Fetch participants
        const { data: participants } = await supabase
            .from("truth_dare_session_participants")
            .select("*, profile:profiles(full_name, username, avatar_url)")
            .eq("session_id", sessionId);

        // Fetch pending requests (for private sessions, only for creator)
        let pendingRequests: any[] = [];
        if (session.creator_id === user.id && session.is_private) {
            const { data: requests } = await supabase
                .from("room_join_requests")
                .select("*, profile:profiles(full_name, username, avatar_url)")
                .eq("session_id", sessionId)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            pendingRequests = requests || [];
        }

        // Fetch transactions for this session
        const { data: transactions } = await supabase
            .from("truth_dare_session_transactions")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: false });

        return NextResponse.json({
            session,
            participants: participants || [],
            pending_requests: pendingRequests,
            transactions: transactions || [],
            participant_count: (participants || []).length,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// PATCH /api/v1/rooms/truth-dare-sessions/[sessionId]
// Update session status (end/cancel)
// Body: { status: 'ended' | 'cancelled' }
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
        const { status } = body;

        if (!["ended", "cancelled"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // Verify ownership
        const { data: session } = await supabase
            .from("truth_dare_sessions")
            .select("*, room:rooms(id, host_id)")
            .eq("id", sessionId)
            .single();

        if (!session || (session.creator_id !== user.id && session.room?.host_id !== user.id)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Update this specific session
        const { error: updateError } = await supabase
            .from("truth_dare_sessions")
            .update({
                status,
                ended_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", sessionId);

        if (updateError) throw updateError;

        // Check if there are any remaining active/pending sessions for this room
        const { data: remainingSessions } = await supabase
            .from("truth_dare_sessions")
            .select("id")
            .eq("room_id", session.room_id)
            .in("status", ["active", "pending"])
            .neq("id", sessionId)
            .limit(1);

        // Only update game state and room status if no other sessions are active
        if (!remainingSessions || remainingSessions.length === 0) {
            await supabase
                .from("truth_dare_games")
                .update({ status: "ended", updated_at: new Date().toISOString() })
                .eq("room_id", session.room_id);

            await supabase
                .from("rooms")
                .update({ status: "ended" })
                .eq("id", session.room_id);

            // Broadcast session_ended to all connected fans for instant UI update
            try {
                const broadcastChannel = supabase.channel(`room:${session.room_id}`);
                await broadcastChannel.send({
                    type: 'broadcast',
                    event: 'session_ended',
                    payload: { roomId: session.room_id, sessionId, endedAt: new Date().toISOString() }
                });
                supabase.removeChannel(broadcastChannel);
            } catch (broadcastErr) {
                console.error("Failed to broadcast session_ended:", broadcastErr);
                // Non-fatal — fans will still catch it via postgres_changes
            }
        }

        return NextResponse.json({ success: true, message: `Session ${status}` });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
