import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH: Fan responds (accept/reject) or either party ends call
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; callId: string }> }
) {
    const params = await props.params;
    const { roomId, callId } = params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // "accept" | "reject" | "end"

    // Fetch call
    const { data: call } = await supabase
        .from("suga_private_calls")
        .select("*")
        .eq("id", callId)
        .eq("room_id", roomId)
        .single();

    if (!call) {
        return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Verify participant
    if (call.fan_id !== user.id && call.creator_id !== user.id) {
        return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    if (action === "accept" && call.fan_id === user.id) {
        // Fan accepts the ringing call → make it active
        const now = new Date().toISOString();
        await supabase
            .from("suga_private_calls")
            .update({ status: "active", started_at: now })
            .eq("id", callId);

        await supabase.channel(`room:${roomId}`).send({
            type: "broadcast",
            event: "private_call_active",
            payload: {
                callId,
                fanId: call.fan_id,
                creatorId: call.creator_id,
                agoraChannel: call.agora_channel,
                duration: call.duration_seconds,
                startedAt: now,
            },
        });

        return NextResponse.json({ success: true, status: "active", startedAt: now });

    } else if (action === "reject" && call.fan_id === user.id) {
        // Fan rejects the ringing call
        await supabase
            .from("suga_private_calls")
            .update({ status: "rejected_by_fan", ended_at: new Date().toISOString() })
            .eq("id", callId);

        await supabase.channel(`room:${roomId}`).send({
            type: "broadcast",
            event: "private_call_rejected",
            payload: { callId, creatorId: call.creator_id },
        });

        return NextResponse.json({ success: true, status: "rejected_by_fan" });

    } else if (action === "end") {
        // Either party ends the call
        await supabase
            .from("suga_private_calls")
            .update({ status: "ended", ended_at: new Date().toISOString() })
            .eq("id", callId);

        await supabase.channel(`room:${roomId}`).send({
            type: "broadcast",
            event: "private_call_ended",
            payload: { callId, fanId: call.fan_id, creatorId: call.creator_id },
        });

        return NextResponse.json({ success: true, status: "ended" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
