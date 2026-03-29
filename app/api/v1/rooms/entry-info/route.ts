import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/entry-info?room_type=confessions
// Public endpoint — returns entry info for a room
// ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const roomType = request.nextUrl.searchParams.get("room_type");

    if (!roomType) {
        return NextResponse.json({ error: "room_type is required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("room_settings")
        .select("room_type, display_name, entry_info_section1, entry_info_section2, entry_info_section3, entry_info_pro_tip")
        .eq("room_type", roomType)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({
        room_type: data.room_type,
        display_name: data.display_name,
        section1: data.entry_info_section1 || { title: "What Happens Here", items: [] },
        section2: data.entry_info_section2 || { title: "How to Participate", items: [] },
        section3: data.entry_info_section3 || { title: "Ways to Spend", items: [] },
        pro_tip: data.entry_info_pro_tip || "",
    });
}
