import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/sessions/browse?room_type=flash-drop
// Fan-facing: list active sessions for a room type
// ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const roomType = searchParams.get("room_type");

    const { data: { user } } = await supabase.auth.getUser();

    try {
        // 1. Fetch active sessions
        let query = supabase
            .from("room_sessions")
            .select(`
                id, title, description, session_type, entry_fee,
                status, started_at, creator_id, room_id, room_type, viewer_count
            `)
            .eq("status", "active")
            .is("ended_at", null)
            .order("started_at", { ascending: false });

        if (roomType) {
            query = query.eq("room_type", roomType);
        }

        const { data: rawSessions, error } = await query;
        if (error) throw error;

        // 2. Cross-reference with rooms table: only sessions whose room is 'live'
        const roomIds = [...new Set((rawSessions || []).map((s: any) => s.room_id).filter(Boolean))];
        let liveRoomIds = new Set<string>();

        if (roomIds.length > 0) {
            const { data: liveRooms } = await supabase
                .from("rooms")
                .select("id")
                .in("id", roomIds)
                .eq("status", "live");

            if (liveRooms) {
                for (const r of liveRooms) liveRoomIds.add(r.id);
            }
        }

        const liveFiltered = (rawSessions || []).filter((s: any) => liveRoomIds.has(s.room_id));

        // 3. Deduplicate: keep only newest session per room
        const seenRooms = new Set<string>();
        const activeSessions = liveFiltered.filter((s: any) => {
            if (seenRooms.has(s.room_id)) return false;
            seenRooms.add(s.room_id);
            return true;
        });

        // 4. Fetch creator profiles
        const creatorIds = [...new Set(activeSessions.map((s: any) => s.creator_id).filter(Boolean))];
        let profileMap: Record<string, any> = {};

        if (creatorIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, username, avatar_url")
                .in("id", creatorIds);

            if (profiles) {
                for (const p of profiles) {
                    profileMap[p.id] = { full_name: p.full_name, username: p.username, avatar_url: p.avatar_url };
                }
            }
        }

        // 5. Merge creator info
        const sessions = activeSessions.map((s: any) => ({
            ...s,
            is_private: s.session_type === "private",
            creator: profileMap[s.creator_id] || null,
        }));

        // 6. Filter: show public + private where user has access
        let filteredSessions = sessions.filter((s: any) => !s.is_private);
        let userRequests: Record<string, string> = {};
        let userParticipation = new Set<string>();

        if (user) {
            const allSessionIds = sessions.map((s: any) => s.id);

            if (allSessionIds.length > 0) {
                // Check join requests
                const { data: requests } = await supabase
                    .from("room_join_requests")
                    .select("session_id, status")
                    .eq("user_id", user.id)
                    .in("session_id", allSessionIds);

                if (requests) {
                    for (const req of requests) {
                        userRequests[req.session_id] = req.status;
                        if (req.status === "approved") {
                            const sesh = sessions.find((s: any) => s.id === req.session_id);
                            if (sesh) filteredSessions.push(sesh);
                        }
                    }
                }

                // Check participations
                const { data: participations } = await supabase
                    .from("room_session_participants")
                    .select("session_id")
                    .eq("user_id", user.id)
                    .in("session_id", allSessionIds);

                if (participations) {
                    for (const p of participations) userParticipation.add(p.session_id);
                }

                // Include private sessions with pending requests
                const pendingSessions = sessions.filter(
                    (s: any) => s.is_private && userRequests[s.id] === "pending"
                );
                filteredSessions = [...filteredSessions, ...pendingSessions];
            }
        }

        // 7. De-duplicate
        const seen = new Set<string>();
        filteredSessions = filteredSessions.filter((s: any) => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        });

        // 8. Get participant counts
        const sessionIds = filteredSessions.map((s: any) => s.id);
        let participantCounts: Record<string, number> = {};

        if (sessionIds.length > 0) {
            const { data: participants } = await supabase
                .from("room_session_participants")
                .select("session_id")
                .in("session_id", sessionIds);

            if (participants) {
                for (const p of participants) {
                    participantCounts[p.session_id] = (participantCounts[p.session_id] || 0) + 1;
                }
            }
        }

        // 9. Enrich
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
