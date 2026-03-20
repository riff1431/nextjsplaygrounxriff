import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json();

        if (!userId || typeof userId !== "string") {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // 1. Verify the caller is an admin
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
            .single();

        if (callerProfile?.role !== "admin") {
            return NextResponse.json(
                { error: "Access denied: Only admins can delete users" },
                { status: 403 }
            );
        }

        // 2. Prevent self-deletion
        if (userId === caller.id) {
            return NextResponse.json(
                { error: "Cannot delete your own account" },
                { status: 400 }
            );
        }

        // 3. Delete profile row (and related data via cascades)

        const { error: profileError } = await adminClient
            .from("profiles")
            .delete()
            .eq("id", userId);

        if (profileError) {
            console.error("Profile delete error:", profileError);
            // Continue to auth deletion even if profile delete fails
        }

        // 4. Delete from auth.users using admin API
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
