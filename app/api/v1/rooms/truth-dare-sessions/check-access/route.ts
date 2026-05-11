import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/rooms/truth-dare-sessions/check-access?roomId=X&sessionId=Y
 * Fan-facing: check session status and user access for a room.
 * Uses admin client to bypass RLS on truth_dare_sessions.
 * Returns: { sessionStatus, access, sessionInfo, hostId, hostProfile, requestStatus }
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const sessionIdParam = searchParams.get("sessionId");

    if (!roomId) {
        return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }

    try {
        // 1. Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();

        // 2. Get game state (truth_dare_games — singleton per room)
        const { data: game } = await admin
            .from("truth_dare_games")
            .select("*, room:rooms(host_id)")
            .eq("room_id", roomId)
            .maybeSingle();

        // 3. Get latest active/pending session from truth_dare_sessions
        const { data: latestSession } = await admin
            .from("truth_dare_sessions")
            .select("id, title, description, is_private, price, status, creator_id, room_id, started_at, created_at")
            .eq("room_id", roomId)
            .in("status", ["active", "pending"])
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        // 4. Determine session status
        const gameStatus = game?.status;
        const sessionTableStatus = latestSession?.status;

        // If both sources say ended/missing
        if ((!game || gameStatus === "ended") && !latestSession) {
            return NextResponse.json({
                sessionStatus: "ended",
                access: "locked",
                sessionInfo: null,
                hostId: null,
                hostProfile: null,
                requestStatus: null,
            });
        }

        // Prefer session table if game table is stale
        const effectiveStatus =
            gameStatus === "ended" || !game
                ? sessionTableStatus || "ended"
                : gameStatus;

        if (effectiveStatus === "ended") {
            return NextResponse.json({
                sessionStatus: "ended",
                access: "locked",
                sessionInfo: null,
                hostId: null,
                hostProfile: null,
                requestStatus: null,
            });
        }

        // 5. Determine host ID
        let hostId = game?.room?.host_id || latestSession?.creator_id || null;
        if (!hostId) {
            const { data: roomData } = await admin
                .from("rooms")
                .select("host_id")
                .eq("id", roomId)
                .single();
            hostId = roomData?.host_id || null;
        }

        // 6. Build session info
        const sessionInfo = {
            title: game?.session_title || latestSession?.title || "Truth or Dare",
            desc: game?.session_description || latestSession?.description || null,
            price: Number(game?.unlock_price ?? latestSession?.price ?? 0),
            isPrivate: game?.is_private ?? latestSession?.is_private ?? false,
        };

        // 7. Fetch host profile and collab creators
        let hostProfile = null;
        let collabCreators: any[] = [];
        
        if (hostId) {
            const { data: hp } = await admin
                .from("profiles")
                .select("avatar_url, full_name, username")
                .eq("id", hostId)
                .single();
            hostProfile = hp;
        }

        const activeSessionId = latestSession?.id || sessionIdParam;

        if (activeSessionId) {
            const { data: participants } = await admin
                .from("room_session_participants")
                .select("user_id")
                .eq("session_id", activeSessionId)
                .eq("role", "invited_creator");

            if (participants && participants.length > 0) {
                const userIds = participants.map(p => p.user_id);
                const { data: profiles } = await admin
                    .from("profiles")
                    .select("id, full_name, username, avatar_url")
                    .in("id", userIds);
                
                if (profiles) {
                    collabCreators = profiles.map(p => ({
                        id: p.id,
                        name: p.full_name || p.username || "Creator",
                        avatarUrl: p.avatar_url
                    }));
                }
            }
        }

        // 8. Check access if user is authenticated
        let access: "granted" | "locked" = "locked";
        let requestStatus: string | null = null;

        if (user) {
            // A. Check if user is a session participant
            if (activeSessionId) {
                const { data: participant } = await admin
                    .from("truth_dare_session_participants")
                    .select("id")
                    .eq("session_id", activeSessionId)
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (participant) {
                    access = "granted";
                }
            }

            // B. Check truth_dare_unlocks (strict session-scoped — no legacy fallback)
            // Each session is unique: old entries/unlocks do NOT grant access to new sessions
            if (access !== "granted" && activeSessionId) {
                const { data: unlock } = await admin
                    .from("truth_dare_unlocks")
                    .select("id")
                    .eq("room_id", roomId)
                    .eq("fan_id", user.id)
                    .eq("session_id", activeSessionId)
                    .maybeSingle();
                if (unlock) access = "granted";
            }

            // C. Check truth_dare_entries (strict session-scoped — no legacy fallback)
            if (access !== "granted" && activeSessionId) {
                const { data: entry } = await admin
                    .from("truth_dare_entries")
                    .select("id")
                    .eq("room_id", roomId)
                    .eq("fan_id", user.id)
                    .eq("session_id", activeSessionId)
                    .maybeSingle();
                if (entry) access = "granted";
            }

            // D. Check request status for private sessions
            const isPrivate = sessionInfo.isPrivate;
            if (isPrivate && activeSessionId) {
                const { data: req } = await admin
                    .from("room_join_requests")
                    .select("status")
                    .eq("session_id", activeSessionId)
                    .eq("user_id", user.id)
                    .maybeSingle();
                requestStatus = req?.status || "none";
            } else if (!isPrivate) {
                requestStatus = "approved";
            }

            // E. Check if user is the host (creator always has access)
            if (user.id === hostId) {
                access = "granted";
            }
        }

        return NextResponse.json({
            sessionStatus: effectiveStatus,
            access,
            sessionInfo,
            hostId,
            hostProfile,
            requestStatus,
            sessionId: activeSessionId,
            sessionStartedAt: latestSession?.started_at || latestSession?.created_at || null,
            collabCreators,
        });
    } catch (err: any) {
        console.error("Check access error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
