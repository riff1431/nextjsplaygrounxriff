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

    // 2. Verify host ownership
    const { data: room } = await supabase
        .from('rooms')
        .select('host_id')
        .eq('id', roomId)
        .single();

    if (!room || room.host_id !== user.id) {
        return NextResponse.json({ error: "Only host can start group calls" }, { status: 403 });
    }

    try {
        // 3. End any previous active calls for this room (cleanup)
        await supabase
            .from('group_calls')
            .update({ status: 'ended', ended_at: new Date().toISOString() })
            .eq('room_id', roomId)
            .eq('status', 'active');

        // 4. Get active session to filter requests (scope to current session)
        const { data: activeSession } = await supabase
            .from('room_sessions')
            .select('id, started_at, created_at')
            .eq('room_id', roomId)
            .in('status', ['active', 'pending'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // 5. Query suga_activity_events for fans who voted in this session
        let reqQuery = supabase
            .from('suga_activity_events')
            .select('fan_id')
            .eq('room_id', roomId)
            .eq('type', 'group_vote');

        // Scope to current session by time
        const sessionStart = activeSession?.started_at || activeSession?.created_at;
        if (sessionStart) {
            reqQuery = reqQuery.gte('created_at', sessionStart);
        }

        const { data: requests, error: reqError } = await reqQuery;
        if (reqError) throw reqError;

        // Get unique fan IDs
        const fanIds = Array.from(new Set(requests?.map(r => r.fan_id) || []));
        
        console.log(`[SugaGroupCall] Starting sugar call. Session: ${activeSession?.id}. Participants: ${fanIds.length}`, fanIds);

        // 6. Generate Call details
        const callId = uuidv4();
        const agoraChannel = `group-call-${roomId}-sugar-${Date.now()}`;

        // 7. Persist call to DB (enables late-join + reconnection)
        const { error: insertError } = await supabase
            .from('group_calls')
            .insert({
                id: callId,
                room_id: roomId,
                creator_id: user.id,
                agora_channel: agoraChannel,
                participant_fan_ids: fanIds,
                type: 'sugar',
                status: 'active',
            });

        if (insertError) {
            console.error('[SugaGroupCall] Failed to persist call:', insertError);
            // Non-fatal: still proceed with broadcast
        }

        // 8. Broadcast to all connected fans in this room
        // Uses isolated channel name `group-call:${roomId}` to avoid collision
        console.log(`[SugaGroupCall] Broadcasting group_call_started to group-call:${roomId}`);
        await supabase.channel(`group-call:${roomId}`).send({
            type: 'broadcast',
            event: 'group_call_started',
            payload: {
                callId,
                roomId,
                creatorId: user.id,
                agoraChannel,
                participantFanIds: fanIds,
                type: 'sugar'
            }
        });

        return NextResponse.json({ 
            success: true, 
            callId, 
            agoraChannel, 
            participantFanIds: fanIds 
        });

    } catch (e: any) {
        console.error("Error starting suga group call:", e);
        return NextResponse.json({ error: e.message || "Failed to start group call" }, { status: 500 });
    }
}
