import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * POST /api/admin/users/update
 * Admin-only endpoint to update a user's wallet balance, account type, creator level, and KYC status.
 * Uses the service-role client to bypass RLS.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, walletBalance, accountTypeId, creatorLevelId, kycStatus } = body;

        if (!userId || typeof userId !== "string") {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // 1. Verify caller is authenticated
        const supabase = await createClient();
        const { data: { user: caller } } = await supabase.auth.getUser();
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Verify caller is admin using admin client (bypasses RLS)
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
            return NextResponse.json({ error: "Access denied: Admins only" }, { status: 403 });
        }

        const errors: string[] = [];

        // 3. Update wallet balance (upsert using service role — bypasses RLS)
        if (walletBalance !== undefined && walletBalance !== null && walletBalance !== "") {
            const newBalance = parseFloat(walletBalance);
            if (isNaN(newBalance) || newBalance < 0) {
                return NextResponse.json({ error: "Invalid wallet balance" }, { status: 400 });
            }

            // Get current wallet (to calculate delta for transaction log)
            const { data: currentWallet } = await adminClient
                .from("wallets")
                .select("id, balance, currency")
                .eq("user_id", userId)
                .maybeSingle();

            const previousBalance = currentWallet?.balance ?? 0;
            const currency = currentWallet?.currency ?? "EUR";

            // Upsert wallet with new balance
            const { data: upsertedWallet, error: walletError } = await adminClient
                .from("wallets")
                .upsert(
                    { user_id: userId, balance: newBalance, currency, updated_at: new Date().toISOString() },
                    { onConflict: "user_id" }
                )
                .select("id")
                .maybeSingle();

            if (walletError) {
                console.error("[ADMIN UPDATE] Wallet upsert error:", walletError);
                errors.push("Wallet update failed: " + walletError.message);
            } else {
                // Log adjustment transaction for auditing (best-effort)
                const delta = newBalance - previousBalance;
                if (delta !== 0) {
                    try {
                        const walletId = upsertedWallet?.id ?? currentWallet?.id;
                        await adminClient.from("transactions").insert({
                            wallet_id: walletId,
                            user_id: userId,
                            amount: Math.abs(delta),
                            type: delta > 0 ? "admin_credit" : "admin_debit",
                            description: `Admin balance adjustment: ${previousBalance} → ${newBalance} ${currency}`,
                            status: "completed",
                            payment_method: "admin",
                            metadata: { adjusted_by: caller.id, previous_balance: previousBalance, new_balance: newBalance },
                        });
                    } catch (txErr) {
                        console.warn("[ADMIN UPDATE] Transaction log failed (non-fatal):", txErr);
                    }
                }
            }
        }

        // 4. Build profile update payload
        const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (accountTypeId !== undefined) {
            profileUpdate.account_type_id = accountTypeId || null;
        }
        if (creatorLevelId !== undefined) {
            profileUpdate.creator_level_id = creatorLevelId || null;
        }
        if (kycStatus !== undefined && kycStatus !== "") {
            profileUpdate.kyc_status = kycStatus;
        }

        if (Object.keys(profileUpdate).length > 1) {
            const { error: profileError } = await adminClient
                .from("profiles")
                .update(profileUpdate)
                .eq("id", userId);

            if (profileError) {
                console.error("[ADMIN UPDATE] Profile update error:", profileError);
                errors.push("Profile update failed: " + profileError.message);
            }
        }

        if (errors.length > 0) {
            return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
        }

        console.log(`[ADMIN UPDATE] Admin ${caller.id} updated user ${userId}:`, {
            walletBalance, accountTypeId, creatorLevelId, kycStatus,
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[ADMIN UPDATE] Unhandled error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
