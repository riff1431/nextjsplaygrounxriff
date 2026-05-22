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

        // ── Pre-Cleanup Phase: Clean transitive relations that lack ON DELETE CASCADE ──
        // Delete refunds first because they reference transactions
        try {
            const { data: userTxIds, error: txFetchErr } = await adminClient
                .from("transactions")
                .select("id")
                .eq("user_id", userId);

            if (!txFetchErr && userTxIds && userTxIds.length > 0) {
                const txIds = userTxIds.map((t: any) => t.id);
                const { error: refundErr } = await adminClient
                    .from("refunds")
                    .delete()
                    .in("transaction_id", txIds);
                if (refundErr) {
                    console.warn(`[DELETE] Cleanup refunds:`, refundErr.message);
                }
            }
        } catch (txErr: any) {
            console.warn(`[DELETE] Pre-cleanup refunds error:`, txErr.message);
        }

        // ── Phase 1: Clean tables that reference auth.users(id) WITHOUT ON DELETE CASCADE ──
        const authUserCleanup = [
            { table: "followers", column: "follower_id" },
            { table: "followers", column: "following_id" },
            { table: "payment_transactions", column: "user_id" },
            { table: "revenue_events", column: "fan_user_id" },
            { table: "revenue_events", column: "creator_user_id" },
            { table: "revenue_events", column: "sender_id" },
            { table: "bar_lounge_messages", column: "user_id" },
            { table: "bar_lounge_requests", column: "fan_id" },
            { table: "transactions", column: "user_id" },
            { table: "reports", column: "reporter_id" },
        ];

        for (const { table, column } of authUserCleanup) {
            const { error } = await adminClient
                .from(table)
                .delete()
                .eq(column, userId);
            if (error) {
                console.warn(`[DELETE] Cleanup ${table}.${column}:`, error.message);
            }
        }

        // Nullify nullable FK references (preserve audit trail)
        const authUserNullify = [
            { table: "audit_logs", column: "actor_id" },
            { table: "admin_settings", column: "updated_by" },
        ];

        for (const { table, column } of authUserNullify) {
            const { error } = await adminClient
                .from(table)
                .update({ [column]: null })
                .eq(column, userId);
            if (error) {
                console.warn(`[DELETE] Nullify ${table}.${column}:`, error.message);
            }
        }

        // ── Phase 2: Clean tables that reference profiles(id) WITHOUT ON DELETE CASCADE ──
        //    These must be cleaned BEFORE deleting the profile row.

        // Pre-clean payment_transactions room references (since payment_transactions.room_id is NOT ON DELETE CASCADE)
        try {
            const { data: userRooms, error: roomsFetchErr } = await adminClient
                .from("rooms")
                .select("id")
                .eq("host_id", userId);

            if (!roomsFetchErr && userRooms && userRooms.length > 0) {
                const roomIds = userRooms.map((r: any) => r.id);
                const { error: payTxErr } = await adminClient
                    .from("payment_transactions")
                    .delete()
                    .in("room_id", roomIds);
                if (payTxErr) {
                    console.warn(`[DELETE] Cleanup payment_transactions for rooms:`, payTxErr.message);
                }
            }
        } catch (roomErr: any) {
            console.warn(`[DELETE] Pre-cleanup rooms error:`, roomErr.message);
        }

        const profileCleanup = [
            { table: "wallets", column: "user_id" },
            { table: "room_session_participants", column: "user_id" },
            { table: "room_sessions", column: "creator_id" },
            { table: "notifications", column: "actor_id" },
            { table: "notifications", column: "user_id" },
            { table: "payouts", column: "creator_id" },
            { table: "flash_drop_unlocks", column: "user_id" },
            { table: "flash_drop_roller_packs", column: "creator_id" },
            { table: "flash_drop_requests", column: "fan_id" },
            { table: "x_chat_messages", column: "sender_id" },
            { table: "x_chat_sessions", column: "fan_id" },
            { table: "x_chat_sessions", column: "creator_id" },
            { table: "x_chat_requests", column: "fan_id" },
            { table: "x_chat_reactions", column: "fan_id" },
            { table: "competition_participants", column: "user_id" },
            { table: "competition_votes", column: "voter_user_id" },
            { table: "competition_tips", column: "tipper_user_id" },
        ];

        for (const { table, column } of profileCleanup) {
            const { error } = await adminClient
                .from(table)
                .delete()
                .eq(column, userId);
            if (error) {
                console.warn(`[DELETE] Profile-ref cleanup ${table}.${column}:`, error.message);
            }
        }

        // Nullify nullable profile FK references
        const profileNullify = [
            { table: "kyc_submissions", column: "reviewed_by" },
        ];

        for (const { table, column } of profileNullify) {
            const { error } = await adminClient
                .from(table)
                .update({ [column]: null })
                .eq(column, userId);
            if (error) {
                console.warn(`[DELETE] Nullify profile-ref ${table}.${column}:`, error.message);
            }
        }

        // ── Phase 3: Delete profile row (cascades will handle wallets, notifications.user_id, etc.) ──
        const { error: profileError } = await adminClient
            .from("profiles")
            .delete()
            .eq("id", userId);

        if (profileError) {
            console.error("[DELETE] Profile delete error:", profileError);
            // Don't return early — try auth deletion anyway
        }

        // ── Phase 4: Delete from auth.users using admin API ──
        const { error: authError } =
            await adminClient.auth.admin.deleteUser(userId);

        if (authError) {
            console.error("[DELETE] Auth delete error:", authError);
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
