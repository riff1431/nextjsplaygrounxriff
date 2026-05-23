import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// PATCH /api/v1/rooms/sessions/[sessionId]/go-live
// Creator marks a session as "live" — sets live_started_at
// Idempotent: if already live, returns existing timestamp
// ──────────────────────────────────────────────────
export async function PATCH(
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
        // Verify creator owns this session
        const { data: session } = await supabase
            .from("room_sessions")
            .select("id, creator_id, status, live_started_at, room_type")
            .eq("id", sessionId)
            .single();

        if (!session || session.creator_id !== user.id) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        if (session.status === "ended") {
            return NextResponse.json({ error: "Session has already ended" }, { status: 400 });
        }

        // Idempotent: if already live, return existing timestamp
        if (session.live_started_at) {
            return NextResponse.json({
                success: true,
                live_started_at: session.live_started_at,
                already_live: true,
            });
        }

        // Set live_started_at
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
            .from("room_sessions")
            .update({ live_started_at: now })
            .eq("id", sessionId);

        if (updateError) throw updateError;

        // Restart timers for all active flash drops when going live
        if (session.room_type === "flash-drop") {
            try {
                const { data: drops } = await supabase
                    .from("flash_drops")
                    .select("id, created_at, ends_at, status")
                    .eq("session_id", sessionId)
                    .neq("status", "Ended");

                if (drops && drops.length > 0) {
                    const nowMs = new Date(now).getTime();
                    for (const drop of drops) {
                        let durationMs = 15 * 60 * 1000; // 15 mins default
                        if (drop.ends_at && drop.created_at) {
                            const diff = new Date(drop.ends_at).getTime() - new Date(drop.created_at).getTime();
                            if (diff > 0) {
                                durationMs = diff;
                            }
                        }
                        const newEndsAt = new Date(nowMs + durationMs).toISOString();
                        await supabase
                            .from("flash_drops")
                            .update({
                                ends_at: newEndsAt,
                                status: "Live"
                            })
                            .eq("id", drop.id);
                    }
                }
            } catch (dropErr) {
                console.error("Failed to restart flash drop timers on go-live:", dropErr);
            }
        }

        return NextResponse.json({
            success: true,
            live_started_at: now,
            already_live: false,
        });
    } catch (err: any) {
        console.error("Go-live error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
