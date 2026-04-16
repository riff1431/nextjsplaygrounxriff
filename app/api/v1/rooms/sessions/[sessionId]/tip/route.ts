import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

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

        // Payment with revenue split (85% creator / 15% platform)
        const splitResult = await applyRevenueSplit({
            supabase,
            fanUserId: user.id,
            creatorUserId: session.creator_id,
            grossAmount: amount,
            splitType: 'GLOBAL',
            description: `Tip in "${session.title}"`,
            roomId: session.room_id,
            relatedType: 'session_tip',
            relatedId: sessionId,
            earningsCategory: 'tips',
        });

        if (!splitResult.success) {
            return NextResponse.json({ error: splitResult.error || "Insufficient balance" }, { status: 402 });
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
            message: `💰 ${profile?.username || "A fan"} tipped €${amount}!`,
            is_system: true,
        });

        return NextResponse.json({
            success: true,
            amount,
            creatorShare: splitResult.creatorShare,
            platformShare: splitResult.platformShare,
            new_balance: splitResult.newBalance,
        });
    } catch (err: any) {
        console.error("Tip error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
