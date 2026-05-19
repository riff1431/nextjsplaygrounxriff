import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; callId: string }> }
) {
    const params = await props.params;
    const { roomId, callId } = params;
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action !== "end") {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    try {
        // 2. Mark call as ended in DB (allows fans to know the call is over on reconnect)
        await supabase
            .from('group_calls')
            .update({ status: 'ended', ended_at: new Date().toISOString() })
            .eq('id', callId)
            .eq('room_id', roomId)
            .eq('creator_id', user.id);

        // 3. Broadcast end event to all connected clients
        // Uses isolated channel name to match the fan-side useGroupCall subscription.
        await supabase.channel(`group-call:${roomId}`).send({
            type: 'broadcast',
            event: 'group_call_ended',
            payload: { callId, roomId }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Error ending suga group call:", e);
        return NextResponse.json({ error: e.message || "Failed to end group call" }, { status: 500 });
    }
}
