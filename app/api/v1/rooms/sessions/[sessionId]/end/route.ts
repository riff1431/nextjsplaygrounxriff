import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions/[sessionId]/end
// Creator or Admin ends a session
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
        // Use admin client to bypass RLS for reads & writes
        const adminDb = createAdminClient();

        // Fetch session
        const { data: session, error: fetchError } = await adminDb
            .from("room_sessions")
            .select("id, creator_id, room_id, title, status")
            .eq("id", sessionId)
            .single();

        if (fetchError || !session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Authorize: creator OR admin
        const isCreator = session.creator_id === user.id;
        let isAdmin = false;
        if (!isCreator) {
            const { data: profile } = await adminDb
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();
            isAdmin = profile?.role === "admin";
        }

        if (!isCreator && !isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        if (session.status === "ended") {
            return NextResponse.json({ success: true, message: "Session already ended" });
        }

        // End session (using admin client to bypass RLS)
        const { error: updateError } = await adminDb
            .from("room_sessions")
            .update({
                status: "ended",
                ended_at: new Date().toISOString(),
            })
            .eq("id", sessionId);

        if (updateError) throw updateError;

        // Set room status to offline (if no other active sessions)
        const { data: otherActive } = await adminDb
            .from("room_sessions")
            .select("id")
            .eq("room_id", session.room_id)
            .eq("status", "active")
            .neq("id", sessionId)
            .limit(1);

        if (!otherActive || otherActive.length === 0) {
            await adminDb.from("rooms").update({ status: "offline" }).eq("id", session.room_id);
        }

        // System message in chat
        await adminDb.from("room_session_messages").insert({
            session_id: sessionId,
            user_id: user.id,
            username: "System",
            message: isAdmin
                ? "Session has been ended by an administrator. 🛑"
                : "Session has ended. Thanks for watching! 🎬",
            is_system: true,
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("End session error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
