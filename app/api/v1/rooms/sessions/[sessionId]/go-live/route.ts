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
            .select("id, creator_id, status, live_started_at")
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
