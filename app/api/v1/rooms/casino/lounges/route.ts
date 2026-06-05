import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get("gameType");
    const status = searchParams.get("status");

    try {
        let query = supabase
            .from("casino_lounges")
            .select(`
                *,
                room:rooms(status)
            `);

        if (gameType && gameType !== "All Games") {
            query = query.eq("game_type", gameType);
        }

        if (status) {
            query = query.eq("status", status);
        } else {
            query = query.in("status", ["live", "scheduled"]);
        }

        const { data: lounges, error } = await query.order("start_time", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ success: true, lounges });
    } catch (err: any) {
        console.error("List casino lounges error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
