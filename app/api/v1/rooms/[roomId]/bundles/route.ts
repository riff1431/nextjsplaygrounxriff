import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET  - List all bundles for a room
 * POST - Creator adds a bundle { name, subtitle, price }
 * DELETE - Creator removes a bundle { bundleId }
 */

export async function GET(
    _request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await props.params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("flash_drop_bundles")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bundles: data || [] });
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
    const { name, subtitle, price } = body;

    if (!name || !price || price <= 0) {
        return NextResponse.json({ error: "Name and valid price required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("flash_drop_bundles")
        .insert({
            room_id: roomId,
            creator_id: user.id,
            name,
            subtitle: subtitle || null,
            price,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, bundle: data });
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
    const { bundleId } = body;

    const { error } = await supabase
        .from("flash_drop_bundles")
        .delete()
        .eq("id", bundleId)
        .eq("room_id", roomId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
