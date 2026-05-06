import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/rooms/[roomId]/roller-packs
 * Returns all roller packs for a room.
 *
 * POST /api/v1/rooms/[roomId]/roller-packs
 * Creator adds a new roller pack.
 * Body: { name: string, price: number, description?: string }
 *
 * DELETE /api/v1/rooms/[roomId]/roller-packs
 * Creator removes a roller pack.
 * Body: { packId: string }
 */

export async function GET(
    _request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await props.params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("flash_drop_roller_packs")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ packs: data || [] });
}

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, price, description, media_urls } = body;

    if (!name || !price || price <= 0) {
        return NextResponse.json({ error: "Name and valid price required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("flash_drop_roller_packs")
        .insert({
            room_id: roomId,
            creator_id: user.id,
            name,
            price,
            description: description || null,
            media_urls: Array.isArray(media_urls) ? media_urls : [],
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, pack: data });
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { packId } = body;

    const { error } = await supabase
        .from("flash_drop_roller_packs")
        .delete()
        .eq("id", packId)
        .eq("room_id", roomId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
