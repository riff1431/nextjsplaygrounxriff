import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * POST /api/admin/confessions/bulk-delete
 * Admin-only: Deletes multiple confessions by ID.
 * Body: { ids: string[] }
 */
export async function POST(req: NextRequest) {
    try {
        const { ids } = await req.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: "Missing or empty ids array" },
                { status: 400 }
            );
        }

        // 1. Auth: verify caller is admin
        const supabase = await createClient();
        const {
            data: { user: caller },
        } = await supabase.auth.getUser();

        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminClient = createAdminClient();

        const { data: callerProfile } = await adminClient
            .from("profiles")
            .select("role")
            .eq("id", caller.id)
            .maybeSingle();

        const isAdmin =
            callerProfile?.role === "admin" ||
            caller.user_metadata?.role === "admin" ||
            caller.app_metadata?.role === "admin";

        if (!isAdmin) {
            return NextResponse.json(
                { error: "Access denied: Admin only" },
                { status: 403 }
            );
        }

        // 2. Clean up associated confession_unlocks first
        const { error: unlockErr } = await adminClient
            .from("confession_unlocks")
            .delete()
            .in("confession_id", ids);

        if (unlockErr) {
            console.warn("[ADMIN BULK DELETE] Cleanup unlocks error:", unlockErr.message);
        }

        // 3. Delete the confessions
        const { error: deleteErr, count } = await adminClient
            .from("confessions")
            .delete()
            .in("id", ids);

        if (deleteErr) {
            return NextResponse.json(
                { error: "Failed to delete confessions: " + deleteErr.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            deleted: ids.length,
        });
    } catch (err: any) {
        console.error("[ADMIN BULK DELETE] Error:", err);
        return NextResponse.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}
