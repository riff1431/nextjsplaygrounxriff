import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("exec_sql", { sql: "ALTER TABLE flash_drop_requests ADD COLUMN IF NOT EXISTS media_url TEXT;" });
    
    return NextResponse.json({ success: !error, error, data });
}
