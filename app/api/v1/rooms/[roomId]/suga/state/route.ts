import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const sessionId = request.nextUrl.searchParams.get("sessionId");

    // 1. Fetch Offers
    const { data: offers } = await supabase
        .from("suga_offer_drops")
        .select("*")
        .eq("room_id", roomId)
        .gt("ends_at", new Date().toISOString());

    // 2. Fetch Activity Feed (Recent) — scoped to session if provided
    let activityQuery = supabase
        .from("suga_activity_events")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(50);
    if (sessionId) activityQuery = activityQuery.eq("session_id", sessionId);
    const { data: activity } = await activityQuery;

    // Fetch room host
    const { data: room } = await supabase
        .from('rooms')
        .select('host_id')
        .eq('id', roomId)
        .single();
        
    let secrets: any[] = [];
    let favorites: any[] = [];
    
    if (room && room.host_id) {
        let secretsQuery = supabase
            .from("suga_creator_secrets")
            .select("*")
            .eq("creator_id", room.host_id)
            .order("created_at", { ascending: false });
        if (sessionId) secretsQuery = secretsQuery.eq("session_id", sessionId);
        const { data: sData } = await secretsQuery;
        secrets = sData || [];

        let favoritesQuery = supabase
            .from("suga_creator_favorites")
            .select("*")
            .eq("creator_id", room.host_id)
            .order("created_at", { ascending: false });
        if (sessionId) favoritesQuery = favoritesQuery.eq("session_id", sessionId);
        const { data: fData } = await favoritesQuery;
        favorites = fData || [];
    }

    return NextResponse.json({
        offers: offers || [],
        activity: activity || [],
        secrets,
        favorites
    });
}
