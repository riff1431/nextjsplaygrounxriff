import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/truth-or-dare/tip
 * Fan sends a tip to the creator.
 * Body: { amount: number }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { amount } = body;

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
        description: `Truth or Dare tip: $${amount}`,
        roomId,
        relatedType: 'td_tip',
        relatedId: null,
        earningsCategory: 'tips',
    });

    if (!splitResult.success) return NextResponse.json({ error: splitResult.error || "Payment failed" }, { status: 400 });

    const { data: tip, error: tipError } = await supabase
        .from("truth_dare_tips")
        .insert({ room_id: roomId, fan_id: user.id, amount })
        .select().single();

    if (tipError) return NextResponse.json({ error: tipError.message }, { status: 500 });

    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();

    await supabase.from("notifications").insert({
        user_id: room.host_id, actor_id: user.id, type: "td_tip",
        message: `${profile?.username || "Fan"} tipped $${amount} in Truth or Dare!`,
        reference_id: tip.id,
    });

    return NextResponse.json({ success: true, tip, new_balance: splitResult.newBalance });
}
