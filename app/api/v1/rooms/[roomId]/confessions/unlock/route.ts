import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
        .select("*, rooms!inner(host_id)")
        .eq("id", confessionId)
        .eq("room_id", roomId)
        .single();

    if (confError || !confession) {
        return NextResponse.json({ error: "Confession not found" }, { status: 404 });
    }

    const price = confession.price || 0;
    const creatorId = (confession as any).rooms?.host_id;

    if (price > 0 && creatorId) {
        // Transfer funds (atomic)
        const { data: result, error: rpcError } = await supabase.rpc("transfer_funds", {
            p_from_user_id: user.id,
            p_to_user_id: creatorId,
            p_amount: price,
            p_description: `Unlocked confession: ${confession.title}`,
            p_room_id: roomId,
            p_related_type: "confession_unlock",
            p_related_id: confessionId,
        });

        if (rpcError) {
            return NextResponse.json({ error: rpcError.message }, { status: 500 });
        }

        if (!result?.success) {
            return NextResponse.json(
                { error: result?.error || "Payment failed" },
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
            message: `Someone unlocked your confession "${confession.title}" for $${price}`,
            reference_id: confessionId,
        });
    }

    return NextResponse.json({ success: true, confession });
}
