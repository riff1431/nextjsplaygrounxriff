import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    // Find the current active/pending session to scope queue items
    const { data: activeSession } = await supabase
        .from("truth_dare_sessions")
        .select("id, started_at, created_at")
        .eq("room_id", roomId)
        .in("status", ["active", "pending"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    let query = supabase
        .from("truth_dare_queue")
        .select("*")
        .eq("room_id", roomId)
        .eq("is_served", false)
        .order("created_at", { ascending: false })
        .limit(50);

    // Only return queue items from the current session
    if (activeSession) {
        const sessionStart = activeSession.started_at || activeSession.created_at;
        if (sessionStart) {
            query = query.gte("created_at", sessionStart);
        }
    }

    const { data: queue, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ queue });
}
