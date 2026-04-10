import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/x-chat/session
 * Start or end a metered chat session.
 * Body: { action: 'start' | 'end' }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { action } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    if (action === "start") {
        // Check for existing active session
        const { data: existing } = await supabase
            .from("x_chat_sessions")
            .select("id")
            .eq("room_id", roomId)
            .eq("fan_id", user.id)
            .eq("status", "active")
            .single();

        if (existing) {
            return NextResponse.json({ success: true, session: existing, message: "Session already active" });
        }

        const { data: session, error } = await supabase
            .from("x_chat_sessions")
            .insert({
                room_id: roomId, fan_id: user.id, creator_id: room.host_id,
                rate_per_min: 2, status: "active",
            })
            .select().single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, session });
    }

    if (action === "end") {
        // Find active session
        const { data: session } = await supabase
            .from("x_chat_sessions")
            .select("*")
            .eq("room_id", roomId)
            .eq("fan_id", user.id)
            .eq("status", "active")
            .single();

        if (!session) return NextResponse.json({ error: "No active session" }, { status: 404 });

        const now = new Date();
        const startTime = new Date(session.start_time);
        const minutes = Math.ceil((now.getTime() - startTime.getTime()) / 60000);
        const totalCharged = minutes * (session.rate_per_min || 2);

        // Payment with revenue split for metered session
        if (totalCharged > 0) {
            const splitResult = await applyRevenueSplit({
                supabase,
                fanUserId: user.id,
                creatorUserId: room.host_id,
                grossAmount: totalCharged,
                splitType: 'GLOBAL',
                description: `X Chat session (${minutes} min)`,
                roomId,
                relatedType: 'xchat_session',
                relatedId: session.id,
                earningsCategory: 'entry_fees',
            });

            if (!splitResult.success) {
                return NextResponse.json({ error: splitResult.error || "Payment failed" }, { status: 400 });
            }
        }

        // Update session as ended
        const { data: updated, error } = await supabase
            .from("x_chat_sessions")
            .update({ status: "ended", end_time: now.toISOString(), total_charged: totalCharged })
            .eq("id", session.id)
            .select().single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, session: updated, minutes, totalCharged });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
