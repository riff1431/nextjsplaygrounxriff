import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/confessions/bid
 * Fan places a bid on a confession.
 *
 * Body: { confessionId: string, amount: number }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { confessionId, amount } = body;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!confessionId || !amount || amount <= 0) {
        return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    // Get confession to find creator
    const { data: confession } = await supabase
        .from("confessions")
        .select("title")
        .eq("id", confessionId)
        .eq("room_id", roomId)
        .single();

    if (!confession) {
        return NextResponse.json({ error: "Confession not found" }, { status: 404 });
    }

    const { data: roomObj } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    const creatorId = roomObj?.host_id;

    // Payment with revenue split (85% creator / 15% platform)
    if (creatorId) {
        const splitResult = await applyRevenueSplit({
            supabase,
            fanUserId: user.id,
            creatorUserId: creatorId,
            grossAmount: amount,
            splitType: 'GLOBAL',
            description: `Bid on confession: ${confession.title}`,
            roomId,
            relatedType: 'confession_bid',
            relatedId: confessionId,
            earningsCategory: 'tips',
        });

        if (!splitResult.success) {
            return NextResponse.json(
                { error: splitResult.error || "Payment failed" },
                { status: 400 }
            );
        }
    }

    // Record the bid
    const { data: bid, error: bidError } = await supabase
        .from("confession_bids")
        .insert({
            confession_id: confessionId,
            fan_id: user.id,
            amount,
        })
        .select()
        .single();

    if (bidError) {
        return NextResponse.json({ error: bidError.message }, { status: 500 });
    }

    // Notification
    if (creatorId) {
        const { data: fanProfile } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).single();
        const fanName = fanProfile?.display_name || fanProfile?.username || user.email?.split("@")[0] || "A fan";
        await supabase.from("notifications").insert({
            user_id: creatorId,
            actor_id: user.id,
            type: "confession_bid",
            message: `${fanName} bid €${amount} on "${confession.title}"`,
            reference_id: confessionId,
        });
    }

    return NextResponse.json({ success: true, bid });
}
