
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { roomId } = await params;

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { action, title, description, isPrivate, price } = body;

        // 2. Verify Room Access — host OR accepted collab creator
        const { data: room } = await admin
            .from('rooms')
            .select('host_id')
            .eq('id', roomId)
            .maybeSingle();

        if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        const isRoomHost = room.host_id === user.id;

        // If not the host, check if this user is an accepted collab creator for this room
        let isCollabCreator = false;
        if (!isRoomHost) {
            const { data: invite } = await admin
                .from('creator_invite_splits')
                .select('id')
                .eq('invited_creator_id', user.id)
                .eq('status', 'accepted')
                .limit(1)
                .maybeSingle();
            isCollabCreator = !!invite;
        }

        if (!isRoomHost && !isCollabCreator) {
            return NextResponse.json({ error: "Room not found or unauthorized" }, { status: 403 });
        }

        // 3. Handle Actions
        if (action === 'START_SESSION') {
            // Only hosts can start sessions
            if (!isRoomHost) {
                return NextResponse.json({ error: "Only the host can start sessions" }, { status: 403 });
            }

            // A. Create Session History Record
            const { data: newSession, error: sessionError } = await admin
                .from('truth_dare_sessions')
                .insert({
                    room_id: roomId,
                    title: title,
                    description: description,
                    is_private: isPrivate,
                    price: price,
                    status: 'active'
                })
                .select('id')
                .single();

            if (sessionError) throw sessionError;
            const newSessionId = newSession?.id;

            // B. Update/Create Active Game State — CLEAN SLATE
            const gamePayload: Record<string, any> = {
                    room_id: roomId,
                    session_title: title,
                    session_description: description,
                    is_private: isPrivate,
                    unlock_price: price,
                    status: 'active',
                    current_prompt: null,
                    votes_tier: null,
                    votes_tv: null,
                    is_double_dare_armed: false,
                    replay_until: null,
                    group_vote_state: null,
                    session_id: newSessionId || null,
                    updated_at: new Date().toISOString()
            };
            let { error: updateError } = await admin
                .from('truth_dare_games')
                .upsert(gamePayload, { onConflict: 'room_id' });

            // If session_id column doesn't exist yet, retry without it
            if (updateError && updateError.message?.includes('session_id')) {
                delete gamePayload.session_id;
                ({ error: updateError } = await admin
                    .from('truth_dare_games')
                    .upsert(gamePayload, { onConflict: 'room_id' }));
            }

            if (updateError) throw updateError;

            // End any active group calls from previous sessions
            await admin.from('group_calls')
                .update({ status: 'ended', ended_at: new Date().toISOString() })
                .eq('room_id', roomId)
                .eq('status', 'active');

            // Ensure room status is live
            await admin.from('rooms').update({ status: 'live' }).eq('id', roomId);

            return NextResponse.json({ success: true, message: "Session started" });
        }

        if (action === 'GO_LIVE') {
            // A. Find the most recent pending session for this room
            const { data: pendingSession } = await admin
                .from('truth_dare_sessions')
                .select('id')
                .eq('room_id', roomId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (pendingSession) {
                // Update only this specific session to active
                const { error: sessionError } = await admin
                    .from('truth_dare_sessions')
                    .update({ status: 'active', started_at: new Date().toISOString() })
                    .eq('id', pendingSession.id);

                if (sessionError) console.error("Error going live in history:", sessionError);
            }

            // B. Update Game State to active
            const { error: updateError } = await admin
                .from('truth_dare_games')
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('room_id', roomId);

            if (updateError) throw updateError;

            // C. Ensure room status is live
            await admin.from('rooms').update({ status: 'live' }).eq('id', roomId);

            return NextResponse.json({ success: true, message: "Session is now live" });
        }

        if (action === 'END_SESSION') {
            // Only hosts can end sessions
            if (!isRoomHost) {
                return NextResponse.json({ error: "Only the host can end sessions" }, { status: 403 });
            }

            // A. Close History Records (both active and pending)
            const { error: sessionError } = await admin
                .from('truth_dare_sessions')
                .update({
                    status: 'ended',
                    ended_at: new Date().toISOString()
                })
                .eq('room_id', roomId)
                .in('status', ['active', 'pending']);

            if (sessionError) console.error("Error closing session history:", sessionError);

            // B. Update Game State
            const { error: updateError } = await admin
                .from('truth_dare_games')
                .update({
                    status: 'ended',
                    updated_at: new Date().toISOString()
                })
                .eq('room_id', roomId);

            if (updateError) throw updateError;

            // C. End any active group calls for this room
            await admin.from('group_calls')
                .update({ status: 'ended', ended_at: new Date().toISOString() })
                .eq('room_id', roomId)
                .eq('status', 'active');

            // D. Set room status to 'ended' so it no longer appears as live
            await admin.from('rooms').update({ status: 'ended' }).eq('id', roomId);

            // D. Broadcast session_ended to all connected fans for instant UI update
            try {
                const broadcastChannel = supabase.channel(`room:${roomId}`);
                await broadcastChannel.send({
                    type: 'broadcast',
                    event: 'session_ended',
                    payload: { roomId, endedAt: new Date().toISOString() }
                });
                supabase.removeChannel(broadcastChannel);
            } catch (broadcastErr) {
                console.error("Failed to broadcast session_ended:", broadcastErr);
                // Non-fatal — fans will still catch it via postgres_changes
            }

            return NextResponse.json({ success: true, message: "Session ended" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("Session API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { roomId } = await params;

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: history, error } = await admin
            .from('truth_dare_sessions')
            .select('*')
            .eq('room_id', roomId)
            .order('started_at', { ascending: false });

        if (error) {
            console.error("Fetch History Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Calculate current session earnings
        let currentEarnings = { total: 0, tips: 0, truths: 0, dares: 0, custom: 0 };
        const activeSession = history?.find((s: any) => s.status === 'active' || s.status === 'pending');

        if (activeSession) {
            // Try session_id-based filter first, fallback to timestamp
            let { data: requests, error: reqError } = await admin
                .from('truth_dare_requests')
                .select('amount, type, status, created_at')
                .eq('room_id', roomId)
                .eq('session_id', activeSession.id);

            if (reqError && reqError.message?.includes('session_id')) {
                // Fallback: timestamp-based
                ({ data: requests } = await admin
                    .from('truth_dare_requests')
                    .select('amount, type, status, created_at')
                    .eq('room_id', roomId)
                    .gte('created_at', activeSession.started_at || activeSession.created_at));
            }

            if (requests) {
                requests.forEach((r: any) => {
                    const amount = r.amount || 0;
                    currentEarnings.total += amount;

                    const type = r.type?.toLowerCase() || '';
                    if (type.includes('tip')) currentEarnings.tips += amount;
                    else if (type.includes('truth')) currentEarnings.truths += amount;
                    else if (type.includes('dare')) currentEarnings.dares += amount;
                    else if (type.includes('custom')) currentEarnings.custom += amount;
                });
            }
        }

        return NextResponse.json({
            history: history || [],
            currentEarnings
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
