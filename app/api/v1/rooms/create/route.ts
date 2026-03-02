import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/rooms/create
 * Creator creates a new room with a type.
 * Body: { type, title? }
 *
 * GET /api/v1/rooms/create
 * Not used — use GET /api/v1/rooms/[roomId] instead.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, slug } = body;

    if (!type) {
        return NextResponse.json({ error: "Room type is required" }, { status: 400 });
    }

    // Check if creator already has an active room of this type
    const { data: existingRoom } = await supabase
        .from("rooms")
        .select("id, status")
        .eq("host_id", user.id)
        .eq("type", type)
        .in("status", ["live", "offline"])
        .single();

    if (existingRoom) {
        // Return existing room instead of creating duplicate
        return NextResponse.json({
            success: true,
            room: existingRoom,
            message: "Room already exists",
        });
    }

    const { data: room, error } = await supabase
        .from("rooms")
        .insert({
            host_id: user.id,
            type,
            title: title || `${type} Room`,
            slug: slug || `${type}-${user.id.substring(0, 8)}`,
            status: "offline",
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, room });
}
