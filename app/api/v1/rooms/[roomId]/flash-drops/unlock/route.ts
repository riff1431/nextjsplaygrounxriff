import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/flash-drops/unlock
 * Fan buys/unlocks a flash drop.
 * Body: { dropId: string }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { dropId } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check already unlocked
    const { data: existing } = await supabase
        .from("flash_drop_unlocks")
        .select("id").eq("drop_id", dropId).eq("user_id", user.id).single();
    if (existing) return NextResponse.json({ success: true, alreadyUnlocked: true });

    // Get drop details
    const { data: drop } = await supabase
        .from("flash_drops")
        .select("*")
        .eq("id", dropId).eq("room_id", roomId).single();

    if (!drop) return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    if (drop.status !== "Live") return NextResponse.json({ error: "Drop not live" }, { status: 400 });
    if (drop.inventory_remaining <= 0) return NextResponse.json({ error: "Sold out" }, { status: 400 });

    const { data: roomObj } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    const creatorId = roomObj?.host_id;
    const price = drop.price || 0;

    // Payment with revenue split (85% creator / 15% platform)
    if (price > 0 && creatorId) {
        const splitResult = await applyRevenueSplit({
            supabase,
            fanUserId: user.id,
            creatorUserId: creatorId,
            grossAmount: price,
            splitType: 'GLOBAL',
            description: `Flash Drop: ${drop.title}`,
            roomId,
            relatedType: 'flash_drop_unlock',
            relatedId: dropId,
            earningsCategory: 'drops',
        });

        if (!splitResult.success) return NextResponse.json({ error: splitResult.error }, { status: 400 });
    }

    // Record unlock
    await supabase.from("flash_drop_unlocks")
        .insert({ drop_id: dropId, user_id: user.id, amount: price });

    // Decrement inventory
    await supabase
        .from("flash_drops")
        .update({
            inventory_remaining: (drop.inventory_remaining || 1) - 1,
            unlocks_preview: (drop.unlocks_preview || 0) + 1,
            gross_preview: (drop.gross_preview || 0) + price,
            updated_at: new Date().toISOString(),
        })
        .eq("id", dropId);

    // Notification
    if (creatorId) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
        await supabase.from("notifications").insert({
            user_id: creatorId, actor_id: user.id, type: "flash_drop",
            message: `${profile?.username || "Fan"} unlocked "${drop.title}" (€${price})!`,
            reference_id: dropId,
        });
    }

    return NextResponse.json({ success: true });
}
