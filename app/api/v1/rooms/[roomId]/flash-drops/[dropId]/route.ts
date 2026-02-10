import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; dropId: string }> }
) {
    const params = await props.params;
    const { roomId, dropId } = params;
    const supabase = await createClient();
    const body = await request.json();

    // Allow updating status or other fields
    const { status, inventoryRemaining, unlocksPreview, grossPreview } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    // We might update inventory/metrics manually for simulation too, or let triggers do it.
    // For now, allow manual override from frontend for simulation if needed, but primarily for status.

    // Safety check: if inventoryRemaining passed, ensure it's valid
    if (inventoryRemaining !== undefined) updates.inventory_remaining = inventoryRemaining;
    if (unlocksPreview !== undefined) updates.unlocks_preview = unlocksPreview;
    if (grossPreview !== undefined) updates.gross_preview = grossPreview;

    const { data: updated, error } = await supabase
        .from("flash_drops")
        .update(updates)
        .eq("id", dropId)
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, drop: updated });
}
