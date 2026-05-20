import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions/end-all
// Admin-only: Force end ALL active sessions
// Body: { room_type?: string } — optional filter by room type
// ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const adminDb = createAdminClient();
    const { data: profile } = await adminDb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const { room_type } = body as { room_type?: string };

        // 1. Find all active sessions (optionally filtered by room_type)
        let query = adminDb
            .from("room_sessions")
            .select("id, room_id, title, creator_id")
            .eq("status", "active");

        if (room_type) {
            query = query.eq("room_type", room_type);
        }

        const { data: activeSessions, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        if (!activeSessions || activeSessions.length === 0) {
            return NextResponse.json({ success: true, ended_count: 0, message: "No active sessions to end" });
        }

        const sessionIds = activeSessions.map((s) => s.id);
        const affectedRoomIds = [...new Set(activeSessions.map((s) => s.room_id))];

        // 2. End all matching sessions
        const { error: updateError } = await adminDb
            .from("room_sessions")
            .update({
                status: "ended",
                ended_at: new Date().toISOString(),
            })
            .in("id", sessionIds);

        if (updateError) throw updateError;

        // 3. For each affected room, check if it still has active sessions — if not, set offline
        for (const roomId of affectedRoomIds) {
            const { data: remaining } = await adminDb
                .from("room_sessions")
                .select("id")
                .eq("room_id", roomId)
                .eq("status", "active")
                .limit(1);

            if (!remaining || remaining.length === 0) {
                await adminDb.from("rooms").update({ status: "offline" }).eq("id", roomId);
            }
        }

        // 4. Post system messages to each ended session
        const messages = sessionIds.map((sid) => ({
            session_id: sid,
            user_id: user.id,
            username: "System",
            message: "Session has been ended by an administrator. 🛑",
            is_system: true,
        }));

        await adminDb.from("room_session_messages").insert(messages);

        // 5. Also end any active truth_dare_sessions if they exist
        try {
            let tdQuery = adminDb
                .from("truth_dare_sessions")
                .select("id, room_id")
                .in("status", ["active", "pending"]);

            if (room_type === "truth-or-dare") {
                // Only end T/D sessions if explicitly targeting that type
            } else if (room_type) {
                // If filtering by a non-T/D type, skip T/D sessions
                tdQuery = null as any;
            }

            if (tdQuery) {
                const { data: tdSessions } = await tdQuery;
                if (tdSessions && tdSessions.length > 0) {
                    const tdIds = tdSessions.map((s: any) => s.id);
                    await adminDb
                        .from("truth_dare_sessions")
                        .update({
                            status: "ended",
                            ended_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .in("id", tdIds);
                }
            }
        } catch {
            // Non-fatal: truth_dare_sessions table might not exist
        }

        return NextResponse.json({
            success: true,
            ended_count: sessionIds.length,
            message: `Successfully ended ${sessionIds.length} session(s)`,
        });
    } catch (err: any) {
        console.error("End all sessions error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
