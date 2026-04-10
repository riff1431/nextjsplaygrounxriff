import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/truth-or-dare/entry
 * Fan pays entry fee to join Truth or Dare.
 * Body: { amount?: number }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if already entered
    const { data: existing } = await supabase
        .from("truth_dare_entries")
        .select("id").eq("room_id", roomId).eq("fan_id", user.id).single();

    if (existing) return NextResponse.json({ success: true, alreadyEntered: true });

    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Get entry price from game settings
    const { data: game } = await supabase.from("truth_dare_games").select("unlock_price").eq("room_id", roomId).single();
    const amount = body.amount || game?.unlock_price || 10;

    // Payment with revenue split (50% creator / 50% platform for entry)
    const splitResult = await applyRevenueSplit({
        supabase,
        fanUserId: user.id,
        creatorUserId: room.host_id,
        grossAmount: amount,
        splitType: 'PRIVATE_ENTRY',
        description: "Truth or Dare: Entry Fee",
        roomId,
        relatedType: 'td_entry',
        relatedId: null,
        earningsCategory: 'entry_fees',
    });

    if (!splitResult.success) return NextResponse.json({ error: splitResult.error || "Payment failed" }, { status: 400 });

    const { data: entry, error: insertError } = await supabase
        .from("truth_dare_entries")
        .insert({ room_id: roomId, fan_id: user.id, amount })
        .select().single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // Also insert into truth_dare_unlocks for backward-compatible access checks
    await supabase
        .from("truth_dare_unlocks")
        .upsert({ room_id: roomId, fan_id: user.id, amount }, { onConflict: "room_id,fan_id" })
        .select();

    return NextResponse.json({ success: true, entry, new_balance: splitResult.newBalance });
}

/**
 * GET /api/v1/rooms/[roomId]/truth-or-dare/entry
 * Check if fan has paid entry.
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ hasAccess: false });

    const { data } = await supabase.from("truth_dare_entries")
        .select("id").eq("room_id", roomId).eq("fan_id", user.id).single();

    // Also check truth_dare_unlocks (legacy)
    const { data: unlock } = await supabase.from("truth_dare_unlocks")
        .select("id").eq("room_id", roomId).eq("fan_id", user.id).single();

    return NextResponse.json({ hasAccess: !!(data || unlock) });
}
