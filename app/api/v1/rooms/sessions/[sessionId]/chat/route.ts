import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/sessions/[sessionId]/chat
// Fetch chat messages for a session
// ──────────────────────────────────────────────────
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const supabase = await createClient();

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "100");

        const { data: messages, error } = await supabase
            .from("room_session_messages")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true })
            .limit(limit);

        if (error) throw error;

        return NextResponse.json({ messages: messages || [] });
    } catch (err: any) {
        console.error("Fetch chat error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions/[sessionId]/chat
// Send a chat message
// Body: { message }
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
        const { message } = body;

        if (!message || !message.trim()) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Verify session is active
        const { data: session } = await supabase
            .from("room_sessions")
            .select("id, status")
            .eq("id", sessionId)
            .single();

        if (!session || session.status !== "active") {
            return NextResponse.json({ error: "Session is not active" }, { status: 400 });
        }

        // Verify user is a participant
        const { data: participant } = await supabase
            .from("room_session_participants")
            .select("id")
            .eq("session_id", sessionId)
            .eq("user_id", user.id)
            .single();

        if (!participant) {
            return NextResponse.json({ error: "You must join the session to chat" }, { status: 403 });
        }

        // Get user profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", user.id)
            .single();

        // Insert message
        const { data: msg, error: insertError } = await supabase
            .from("room_session_messages")
            .insert({
                session_id: sessionId,
                user_id: user.id,
                username: profile?.username || "Anonymous",
                avatar_url: profile?.avatar_url || null,
                message: message.trim().substring(0, 500), // max 500 chars
                is_system: false,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, message: msg });
    } catch (err: any) {
        console.error("Send chat error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
