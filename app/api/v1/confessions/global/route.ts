import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/confessions/global
 * Returns all pending_approval global confession requests visible to any creator.
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: requests, error } = await supabase
        .from("confession_requests")
        .select("*")
        .eq("confession_mode", "global")
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: requests || [] });
}
