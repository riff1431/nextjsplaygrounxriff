import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    // 1. Auth and User Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Body Parser
    const body = await request.json();
    const { type } = body; // 'truth' | 'dare'

    if (!['truth', 'dare'].includes(type)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    try {
        // 3. Get active session to filter requests
        const { data: activeSession } = await supabase
            .from('truth_dare_sessions')
            .select('started_at')
            .eq('room_id', roomId)
            .in('status', ['active', 'pending'])
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

        let reqQuery = supabase
            .from('truth_dare_requests')
            .select('fan_id')
            .eq('room_id', roomId)
            .eq('type', `group_vote_${type}`);

        if (activeSession?.started_at) {
            reqQuery = reqQuery.gte('created_at', activeSession.started_at);
        }

        const { data: requests, error: reqError } = await reqQuery;

        if (reqError) throw reqError;

        // Get unique fan IDs
        const fanIds = Array.from(new Set(requests?.map(r => r.fan_id) || []));

        // 4. Generate Call details
        const callId = uuidv4();
        const agoraChannel = `group-call-${roomId}-${type}-${Date.now()}`;

        // 5. Broadcast to the room
        await supabase.channel(`room:${roomId}`).send({
            type: 'broadcast',
            event: 'group_call_started',
            payload: {
                callId,
                roomId,
                creatorId: user.id,
                agoraChannel,
                participantFanIds: fanIds,
                type
            }
        });

        return NextResponse.json({ 
            success: true, 
            callId, 
            agoraChannel, 
            participantFanIds: fanIds 
        });

    } catch (e: any) {
        console.error("Error starting group call:", e);
        return NextResponse.json({ error: e.message || "Failed to start group call" }, { status: 500 });
    }
}
