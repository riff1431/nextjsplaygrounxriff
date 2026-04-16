import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/confessions/tip
 * Fan sends a reaction tip on a confession.
 *
 * Body: { confessionId: string, reactionType: string, amount: number }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { confessionId, reactionType, amount } = body;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!confessionId || !reactionType || !amount || amount <= 0) {
        return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    // Get confession to find creator
    const { data: confession } = await supabase
        .from("confessions")
        .select("title, rooms!inner(host_id)")
        .eq("id", confessionId)
        .eq("room_id", roomId)
        .single();

    if (!confession) {
        return NextResponse.json({ error: "Confession not found" }, { status: 404 });
    }

    const creatorId = (confession as any).rooms?.host_id;

    // Payment with revenue split (85% creator / 15% platform)
    if (creatorId) {
        const splitResult = await applyRevenueSplit({
            supabase,
            fanUserId: user.id,
            creatorUserId: creatorId,
            grossAmount: amount,
            splitType: 'GLOBAL',
            description: `${reactionType} tip on confession`,
            roomId,
            relatedType: 'confession_tip',
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

    // Record the tip
    const { data: tip, error: tipError } = await supabase
        .from("confession_tips")
        .insert({
            confession_id: confessionId,
            fan_id: user.id,
            reaction_type: reactionType,
            amount,
        })
        .select()
        .single();

    if (tipError) {
        return NextResponse.json({ error: tipError.message }, { status: 500 });
    }

    // Notification
    if (creatorId) {
        await supabase.from("notifications").insert({
            user_id: creatorId,
            actor_id: user.id,
            type: "confession_tip",
            message: `Someone sent ${reactionType} (€${amount}) on "${confession.title}"`,
            reference_id: confessionId,
        });
    }

    return NextResponse.json({ success: true, tip });
}
