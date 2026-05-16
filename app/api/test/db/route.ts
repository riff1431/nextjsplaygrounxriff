import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = createAdminClient();
    const results: any[] = [];

    // Try adding session_id to each flash drop table
    const tables = ["flash_drops", "flash_drop_requests", "flash_drop_roller_packs"];
    
    for (const table of tables) {
        // Check if column exists by trying to select it
        const { error: checkErr } = await supabase.from(table).select("session_id").limit(1);
        if (checkErr && checkErr.message?.includes("session_id")) {
            results.push({ table, status: "column_missing_needs_manual_migration" });
        } else {
            results.push({ table, status: "column_exists_or_accessible" });
        }
    }

    return NextResponse.json({ results, note: "If columns are missing, run the SQL migration in Supabase SQL Editor: supabase/migrations/20260516_add_session_id_to_flash_drop_tables.sql" });
}
