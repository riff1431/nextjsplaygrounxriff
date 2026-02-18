import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Search confessions across all creators
// Query params:
//   q     - creator name/username search term
//   tier  - filter by tier (Soft, Spicy, Dirty, Dark, Forbidden)
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() || "";
    const tier = searchParams.get("tier")?.trim() || "";

    // If there's a creator search query, find matching rooms via profiles → rooms
    if (q) {
        // Step 1: Find creator profiles matching the search
        const { data: matchedProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
            .eq("role", "creator")
            .limit(20);

        if (!matchedProfiles || matchedProfiles.length === 0) {
            return NextResponse.json({ confessions: [], creators: [] });
        }

        const creatorIds = matchedProfiles.map(p => p.id);

        // Step 2: Find rooms hosted by these creators
        const { data: rooms } = await supabase
            .from("rooms")
            .select("id, host_id")
            .in("host_id", creatorIds);

        if (!rooms || rooms.length === 0) {
            return NextResponse.json({ confessions: [], creators: matchedProfiles });
        }

        const roomIds = rooms.map(r => r.id);

        // Step 3: Fetch published confessions from those rooms
        let query = supabase
            .from("confessions")
            .select("*")
            .in("room_id", roomIds)
            .eq("status", "Published")
            .order("created_at", { ascending: false });

        if (tier && tier !== "All") {
            query = query.eq("tier", tier);
        }

        const { data: confessions, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Enrich confessions with creator info
        const roomToCreator = new Map<string, any>();
        for (const room of rooms) {
            const profile = matchedProfiles.find(p => p.id === room.host_id);
            if (profile) {
                roomToCreator.set(room.id, profile);
            }
        }

        const enriched = (confessions || []).map(c => ({
            ...c,
            creator: roomToCreator.get(c.room_id) || null
        }));

        return NextResponse.json({ confessions: enriched, creators: matchedProfiles });
    }

    // No search query — return all published confessions (optionally filtered by tier)
    let query = supabase
        .from("confessions")
        .select("*")
        .eq("status", "Published")
        .order("created_at", { ascending: false })
        .limit(50);

    if (tier && tier !== "All") {
        query = query.eq("tier", tier);
    }

    const { data: confessions, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with creator info
    const roomIds = [...new Set((confessions || []).map(c => c.room_id))];
    let creators: any[] = [];

    if (roomIds.length > 0) {
        const { data: rooms } = await supabase
            .from("rooms")
            .select("id, host_id")
            .in("id", roomIds);

        if (rooms && rooms.length > 0) {
            const hostIds = [...new Set(rooms.map(r => r.host_id))];
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, username, avatar_url")
                .in("id", hostIds);

            const roomToCreator = new Map<string, any>();
            for (const room of rooms) {
                const profile = (profiles || []).find(p => p.id === room.host_id);
                if (profile) roomToCreator.set(room.id, profile);
            }

            const enriched = (confessions || []).map(c => ({
                ...c,
                creator: roomToCreator.get(c.room_id) || null
            }));

            return NextResponse.json({ confessions: enriched, creators: profiles || [] });
        }
    }

    return NextResponse.json({ confessions: confessions || [], creators });
}
