import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";
import { getServerCurrencySymbol } from "@/utils/serverCurrency";

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions/[sessionId]/billing
// Bill a fan for 1 minute of session time.
// Called by the frontend billing ticker every 60 seconds.
// Body: { minute_number?: number }
// ──────────────────────────────────────────────────
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const SYM = await getServerCurrencySymbol();
    const { sessionId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get session
        const { data: session } = await supabase
            .from("room_sessions")
            .select("id, creator_id, room_id, title, status, session_type, cost_per_min, room_type")
            .eq("id", sessionId)
            .single();

        if (!session || session.status !== "active") {
            return NextResponse.json({ error: "Session is not active" }, { status: 400 });
        }

        if (session.creator_id === user.id) {
            return NextResponse.json({ error: "Creator is not billed" }, { status: 400 });
        }

        // Fetch global settings
        const { data: globalPricingObj } = await supabase
            .from("admin_settings")
            .select("value")
            .eq("key", "global_pricing")
            .single();
        const globalPricing = globalPricingObj?.value || {};
        const globalBillingEnabled = globalPricing.per_minute_billing_enabled !== false;

        // Fetch room settings for this session's room type
        const { data: settings } = await supabase
            .from("room_settings")
            .select("*")
            .eq("room_type", session.room_type || "")
            .single();

        // Determine billing enabled (both global toggle and room toggle must be true)
        const billingEnabled = globalBillingEnabled && (settings ? (settings.billing_enabled ?? true) : true);

        // Get last billing record for this session + fan
        // Use admin client to bypass RLS (no INSERT policy exists for fans)
        const adminClient = createAdminClient();
        const { data: lastBilling } = await adminClient
            .from("session_billing_records")
            .select("minute_number")
            .eq("session_id", sessionId)
            .eq("fan_id", user.id)
            .order("minute_number", { ascending: false })
            .limit(1)
            .maybeSingle();

        const minuteNumber = (lastBilling?.minute_number || 0) + 1;

        // Determine rate
        const isPrivate = session.session_type === 'private';
        const minPrivateRate = settings ? Number(settings.min_private_cost_per_min) : 5;
        const publicRate = settings ? Number(settings.public_cost_per_min) : 2;
        const roomRate = isPrivate
            ? Math.max(Number(session.cost_per_min) || minPrivateRate, minPrivateRate)
            : publicRate;

        const freeMinutes = settings ? (settings.free_minutes ?? 1) : 1;
        
        // Effective rate is 0 if billing is disabled or if we are within the free minutes window
        const rate = !billingEnabled
            ? 0
            : (minuteNumber <= freeMinutes ? 0 : roomRate);

        const splitType = isPrivate ? 'PRIVATE_PER_MIN' : 'PUBLIC_PER_MIN';

        let creatorShare = 0;
        let platformShare = 0;
        let newBalance = null;

        if (rate > 0) {
            const creatorSplit = settings ? Number(settings.creator_split_percent ?? 85) : 85;
            const platformSplit = settings ? Number(settings.platform_split_percent ?? 15) : 15;
            const autoKick = settings ? (settings.auto_kick_on_insufficient ?? true) : true;

            // Apply revenue split with overrides
            const splitResult = await applyRevenueSplit({
                supabase,
                fanUserId: user.id,
                creatorUserId: session.creator_id,
                grossAmount: rate,
                splitType,
                description: `Per-minute billing: ${session.title} (min #${minuteNumber})`,
                roomId: session.room_id,
                relatedType: isPrivate ? 'per_min_private' : 'per_min_public',
                relatedId: sessionId,
                earningsCategory: 'per_min',
                creatorPctOverride: creatorSplit,
                platformPctOverride: platformSplit,
            });

            if (!splitResult.success) {
                return NextResponse.json({
                    error: splitResult.error || "Insufficient balance — auto-eject",
                    auto_eject: autoKick,
                }, { status: 402 });
            }

            creatorShare = splitResult.creatorShare;
            platformShare = splitResult.platformShare;
            newBalance = splitResult.newBalance;
        } else {
            // Rate is 0. We query the user's current wallet balance
            const { data: wallet } = await supabase
                .from("wallets")
                .select("balance")
                .eq("user_id", user.id)
                .maybeSingle();
            newBalance = wallet ? Number(wallet.balance) : 0;
        }

        // Record billing (use admin client to bypass RLS)
        const { error: billingError } = await adminClient
            .from("session_billing_records")
            .insert({
                session_id: sessionId,
                fan_id: user.id,
                minute_number: minuteNumber,
                amount: rate,
                creator_share: creatorShare,
                platform_share: platformShare,
            });

        if (billingError) {
            console.error("Billing record insert error:", billingError);
        }

        // Fetch sum of all billing records for this session + fan (to compute total_billed correctly)
        const { data: allRecords } = await adminClient
            .from("session_billing_records")
            .select("amount")
            .eq("session_id", sessionId)
            .eq("fan_id", user.id);
        const totalBilled = (allRecords || []).reduce((sum, r) => sum + Number(r.amount), 0);

        return NextResponse.json({
            success: true,
            minute_number: minuteNumber,
            amount: rate,
            creator_share: creatorShare,
            platform_share: platformShare,
            new_balance: newBalance,
            total_billed: totalBilled,
        });
    } catch (err: any) {
        console.error("Billing error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/sessions/[sessionId]/billing
// Get billing summary for current fan in this session.
// ──────────────────────────────────────────────────
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const SYM = await getServerCurrencySymbol();
    const { sessionId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch session to determine rate
        const { data: session } = await supabase
            .from("room_sessions")
            .select("id, session_type, cost_per_min, room_type, creator_id, room_id")
            .eq("id", sessionId)
            .single();

        let computedRate = 0;
        let billingEnabled = true;
        let freeMinutes = 1;
        let minWalletBalance = 10;
        let creatorSplitPercent = 85;
        let platformSplitPercent = 15;
        let autoKickOnInsufficient = true;
        let globalBillingEnabled = true;

        // Fetch global settings
        const { data: globalPricingObj } = await supabase
            .from("admin_settings")
            .select("value")
            .eq("key", "global_pricing")
            .single();
        const globalPricing = globalPricingObj?.value || {};
        globalBillingEnabled = globalPricing.per_minute_billing_enabled !== false;

        if (session) {
            const { data: settings } = await supabase
                .from("room_settings")
                .select("*")
                .eq("room_type", session.room_type || "")
                .single();

            billingEnabled = globalBillingEnabled && (settings ? (settings.billing_enabled ?? true) : true);
            freeMinutes = settings ? (settings.free_minutes ?? 1) : 1;
            minWalletBalance = settings ? Number(settings.min_wallet_balance ?? 10) : 10;
            creatorSplitPercent = settings ? Number(settings.creator_split_percent ?? 85) : 85;
            platformSplitPercent = settings ? Number(settings.platform_split_percent ?? 15) : 15;
            autoKickOnInsufficient = settings ? (settings.auto_kick_on_insufficient ?? true) : true;

            const isPrivate = session.session_type === 'private';
            const minPrivateRate = settings ? Number(settings.min_private_cost_per_min) : 5;
            const publicRate = settings ? Number(settings.public_cost_per_min) : 2;

            computedRate = !billingEnabled
                ? 0
                : (isPrivate
                    ? Math.max(Number(session.cost_per_min) || minPrivateRate, minPrivateRate)
                    : publicRate);
        }

        // Use admin client to bypass RLS for billing records
        const adminClient = createAdminClient();
        const { data: records, error } = await adminClient
            .from("session_billing_records")
            .select("*")
            .eq("session_id", sessionId)
            .eq("fan_id", user.id)
            .order("minute_number", { ascending: true });

        if (error) throw error;

        const totalBilled = (records || []).reduce((sum, r) => sum + Number(r.amount), 0);

        // Fetch current wallet balance so frontend can estimate remaining watch time
        const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle();
        const currentBalance = wallet ? Number(wallet.balance) : null;

        return NextResponse.json({
            records: records || [],
            total_minutes: records?.length || 0,
            total_billed: totalBilled,
            rate: computedRate,
            billing_enabled: billingEnabled,
            new_balance: currentBalance,
            free_minutes: freeMinutes,
            min_wallet_balance: minWalletBalance,
            creator_split_percent: creatorSplitPercent,
            platform_split_percent: platformSplitPercent,
            auto_kick_on_insufficient: autoKickOnInsufficient,
            global_billing_enabled: globalBillingEnabled,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
