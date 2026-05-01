import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/confessions/unlock
 * Fan pays to unlock a confession. Transfers funds and records the unlock.
 *
 * Body: { confessionId: string }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { confessionId } = body;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already unlocked
    const { data: existingUnlock } = await supabase
        .from("confession_unlocks")
        .select("id")
        .eq("confession_id", confessionId)
        .eq("user_id", user.id)
        .single();

    if (existingUnlock) {
        // Already unlocked — return the full confession
        const { data: confession } = await supabase
            .from("confessions")
            .select("*")
            .eq("id", confessionId)
            .single();

        return NextResponse.json({ success: true, alreadyUnlocked: true, confession });
    }

    // Get confession details (price, room host)
    const { data: confession, error: confError } = await supabase
        .from("confessions")
        .select("*")
        .eq("id", confessionId)
        .single();

    if (confError || !confession) {
        return NextResponse.json({ error: "Confession not found" }, { status: 404 });
    }

    const { data: roomObj } = await supabase.from("rooms").select("host_id").eq("id", confession.room_id).single();
    const price = confession.price || 0;
    const creatorId = roomObj?.host_id;

    if (price > 0 && creatorId) {
        // Payment with revenue split (85% creator / 15% platform)
        const splitResult = await applyRevenueSplit({
            supabase,
            fanUserId: user.id,
            creatorUserId: creatorId,
            grossAmount: price,
            splitType: 'GLOBAL',
            description: `Unlocked confession: ${confession.title}`,
            roomId: confession.room_id,
            relatedType: 'confession_unlock',
            relatedId: confessionId,
            earningsCategory: 'drops',
        });

        if (!splitResult.success) {
            return NextResponse.json(
                { error: splitResult.error || "Payment failed" },
                { status: 400 }
            );
        }
    }

    // Record the unlock
    const { error: unlockError } = await supabase
        .from("confession_unlocks")
        .insert({
            confession_id: confessionId,
            user_id: user.id,
            price_paid: price,
        });

    if (unlockError) {
        return NextResponse.json({ error: unlockError.message }, { status: 500 });
    }

    // Create notification for creator
    if (creatorId) {
        await supabase.from("notifications").insert({
            user_id: creatorId,
            actor_id: user.id,
            type: "confession_unlock",
            message: `Someone unlocked your confession "${confession.title}" for €${price}`,
            reference_id: confessionId,
        });
    }

    return NextResponse.json({ success: true, confession });
}
