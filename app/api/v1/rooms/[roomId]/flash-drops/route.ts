import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch All Drops
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data: drops, error } = await supabase
        .from("flash_drops")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ drops });
}

// POST: Create New Drop
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();

    const { title, kind, rarity, price, endsInMin, inventoryTotal, status } = body;

    const endsAt = new Date();
    endsAt.setMinutes(endsAt.getMinutes() + (endsInMin || 15));

    const { data: newDrop, error } = await supabase
        .from("flash_drops")
        .insert([{
            room_id: roomId,
            title,
            kind: kind || 'Photo Set',
            rarity: rarity || 'Common',
            price: price || 0,
            ends_at: endsAt.toISOString(),
            status: status || 'Scheduled',
            inventory_total: inventoryTotal || 100,
            inventory_remaining: inventoryTotal || 100, // Starts full
            gross_preview: 0,
            unlocks_preview: 0
        }])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, drop: newDrop });
}
