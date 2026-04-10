import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/suga/entry
 * Fan pays entry fee.
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
        .from("suga_entry_fees").select("id").eq("room_id", roomId).eq("fan_id", user.id).single();
    if (existing) return NextResponse.json({ success: true, alreadyEntered: true });

    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const amount = body.amount || 10;

    // Payment with revenue split (50% creator / 50% platform for private entry)
    const splitResult = await applyRevenueSplit({
        supabase,
        fanUserId: user.id,
        creatorUserId: room.host_id,
        grossAmount: amount,
        splitType: 'PRIVATE_ENTRY',
        description: "Suga 4 U: Entry Fee",
        roomId,
        relatedType: 'suga_entry',
        relatedId: null,
        earningsCategory: 'entry_fees',
    });

    if (!splitResult.success) return NextResponse.json({ error: splitResult.error }, { status: 400 });

    const { data: entry } = await supabase
        .from("suga_entry_fees")
        .insert({ room_id: roomId, fan_id: user.id, amount })
        .select().single();

    return NextResponse.json({ success: true, entry, new_balance: splitResult.newBalance });
}

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ hasAccess: false });

    const { data } = await supabase.from("suga_entry_fees")
        .select("id").eq("room_id", roomId).eq("fan_id", user.id).single();

    return NextResponse.json({ hasAccess: !!data });
}
