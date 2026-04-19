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

    if (!reactionType || !amount || amount <= 0) {
        return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    // Always fetch host from the room in the URL — confession reactions are room-level tips.
    // The confession wall may show confessions from other rooms (global browse), so we must
    // NOT filter by room_id when looking up a specific confessionId.
    const { data: roomObj } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    const creatorId = roomObj?.host_id;

    if (!creatorId) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // If a specific confessionId was provided, look it up (without room constraint) to get title for notification
    let confession: { title: string } | null = null;
    if (confessionId) {
        const { data: confData } = await supabase
            .from("confessions")
            .select("title")
            .eq("id", confessionId)
            .single();
        confession = confData;
    }

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

    // Record the tip (only if we have a specific confession to attach it to)
    if (confessionId) {
        const { error: tipError } = await supabase
            .from("confession_tips")
            .insert({
                confession_id: confessionId,
                fan_id: user.id,
                reaction_type: reactionType,
                amount,
            });

        if (tipError) {
            console.error("confession_tips insert error:", tipError.message);
            // Non-fatal — payment was successful, just couldn't record tip row
        }
    }

    // Get fan name for notification
    const { data: fanProfile } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).single();
    const fanName = fanProfile?.display_name || fanProfile?.username || user.email?.split("@")[0] || "A fan";

    // Notification
    await supabase.from("notifications").insert({
        user_id: creatorId,
        actor_id: user.id,
        type: "confession_tip",
        message: confession
            ? `${fanName} sent ${reactionType} (€${amount}) on "${confession.title}"`
            : `${fanName} sent a ${reactionType} reaction (€${amount}) in the room`,
        reference_id: confessionId ?? roomId,
    });

    return NextResponse.json({ success: true });
}
