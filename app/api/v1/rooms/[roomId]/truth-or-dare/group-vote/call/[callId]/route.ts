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
        // Broadcast end event
        await supabase.channel(`room:${roomId}`).send({
            type: 'broadcast',
            event: 'group_call_ended',
            payload: { callId, roomId }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Error ending group call:", e);
        return NextResponse.json({ error: e.message || "Failed to end group call" }, { status: 500 });
    }
}
