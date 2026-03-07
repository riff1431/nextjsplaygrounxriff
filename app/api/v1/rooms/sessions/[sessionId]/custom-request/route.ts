import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions/[sessionId]/custom-request
// Fan sends a paid custom request during session
// Body: { content, amount }
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
        const { content, amount: rawAmount } = body;
        const amount = Number(rawAmount);

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: "Request content is required" }, { status: 400 });
        }
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
        }

        // Get session
        const { data: session } = await supabase
            .from("room_sessions")
            .select("id, creator_id, room_id, title, status, room_type")
            .eq("id", sessionId)
            .single();

        if (!session || session.status !== "active") {
            return NextResponse.json({ error: "Session is not active" }, { status: 400 });
        }

        // Check if custom requests are enabled
        const { data: settings } = await supabase
            .from("room_settings")
            .select("custom_requests_enabled")
            .eq("room_type", session.room_type)
            .single();

        if (settings && !settings.custom_requests_enabled) {
            return NextResponse.json({ error: "Custom requests are disabled for this room" }, { status: 403 });
        }

        if (session.creator_id === user.id) {
            return NextResponse.json({ error: "Cannot send request to yourself" }, { status: 400 });
        }

        // Payment
        const { data: payResult, error: payError } = await supabase.rpc("transfer_funds", {
            p_from_user_id: user.id,
            p_to_user_id: session.creator_id,
            p_amount: amount,
            p_description: `Custom request in "${session.title}"`,
            p_room_id: session.room_id,
            p_related_type: "session_custom_request",
            p_related_id: sessionId,
        });

        if (payError) throw payError;
        const result = payResult as any;
        if (!result?.success) {
            return NextResponse.json({ error: result?.error || "Insufficient balance" }, { status: 402 });
        }

        // Get fan profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single();

        // Record custom request
        const { data: req, error: insertError } = await supabase
            .from("room_session_custom_requests")
            .insert({
                session_id: sessionId,
                fan_id: user.id,
                fan_name: profile?.username || "Anonymous",
                content: content.trim().substring(0, 1000),
                amount,
                status: "pending",
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // System chat message
        await supabase.from("room_session_messages").insert({
            session_id: sessionId,
            user_id: user.id,
            username: "System",
            message: `📩 ${profile?.username || "A fan"} sent a $${amount} request!`,
            is_system: true,
        });

        return NextResponse.json({
            success: true,
            request: req,
            new_balance: result.new_balance,
        });
    } catch (err: any) {
        console.error("Custom request error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/sessions/[sessionId]/custom-request
// Get custom requests for a session (creator sees all, fan sees own)
// ──────────────────────────────────────────────────
export async function GET(
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
        const { data: requests, error } = await supabase
            .from("room_session_custom_requests")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ requests: requests || [] });
    } catch (err: any) {
        console.error("List custom requests error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
