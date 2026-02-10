
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const supabase = await createClient();
    const { roomId } = await params;

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { action, title, description, isPrivate, price } = body;

        // 2. Verify Room Ownership
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('host_id')
            .eq('id', roomId)
            .single();

        if (roomError || !room || room.host_id !== user.id) {
            return NextResponse.json({ error: "Room not found or unauthorized" }, { status: 403 });
        }

        // 3. Handle Actions
        if (action === 'START_SESSION') {
            // A. Create Session History Record
            const { error: sessionError } = await supabase
                .from('truth_dare_sessions')
                .insert({
                    room_id: roomId,
                    title: title,
                    description: description,
                    is_private: isPrivate,
                    price: price,
                    status: 'active'
                });

            if (sessionError) throw sessionError;

            // B. Update/Create Active Game State
            const { error: updateError } = await supabase
                .from('truth_dare_games')
                .upsert({
                    room_id: roomId,
                    session_title: title,
                    session_description: description,
                    is_private: isPrivate,
                    unlock_price: price,
                    status: 'active',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'room_id' });

            if (updateError) throw updateError;

            // Ensure room status is live
            await supabase.from('rooms').update({ status: 'live' }).eq('id', roomId);

            return NextResponse.json({ success: true, message: "Session started" });
        }

        if (action === 'END_SESSION') {
            // A. Close History Record
            const { error: sessionError } = await supabase
                .from('truth_dare_sessions')
                .update({
                    status: 'ended',
                    ended_at: new Date().toISOString()
                })
                .eq('room_id', roomId)
                .eq('status', 'active');

            if (sessionError) console.error("Error closing session history:", sessionError);

            // B. Update Game State
            const { error: updateError } = await supabase
                .from('truth_dare_games')
                .update({
                    status: 'ended',
                    updated_at: new Date().toISOString()
                })
                .eq('room_id', roomId);

            if (updateError) throw updateError;

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
    const { roomId } = await params;

    try {
        const { data: history, error } = await supabase
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
        const activeSession = history?.find((s: any) => s.status === 'active');

        if (activeSession) {
            const { data: requests } = await supabase
                .from('truth_dare_requests')
                .select('amount, type, status, created_at')
                .eq('room_id', roomId)
                .eq('status', 'answered')
                .gte('created_at', activeSession.started_at);

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
