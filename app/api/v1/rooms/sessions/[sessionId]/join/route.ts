import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions/[sessionId]/join
// Fan joins a session (public or approved private) by paying entry fee
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
        // 1. Get session
        const { data: session, error: sessionError } = await supabase
            .from("room_sessions")
            .select("*, creator:profiles!room_sessions_creator_id_fkey(id, username)")
            .eq("id", sessionId)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (session.status !== "active") {
            return NextResponse.json({ error: "Session is no longer active" }, { status: 400 });
        }

        if (session.creator_id === user.id) {
            return NextResponse.json({ error: "You are the creator of this session" }, { status: 400 });
        }

        // 2. Check if already joined
        const { data: existing } = await supabase
            .from("room_session_participants")
            .select("id")
            .eq("session_id", sessionId)
            .eq("user_id", user.id)
            .single();

        if (existing) {
            return NextResponse.json({ success: true, message: "Already joined", already_joined: true });
        }

        // 3. For private sessions, verify approval
        if (session.session_type === "private") {
            const { data: joinReq } = await supabase
                .from("room_join_requests")
                .select("status")
                .eq("session_id", sessionId)
                .eq("user_id", user.id)
                .single();

            if (!joinReq || joinReq.status !== "approved") {
                return NextResponse.json({
                    error: "You need creator approval to join this private session",
                }, { status: 403 });
            }
        }

        // 4. Payment — deduct entry fee from fan wallet, credit creator
        const entryFee = Number(session.entry_fee) || 0;
        if (entryFee > 0) {
            const { data: payResult, error: payError } = await supabase.rpc("transfer_funds", {
                p_from_user_id: user.id,
                p_to_user_id: session.creator_id,
                p_amount: entryFee,
                p_description: `Entry fee: ${session.title}`,
                p_room_id: session.room_id,
                p_related_type: "session_entry",
                p_related_id: sessionId,
            });

            if (payError) throw payError;

            const result = payResult as any;
            if (!result?.success) {
                return NextResponse.json({
                    error: result?.error || "Payment failed — insufficient balance",
                }, { status: 402 });
            }
        }

        // 5. Add fan as participant
        const { error: joinError } = await supabase.from("room_session_participants").insert({
            session_id: sessionId,
            user_id: user.id,
            role: "fan",
        });

        if (joinError) throw joinError;

        // 6. Increment viewer count
        await supabase
            .from("room_sessions")
            .update({ viewer_count: (session.viewer_count || 0) + 1 })
            .eq("id", sessionId);

        // 7. Notify creator
        const { data: fanProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single();

        await supabase.from("notifications").insert({
            user_id: session.creator_id,
            actor_id: user.id,
            type: "fan_joined_session",
            message: `${fanProfile?.username || "A fan"} joined your session "${session.title}"`,
            metadata: { session_id: sessionId, amount: entryFee },
        });

        return NextResponse.json({
            success: true,
            session_id: sessionId,
            agora_channel: session.agora_channel,
            entry_fee_paid: entryFee,
        });
    } catch (err: any) {
        console.error("Join session error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
