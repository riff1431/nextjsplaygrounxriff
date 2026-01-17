import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch active competition
    let { data: comp, error } = await supabase
        .from("competitions")
        .select("*")
        .eq("room_id", roomId)
        .neq("status", "ENDED") // Prioritize active ones
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (!comp && !error) {
        // If no active competition, look for ANY recent one or create new default
        const { data: recent } = await supabase
            .from("competitions")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (recent) {
            comp = recent;
        } else {
            // Auto-create initial setup state
            const { data: newComp, error: insertError } = await supabase
                .from("competitions")
                .insert([{ room_id: roomId }])
                .select()
                .single();
            if (!insertError) comp = newComp;
        }
    }

    if (!comp) {
        return NextResponse.json({ error: "Failed to load competition" }, { status: 500 });
    }

    // 2. Fetch Topics
    const { data: topics } = await supabase
        .from("competition_topics")
        .select("*")
        .eq("competition_id", comp.id)
        .order("votes", { ascending: false });

    // 3. Fetch Participants
    const { data: participants } = await supabase
        .from("competition_participants")
        .select("*")
        .eq("competition_id", comp.id)
        .order("votes", { ascending: false });

    // 4. Determine "me" status
    let me = null;
    if (user && participants) {
        const myParticipant = participants.find(p => p.user_id === user.id);
        if (myParticipant) {
            me = {
                creatorId: myParticipant.id,
                registered: true,
                ready: myParticipant.is_ready,
                votes: myParticipant.votes,
                tipsCents: (myParticipant.tips || 0) * 100,
                rank: participants.findIndex(p => p.id === myParticipant.id) + 1,
                queueSize: participants.filter(p => !p.is_ready).length, // Mock logic for queue
                etaSeconds: 0 // Mock logic
            };
        } else {
            // Not registered yet
            me = {
                creatorId: "unknown",
                registered: false,
                ready: false,
                votes: 0,
                tipsCents: 0,
                rank: null,
                queueSize: participants.length,
                etaSeconds: participants.length * 60
            };
        }
    }

    // 5. Fetch Activity Feed
    const { data: activity } = await supabase
        .from("competition_activity")
        .select("*")
        .eq("competition_id", comp.id)
        .order("created_at", { ascending: false })
        .limit(12);

    return NextResponse.json({
        competition: comp,
        topics: topics || [],
        participants: participants || [],
        me: me,
        activity: activity || []
    });
}

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    // Reset / Create New Competition
    const { data: newComp, error } = await supabase
        .from("competitions")
        .insert([{
            room_id: roomId,
            status: 'SETUP',
            theme: 'New Competition',
            entry_fee: 50
        }])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, competition: newComp });
}
