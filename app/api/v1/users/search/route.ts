import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/users/search?q=searchterm&role=creator
 * Live user search by full_name or username.
 * Uses admin client to bypass RLS for profile lookups.
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const admin = createAdminClient();
    const q = request.nextUrl.searchParams.get("q");

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!q || q.trim().length < 2) {
        return NextResponse.json({ users: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    const roleFilter = request.nextUrl.searchParams.get("role");

    let query = admin
        .from("profiles")
        .select("id, username, full_name, avatar_url, role")
        .neq("id", user.id)
        .or(`full_name.ilike.${searchTerm},username.ilike.${searchTerm}`)
        .limit(10);

    if (roleFilter) {
        query = query.eq("role", roleFilter);
    }

    const { data: users, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ users: users || [] });
}
