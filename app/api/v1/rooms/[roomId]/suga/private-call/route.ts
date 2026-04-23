import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST: Fan creates a private 1-on-1 call request
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, fanName } = body;

    // Get room to find creator
    const { data: room } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", roomId)
        .single();

    if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Fetch duration from room_settings
    const { data: settings } = await supabase
        .from("room_settings")
        .select("private_1on1_duration_seconds")
        .eq("room_type", "suga-4-u")
        .single();

    const duration = settings?.private_1on1_duration_seconds || 60;

    // Generate unique private channel name
    const callId = crypto.randomUUID();
    const agoraChannel = `private_1on1_${callId}`;

    // Create the private call record
    const { data: call, error } = await supabase
        .from("suga_private_calls")
        .insert({
            id: callId,
            room_id: roomId,
            request_id: requestId || null,
            fan_id: user.id,
            creator_id: room.host_id,
            fan_name: fanName || "Fan",
            status: "pending",
            agora_channel: agoraChannel,
            duration_seconds: duration,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Broadcast to the room channel so creator receives notification
    await supabase.channel(`room:${roomId}`).send({
        type: "broadcast",
        event: "private_call_request",
        payload: {
            callId: call.id,
            fanId: user.id,
            fanName: fanName || "Fan",
            duration,
            agoraChannel,
        },
    });

    return NextResponse.json({ success: true, callId: call.id, agoraChannel, duration });
}

// PATCH: Creator responds to a call (accept/decline)
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { callId, action } = body; // action: "accept" | "decline"

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

    if (call.creator_id !== user.id) {
        return NextResponse.json({ error: "Only the creator can respond" }, { status: 403 });
    }

    if (action === "accept") {
        // Update status to ringing (waiting for fan to accept video)
        await supabase
            .from("suga_private_calls")
            .update({ status: "ringing" })
            .eq("id", callId);

        // Broadcast to fan
        await supabase.channel(`room:${roomId}`).send({
            type: "broadcast",
            event: "private_call_ringing",
            payload: {
                callId,
                fanId: call.fan_id,
                creatorId: call.creator_id,
                agoraChannel: call.agora_channel,
                duration: call.duration_seconds,
            },
        });

        return NextResponse.json({ success: true, status: "ringing" });
    } else {
        // Decline
        await supabase
            .from("suga_private_calls")
            .update({ status: "declined", ended_at: new Date().toISOString() })
            .eq("id", callId);

        await supabase.channel(`room:${roomId}`).send({
            type: "broadcast",
            event: "private_call_declined",
            payload: { callId, fanId: call.fan_id },
        });

        return NextResponse.json({ success: true, status: "declined" });
    }
}
