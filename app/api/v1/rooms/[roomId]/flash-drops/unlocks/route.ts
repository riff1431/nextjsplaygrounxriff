import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/rooms/[roomId]/flash-drops/unlocks
 * Fetches the user's unlocked flash drops, bypassing RLS which prevents SELECT.
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ unlocks: [] });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from("flash_drop_unlocks")
        .select("drop_id")
        .eq("user_id", user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const unlocks = data?.map((u: any) => u.drop_id) || [];
    return NextResponse.json({ unlocks });
}
