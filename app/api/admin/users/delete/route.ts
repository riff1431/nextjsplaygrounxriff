import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json();

        if (!userId || typeof userId !== "string") {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // 1. Get the current user's session via cookies
        const supabase = await createClient();
        const {
            data: { user: caller },
        } = await supabase.auth.getUser();

        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Verify admin using the admin client (bypasses RLS completely)
        const adminClient = createAdminClient();

        const { data: callerProfile, error: profileErr } = await adminClient
            .from("profiles")
            .select("role")
            .eq("id", caller.id)
            .maybeSingle();

        console.log("[DELETE USER] Caller:", caller.id, 
            "| JWT meta role:", caller.user_metadata?.role,
            "| Profile role:", callerProfile?.role,
            "| Profile error:", profileErr?.message || "none");

        const isAdmin = 
            callerProfile?.role === "admin" || 
            caller.user_metadata?.role === "admin" ||
            caller.app_metadata?.role === "admin";

        if (!isAdmin) {
            return NextResponse.json(
                { error: "Access denied: Only admins can delete users" },
                { status: 403 }
            );
        }

        // 3. Prevent self-deletion
        if (userId === caller.id) {
            return NextResponse.json(
                { error: "Cannot delete your own account" },
                { status: 400 }
            );
        }

        // 4. Delete profile row first (and related data via cascades)
        const { error: profileError } = await adminClient
            .from("profiles")
            .delete()
            .eq("id", userId);

        if (profileError) {
            console.error("Profile delete error:", profileError);
        }

        // 5. Delete from auth.users using admin API
        const { error: authError } =
            await adminClient.auth.admin.deleteUser(userId);

        if (authError) {
            console.error("Auth delete error:", authError);
            return NextResponse.json(
                { error: "Failed to delete auth user: " + authError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Delete user error:", err);
        return NextResponse.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}
