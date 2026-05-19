import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/rooms/[roomId]/suga/group-vote/call/active
 * 
 * Returns the currently active group call for a room (if any).
 * Used by fans to hydrate call state on page load / reconnect.
 */
export async function GET(
    _request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    // Auth check — only authenticated users can see active calls
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: call, error } = await supabase
            .from('group_calls')
            .select('id, room_id, creator_id, agora_channel, participant_fan_ids, type, status, created_at')
            .eq('room_id', roomId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows found, that's fine
            throw error;
        }

        return NextResponse.json({ call: call || null });
    } catch (e: any) {
        console.error("Error fetching active suga group call:", e);
        return NextResponse.json({ error: e.message || "Failed to fetch active call" }, { status: 500 });
    }
}
