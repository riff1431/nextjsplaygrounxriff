import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    // 1. Fetch Offers
    const { data: offers } = await supabase
        .from("suga_offer_drops")
        .select("*")
        .eq("room_id", roomId)
        .gt("ends_at", new Date().toISOString());

    // 2. Fetch Activity Feed (Recent)
    const { data: activity } = await supabase
        .from("suga_activity_events")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(50);

    // 3. Fetch Analytics (Secrets / Favorites)
    const { data: analytics } = await supabase
        .from("suga_item_analytics")
        .select("*")
        .eq("room_id", roomId);

    return NextResponse.json({
        offers: offers || [],
        activity: activity || [],
        analytics: analytics || []
    });
}
