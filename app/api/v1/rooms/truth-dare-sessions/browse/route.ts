import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/truth-dare-sessions/browse
// Fan-facing: list active sessions with creator info
// ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    try {
        // Fetch active sessions (public ones, + any private ones user has access to)
        const { data: sessions, error } = await supabase
            .from("truth_dare_sessions")
            .select(`
                id, title, description, session_type, is_private, price,
                status, started_at, creator_id, room_id,
                creator:profiles!truth_dare_sessions_creator_id_fkey(full_name, username, avatar_url)
            `)
            .eq("status", "active")
            .order("started_at", { ascending: false });

        if (error) throw error;

        // Filter: public sessions + private sessions where user has approved request
        let filteredSessions = (sessions || []).filter((s: any) => !s.is_private);
        let userRequests: Record<string, string> = {};  // sessionId -> request_status
        let userParticipation: Set<string> = new Set();

        if (user) {
            // Get user's join requests across all sessions
            const roomIds = (sessions || []).map((s: any) => s.room_id);
            if (roomIds.length > 0) {
                const { data: requests } = await supabase
                    .from("room_requests")
                    .select("room_id, status")
                    .eq("user_id", user.id)
                    .in("room_id", roomIds);

                if (requests) {
                    for (const req of requests) {
                        // Map room_id back to session
                        const session = (sessions || []).find((s: any) => s.room_id === req.room_id);
                        if (session) {
                            userRequests[session.id] = req.status;
                            if (req.status === "approved") {
                                filteredSessions.push(session);
                            }
                        }
                    }
                }
            }

            // Get user's existing participations
            const sessionIds = (sessions || []).map((s: any) => s.id);
            if (sessionIds.length > 0) {
                const { data: participations } = await supabase
                    .from("truth_dare_session_participants")
                    .select("session_id")
                    .eq("user_id", user.id)
                    .in("session_id", sessionIds);

                if (participations) {
                    for (const p of participations) {
                        userParticipation.add(p.session_id);
                    }
                }
            }

            // Also include private sessions where user has pending request
            const pendingSessions = (sessions || []).filter(
                (s: any) => s.is_private && userRequests[s.id] === "pending"
            );
            filteredSessions = [...filteredSessions, ...pendingSessions];
        }

        // De-duplicate
        const seen = new Set<string>();
        filteredSessions = filteredSessions.filter((s: any) => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        });

        // Get participant counts
        const sessionIds = filteredSessions.map((s: any) => s.id);
        let participantCounts: Record<string, number> = {};

        if (sessionIds.length > 0) {
            const { data: participants } = await supabase
                .from("truth_dare_session_participants")
                .select("session_id")
                .in("session_id", sessionIds);

            if (participants) {
                for (const p of participants) {
                    participantCounts[p.session_id] = (participantCounts[p.session_id] || 0) + 1;
                }
            }
        }

        // Enrich
        const enriched = filteredSessions.map((s: any) => ({
            ...s,
            participant_count: participantCounts[s.id] || 0,
            user_request_status: userRequests[s.id] || null,
            user_joined: userParticipation.has(s.id),
        }));

        return NextResponse.json({ sessions: enriched });
    } catch (err: any) {
        console.error("Browse sessions error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
