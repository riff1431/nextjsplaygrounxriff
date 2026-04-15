import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/v1/splits/disclosure
 *
 * Public endpoint — returns the live split config formatted for
 * disclosure popups shown to creators (before session creation)
 * and fans (before room entry).
 *
 * No authentication required.
 */
export async function GET() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("platform_split_config")
        .select(
            "split_key, label, creator_pct, platform_pct, entry_fee, cost_per_min, min_charge, description"
        )
        .order("id", { ascending: true });

    if (error || !data) {
        // Return hardcoded PRD defaults as fallback
        return NextResponse.json({
            splits: getHardcodedDefaults(),
            source: "fallback",
        });
    }

    // Build a keyed map for easy lookup
    const splitMap: Record<string, any> = {};
    for (const row of data) {
        splitMap[row.split_key] = row;
    }

    return NextResponse.json({
        splits: splitMap,
        source: "database",
        // Convenience fields for disclosure UI
        global: {
            creator_pct: splitMap.GLOBAL?.creator_pct ?? 85,
            platform_pct: splitMap.GLOBAL?.platform_pct ?? 15,
        },
        public_room: {
            entry_fee: splitMap.PUBLIC_ENTRY?.entry_fee ?? 10,
            creator_entry_pct: splitMap.PUBLIC_ENTRY?.creator_pct ?? 0,
            platform_entry_pct: splitMap.PUBLIC_ENTRY?.platform_pct ?? 100,
            cost_per_min: splitMap.PUBLIC_PER_MIN?.cost_per_min ?? 2,
            creator_min_pct: splitMap.PUBLIC_PER_MIN?.creator_pct ?? 25,
            platform_min_pct: splitMap.PUBLIC_PER_MIN?.platform_pct ?? 75,
        },
        private_room: {
            min_entry_fee: splitMap.PRIVATE_ENTRY?.min_charge ?? 20,
            creator_entry_pct: splitMap.PRIVATE_ENTRY?.creator_pct ?? 50,
            platform_entry_pct: splitMap.PRIVATE_ENTRY?.platform_pct ?? 50,
            cost_per_min: splitMap.PRIVATE_PER_MIN?.cost_per_min ?? 5,
            creator_min_pct: splitMap.PRIVATE_PER_MIN?.creator_pct ?? 50,
            platform_min_pct: splitMap.PRIVATE_PER_MIN?.platform_pct ?? 50,
        },
        exceptions: {
            suga4u_favorites_creator_pct: splitMap.SUGA4U_FAVORITES?.creator_pct ?? 100,
            competition_tips_creator_pct: splitMap.COMPETITION_TIPS?.creator_pct ?? 100,
        },
        ticket_rules: {
            validity_hours: 24,
            validity_note: "Ticket valid for 24 hours OR 1 session (whichever is shorter). Exit and re-enter freely once paid.",
        },
    });
}

function getHardcodedDefaults() {
    return {
        GLOBAL:           { split_key: "GLOBAL",           creator_pct: 85,  platform_pct: 15,  entry_fee: null, cost_per_min: null, min_charge: null },
        PUBLIC_ENTRY:     { split_key: "PUBLIC_ENTRY",     creator_pct: 0,   platform_pct: 100, entry_fee: 10,   cost_per_min: null, min_charge: null },
        PUBLIC_PER_MIN:   { split_key: "PUBLIC_PER_MIN",   creator_pct: 25,  platform_pct: 75,  entry_fee: null, cost_per_min: 2,    min_charge: null },
        PRIVATE_ENTRY:    { split_key: "PRIVATE_ENTRY",    creator_pct: 50,  platform_pct: 50,  entry_fee: null, cost_per_min: null, min_charge: 20  },
        PRIVATE_PER_MIN:  { split_key: "PRIVATE_PER_MIN",  creator_pct: 50,  platform_pct: 50,  entry_fee: null, cost_per_min: 5,    min_charge: 5   },
        SUGA4U_FAVORITES: { split_key: "SUGA4U_FAVORITES", creator_pct: 100, platform_pct: 0,   entry_fee: null, cost_per_min: null, min_charge: null },
        COMPETITION_TIPS: { split_key: "COMPETITION_TIPS", creator_pct: 100, platform_pct: 0,   entry_fee: null, cost_per_min: null, min_charge: null },
    };
}
