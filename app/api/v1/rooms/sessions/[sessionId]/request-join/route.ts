import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions/[sessionId]/request-join
// Fan requests to join a private session
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
        // 1. Verify session exists and is private
        const { data: session, error: sessionError } = await supabase
            .from("room_sessions")
            .select("id, session_type, creator_id, title, status")
            .eq("id", sessionId)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (session.status !== "active") {
            return NextResponse.json({ error: "Session is no longer active" }, { status: 400 });
        }

        if (session.session_type !== "private") {
            return NextResponse.json({ error: "This is a public session — join directly" }, { status: 400 });
        }

        if (session.creator_id === user.id) {
            return NextResponse.json({ error: "You are the creator of this session" }, { status: 400 });
        }

        // 2. Check existing request
        const { data: existing } = await supabase
            .from("room_join_requests")
            .select("id, status")
            .eq("session_id", sessionId)
            .eq("user_id", user.id)
            .single();

        if (existing) {
            return NextResponse.json({
                success: true,
                request_id: existing.id,
                status: existing.status,
                message: `Request already ${existing.status}`,
            });
        }

        // 3. Create join request
        const { data: joinRequest, error: insertError } = await supabase
            .from("room_join_requests")
            .insert({
                session_id: sessionId,
                user_id: user.id,
                status: "pending",
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 4. Notify creator
        const { data: fanProfile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", user.id)
            .single();

        await supabase.from("notifications").insert({
            user_id: session.creator_id,
            actor_id: user.id,
            type: "join_request",
            message: `${fanProfile?.username || "A fan"} wants to join "${session.title}"`,
            metadata: {
                session_id: sessionId,
                request_id: joinRequest.id,
                fan_username: fanProfile?.username,
                fan_avatar_url: fanProfile?.avatar_url,
            },
        });

        return NextResponse.json({
            success: true,
            request_id: joinRequest.id,
            status: "pending",
        });
    } catch (err: any) {
        console.error("Request join error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
