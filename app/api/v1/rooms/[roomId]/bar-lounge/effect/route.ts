import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/bar-lounge/effect
 * Fan triggers a visual effect (pays from wallet).
 * Body: { effectType, tier, amount }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { effectType, tier, amount } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Payment with revenue split (85% creator / 15% platform)
    const splitResult = await applyRevenueSplit({
        supabase,
        fanUserId: user.id,
        creatorUserId: room.host_id,
        grossAmount: amount,
        splitType: 'GLOBAL',
        description: `Bar effect: ${effectType}`,
        roomId,
        relatedType: 'bar_effect',
        relatedId: null,
        earningsCategory: 'reactions',
    });

    if (!splitResult.success) return NextResponse.json({ error: splitResult.error || "Payment failed" }, { status: 400 });

    const { data: effect, error: effectError } = await supabase
        .from("bar_lounge_effects")
        .insert({ room_id: roomId, fan_id: user.id, effect_type: effectType, tier, amount })
        .select().single();

    if (effectError) return NextResponse.json({ error: effectError.message }, { status: 500 });

    return NextResponse.json({ success: true, effect, new_balance: splitResult.newBalance });
}
