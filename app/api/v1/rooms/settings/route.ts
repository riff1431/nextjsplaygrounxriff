import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/settings?room_type=flash-drop
// Public endpoint — no auth required.
// Returns billing/fee info for a given room type so
// fan-facing UIs can show rates before joining.
// ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const roomType = searchParams.get("room_type");

    if (!roomType) {
        return NextResponse.json({ error: "room_type is required" }, { status: 400 });
    }

    try {
        const supabase = await createClient();

        const { data: settings, error } = await supabase
            .from("room_settings")
            .select(
                "room_type, display_name, is_active, public_entry_fee, min_private_entry_fee, " +
                "public_cost_per_min, min_private_cost_per_min, billing_enabled, " +
                "public_sessions_enabled, private_sessions_enabled, " +
                "free_minutes, min_wallet_balance, creator_split_percent, platform_split_percent, auto_kick_on_insufficient"
            )
            .eq("room_type", roomType)
            .single();

        if (error || !settings) {
            return NextResponse.json({ error: "Room type not found" }, { status: 404 });
        }

        return NextResponse.json({ settings });
    } catch (err: any) {
        console.error("Room settings fetch error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
