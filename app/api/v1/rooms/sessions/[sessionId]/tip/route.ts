import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions/[sessionId]/tip
// Fan sends a tip to creator during session
// Body: { amount }
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
        const amount = Number(body.amount);

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Valid tip amount required" }, { status: 400 });
        }

        // Get session
        const { data: session } = await supabase
            .from("room_sessions")
            .select("id, creator_id, room_id, title, status")
            .eq("id", sessionId)
            .single();

        if (!session || session.status !== "active") {
            return NextResponse.json({ error: "Session is not active" }, { status: 400 });
        }

        if (session.creator_id === user.id) {
            return NextResponse.json({ error: "Cannot tip yourself" }, { status: 400 });
        }

        // Payment via transfer_funds
        const { data: payResult, error: payError } = await supabase.rpc("transfer_funds", {
            p_from_user_id: user.id,
            p_to_user_id: session.creator_id,
            p_amount: amount,
            p_description: `Tip in "${session.title}"`,
            p_room_id: session.room_id,
            p_related_type: "session_tip",
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

        // Record tip
        const { error: tipError } = await supabase.from("room_session_tips").insert({
            session_id: sessionId,
            fan_id: user.id,
            fan_name: profile?.username || "Anonymous",
            amount,
        });

        if (tipError) throw tipError;

        // System message in chat
        await supabase.from("room_session_messages").insert({
            session_id: sessionId,
            user_id: user.id,
            username: "System",
            message: `💰 ${profile?.username || "A fan"} tipped $${amount}!`,
            is_system: true,
        });

        return NextResponse.json({
            success: true,
            amount,
            new_balance: result.new_balance,
        });
    } catch (err: any) {
        console.error("Tip error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
