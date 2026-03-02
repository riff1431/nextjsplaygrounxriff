import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Filter list
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    // Resolve Room ID (Slug vs UUID)
    let targetRoomId = roomId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);

    if (!isUUID) {
        const { data: room } = await supabase.from("rooms").select("id").eq("slug", roomId).single();
        if (room) {
            targetRoomId = room.id;
        } else {
            return NextResponse.json({ confessions: [] });
        }
    }

    // [FIX] Filter by Published status so fans only see public posts
    const { data: confessions, error } = await supabase
        .from("confessions")
        .select("*")
        .eq("room_id", targetRoomId)
        .eq("status", "Published")
        .order("created_at", { ascending: false });

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
    const { title, teaser, content, mediaUrl, type, tier, price, status } = body;

    if (!title || !type || !tier || price === undefined) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: newConfession, error } = await supabase
        .from("confessions")
        .insert([{
            room_id: roomId,
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
