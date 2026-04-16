import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/suga/gift
 * Fan sends a gift to the creator.
 * Body: { giftType: 'Kiss'|'Tease'|'Luxury'|'Royal', amount: number }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { giftType, amount } = body;

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
        description: `Suga Gift: ${giftType}`,
        roomId,
        relatedType: 'suga_gift',
        relatedId: null,
        earningsCategory: 'gifts',
    });

    if (!splitResult.success) return NextResponse.json({ error: splitResult.error }, { status: 400 });

    const { data: gift } = await supabase
        .from("suga_gifts")
        .insert({ room_id: roomId, fan_id: user.id, gift_type: giftType, amount })
        .select().single();

    // Log activity event
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();

    await supabase.from("suga_activity_events").insert({
        room_id: roomId, type: "gift", fan_name: profile?.username || "Anonymous",
        label: `Sent ${giftType} Gift`, amount,
    });

    await supabase.from("notifications").insert({
        user_id: room.host_id, actor_id: user.id, type: "suga_gift",
        message: `${profile?.username || "Fan"} sent a ${giftType} gift (€${amount})!`,
        reference_id: gift?.id,
    });

    return NextResponse.json({ success: true, gift, new_balance: splitResult.newBalance });
}
