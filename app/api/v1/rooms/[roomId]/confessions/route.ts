import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Filter list
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const supabase = await createClient();

    // Resolve Room ID (Slug vs UUID)
    let targetRoomId = roomId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
    let hostId: string | null = null;

    if (!isUUID) {
        const { data: room } = await supabase.from("rooms").select("id, host_id").eq("slug", roomId).single();
        if (room) {
            targetRoomId = room.id;
            hostId = room.host_id;
        } else {
            return NextResponse.json({ confessions: [] });
        }
    } else {
        const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
        if (room) {
            hostId = room.host_id;
        }
    }

    // Fetch creator profile details
    let creatorProfile: any = null;
    if (hostId) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", hostId)
            .single();
        if (profile) {
            creatorProfile = {
                id: profile.id,
                full_name: profile.full_name || profile.username || "Creator",
                username: profile.username || "",
                avatar_url: profile.avatar_url || ""
            };
        }
    }

    // [FIX] Filter by Published status so fans only see public posts
    let confQuery = supabase
        .from("confessions")
        .select("*")
        .eq("room_id", targetRoomId)
        .eq("status", "Published")
        .order("created_at", { ascending: false });

    // Session-scope: only return confessions from the active session
    if (sessionId) {
        confQuery = confQuery.eq("session_id", sessionId);
    }

    const { data: confessions, error } = await confQuery;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if user is authenticated to get unlock status
    const { data: { user } } = await supabase.auth.getUser();
    let unlockedIds: Set<string> = new Set();

    if (user) {
        const { data: unlocks } = await supabase
            .from("confession_unlocks")
            .select("confession_id")
            .eq("user_id", user.id);

        if (unlocks) {
            unlockedIds = new Set(unlocks.map((u: any) => u.confession_id));
        }
    }

    // Hide full content for locked confessions
    const enrichedConfessions = (confessions || []).map((c: any) => {
        const isUnlocked = unlockedIds.has(c.id) || c.price === 0;
        return {
            ...c,
            is_unlocked: isUnlocked,
            content: isUnlocked ? c.content : null,
            media_url: isUnlocked ? c.media_url : null,
            creator: creatorProfile
        };
    });

    return NextResponse.json({ confessions: enrichedConfessions });
}

// POST: Create confession (creator only)
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is creator (host) of this room
    const { data: room } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", roomId)
        .single();

    if (!room || room.host_id !== user.id) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const { title, teaser, content, mediaUrl, type, tier, price, status, sessionId } = body;

    if (!title || !type || !tier || price === undefined) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: newConfession, error } = await supabase
        .from("confessions")
        .insert([{
            room_id: roomId,
            session_id: sessionId || null,
            title,
            teaser: teaser || title.substring(0, 50) + "...",
            content,
            media_url: mediaUrl || null,
            type,
            tier,
            price: Number(price),
            status: status || 'Published',
        }])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, confession: newConfession });
}
