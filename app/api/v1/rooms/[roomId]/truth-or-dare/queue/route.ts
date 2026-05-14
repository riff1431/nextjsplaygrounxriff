import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const admin = createAdminClient();

    // Find the current active/pending session to scope queue items
    const { data: activeSession } = await admin
        .from("truth_dare_sessions")
        .select("id, started_at, created_at")
        .eq("room_id", roomId)
        .in("status", ["active", "pending"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const buildQuery = (useSessionId: boolean) => {
        let q = admin
            .from("truth_dare_queue")
            .select("*")
            .eq("room_id", roomId)
            .eq("is_served", false)
            .order("created_at", { ascending: false })
            .limit(50);

        if (activeSession) {
            if (useSessionId) {
                q = q.eq("session_id", activeSession.id);
            } else {
                // Fallback: timestamp-based filtering
                const sessionStart = activeSession.started_at || activeSession.created_at;
                if (sessionStart) {
                    q = q.gte("created_at", sessionStart);
                }
            }
        }
        return q;
    };

    // Try session_id filtering first, fallback to timestamp if column doesn't exist
    let { data: queue, error } = await buildQuery(true);
    if (error && error.message?.includes('session_id')) {
        ({ data: queue, error } = await buildQuery(false));
    }

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ queue });
}
