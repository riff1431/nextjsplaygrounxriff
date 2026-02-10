import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; dropId: string }> }
) {
    const params = await props.params;
    const { roomId, dropId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { count } = body; // Simulate N unlocks

    const numUnlocks = count || 1;

    // 1. Get Drop
    const { data: drop } = await supabase
        .from("flash_drops")
        .select("*")
        .eq("id", dropId)
        .single();

    if (!drop) return NextResponse.json({ error: "Drop not found" }, { status: 404 });

    const newRemaining = Math.max(0, drop.inventory_remaining - numUnlocks);
    const actualUnlocks = drop.inventory_remaining - newRemaining; // In case we requested more than available

    if (actualUnlocks <= 0) {
        return NextResponse.json({ error: "Sold out" }, { status: 400 });
    }

    const addedRevenue = actualUnlocks * drop.price;

    // 2. Update Drop
    const { data: updatedDrop, error } = await supabase
        .from("flash_drops")
        .update({
            inventory_remaining: newRemaining,
            unlocks_preview: drop.unlocks_preview + actualUnlocks,
            gross_preview: drop.gross_preview + addedRevenue
        })
        .eq("id", dropId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Log Unlocks (Batch insert for simulation)
    const logs = Array(actualUnlocks).fill({
        drop_id: dropId,
        amount: drop.price,
        // user_id: authenticated user or null for sim
    });

    await supabase.from("flash_drop_unlocks").insert(logs);

    return NextResponse.json({ success: true, drop: updatedDrop });
}
