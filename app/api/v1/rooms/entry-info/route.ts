import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/entry-info?room_type=confessions
// Public endpoint — returns entry info for a room
// ──────────────────────────────────────────────────

/** Replace any hardcoded currency symbols ($, €) with the platform's configured symbol */
function replaceCurrencyInSection(section: any, symbol: string): any {
    if (!section || !section.items) return section;
    return {
        ...section,
        items: section.items.map((item: any) => ({
            ...item,
            text: item.text
                ?.replace(/\$(\d)/g, `${symbol}$1`)
                ?.replace(/€(\d)/g, `${symbol}$1`)
                ?.replace(/\$(\()/g, `${symbol}$1`)
                ?.replace(/€(\()/g, `${symbol}$1`),
        })),
    };
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const roomType = request.nextUrl.searchParams.get("room_type");

    if (!roomType) {
        return NextResponse.json({ error: "room_type is required" }, { status: 400 });
    }

    // Fetch room settings and currency in parallel
    const [roomResult, currencyResult] = await Promise.all([
        supabase
            .from("room_settings")
            .select("room_type, display_name, entry_info_section1, entry_info_section2, entry_info_section3, entry_info_pro_tip")
            .eq("room_type", roomType)
            .single(),
        supabase
            .from("admin_settings")
            .select("value")
            .eq("key", "default_currency")
            .single(),
    ]);

    if (roomResult.error || !roomResult.data) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const data = roomResult.data;

    // Get the currency symbol (default to €)
    let currencySymbol = "€";
    try {
        const currVal = currencyResult.data?.value;
        if (currVal) {
            const parsed = typeof currVal === "string" ? JSON.parse(currVal) : currVal;
            if (parsed?.symbol) currencySymbol = parsed.symbol;
        }
    } catch {}

    const s1 = replaceCurrencyInSection(data.entry_info_section1 || { title: "What Happens Here", items: [] }, currencySymbol);
    const s2 = replaceCurrencyInSection(data.entry_info_section2 || { title: "How to Participate", items: [] }, currencySymbol);
    const s3 = replaceCurrencyInSection(data.entry_info_section3 || { title: "Ways to Spend", items: [] }, currencySymbol);

    // Also replace in pro_tip
    let proTip = data.entry_info_pro_tip || "";
    if (proTip) {
        proTip = proTip.replace(/\$(\d)/g, `${currencySymbol}$1`).replace(/€(\d)/g, `${currencySymbol}$1`);
    }

    return NextResponse.json({
        room_type: data.room_type,
        display_name: data.display_name,
        section1: s1,
        section2: s2,
        section3: s3,
        pro_tip: proTip,
    });
}
