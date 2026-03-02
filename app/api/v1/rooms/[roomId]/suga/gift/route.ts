import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const { data: result, error: rpcError } = await supabase.rpc("transfer_funds", {
        p_from_user_id: user.id, p_to_user_id: room.host_id, p_amount: amount,
        p_description: `Suga Gift: ${giftType}`, p_room_id: roomId,
        p_related_type: "suga_gift", p_related_id: null,
    });

    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });
    if (!result?.success) return NextResponse.json({ error: result?.error }, { status: 400 });

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
        message: `${profile?.username || "Fan"} sent a ${giftType} gift ($${amount})!`,
        reference_id: gift?.id,
    });

    return NextResponse.json({ success: true, gift, new_balance: result.new_balance });
}
