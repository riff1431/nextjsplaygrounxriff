import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/payments/wallet/balance
 * Get current user's wallet balance.
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create wallet
    let { data: wallet, error } = await supabase
        .from("wallets")
        .select("id, balance, currency, updated_at")
        .eq("user_id", user.id)
        .single();

    if (error && error.code === "PGRST116") {
        // No wallet yet — create one
        const { data: newWallet, error: createError } = await supabase
            .from("wallets")
            .insert({ user_id: user.id, balance: 0, currency: "USD" })
            .select("id, balance, currency, updated_at")
            .single();

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }
        wallet = newWallet;
    } else if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        balance: wallet?.balance ?? 0,
        currency: wallet?.currency ?? "USD",
        wallet_id: wallet?.id,
        updated_at: wallet?.updated_at,
    });
}
