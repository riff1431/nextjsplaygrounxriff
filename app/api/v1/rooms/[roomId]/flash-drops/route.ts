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

    // Check existing count
    const { count, error: countError } = await supabase
        .from("flash_drops")
        .select("*", { count: 'exact', head: true })
        .eq("room_id", roomId);

    if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (count !== null && count >= 12) {
        return NextResponse.json({ error: "Maximum limit of 12 drops reached for this room." }, { status: 400 });
    }

    const body = await request.json();

    const { title, kind, rarity, price, endsInMin, inventoryTotal, status, media_url } = body;

    const endsAt = new Date();
    endsAt.setMinutes(endsAt.getMinutes() + (endsInMin || 15));

    const { data: newDrop, error } = await supabase
        .from("flash_drops")
        .insert([{
            room_id: roomId,
            title,
            kind: kind || 'Photo',
            rarity: rarity || 'Common',
            price: price || 0,
            ends_at: endsAt.toISOString(),
            status: status || 'Scheduled',
            inventory_total: inventoryTotal || 100,
            inventory_remaining: inventoryTotal || 100,
            gross_preview: 0,
            unlocks_preview: 0,
            ...(media_url ? { media_url } : {}),
        }])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insert System Message into Chat (Server-side to avoid duplication)
    await supabase.from("room_chat_messages").insert({
        room_id: roomId,
        sender_id: null,
        sender_name: "System",
        message: `⚡ NEW DROP: "${title}" is now LIVE — $${price || 0} · ${rarity || 'Common'}`,
        is_system: true,
        system_type: "drop_new",
    });

    return NextResponse.json({ success: true, drop: newDrop });
}
