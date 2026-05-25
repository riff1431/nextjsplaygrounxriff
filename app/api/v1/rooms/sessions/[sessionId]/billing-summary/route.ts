import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────────────────────────────
// GET /api/v1/rooms/sessions/[sessionId]/billing-summary
// Creator-facing billing summary. Uses cookie-based client for session lookup
// (so RLS is respected) and adminClient for billing records/participants.
// ──────────────────────────────────────────────────────────────────────────
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;

    if (!sessionId || sessionId === "undefined" || sessionId === "null" || sessionId.length < 10) {
        return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    try {
        // Use cookie-based client for session — respects RLS (creator can read own session)
        const supabase = await createClient();
        const adminClient = createAdminClient();

        // ── 1. Session lookup via cookie client ───────────────────────
        const { data: session } = await supabase
            .from("room_sessions")
            .select("id, creator_id, room_type, session_type, is_private, cost_per_min, status")
            .eq("id", sessionId)
            .maybeSingle();                  // maybeSingle → no error if 0 rows

        // If cookie auth fails (no session), fall back to adminClient
        const effectiveSession = session ?? await (async () => {
            const { data } = await adminClient
                .from("room_sessions")
                .select("id, creator_id, room_type, session_type, is_private, cost_per_min, status")
                .eq("id", sessionId)
                .maybeSingle();
            return data;
        })();

        if (!effectiveSession) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // ── 2. Room settings ──────────────────────────────────────────
        const { data: settings } = await adminClient
            .from("room_settings")
            .select("billing_enabled, public_cost_per_min, min_private_cost_per_min")
            .eq("room_type", effectiveSession.room_type || "")
            .maybeSingle();

        const billingEnabled = settings ? (settings.billing_enabled ?? true) : true;
        const isPrivate = effectiveSession.session_type === "private" || effectiveSession.is_private;
        const publicRate = settings ? Number(settings.public_cost_per_min) : 2;
        const minPrivateRate = settings ? Number(settings.min_private_cost_per_min) : 5;
        const effectiveRate = !billingEnabled
            ? 0
            : isPrivate
            ? Math.max(Number(effectiveSession.cost_per_min) || minPrivateRate, minPrivateRate)
            : publicRate;

        // ── 3. Billing records (creator earnings) ────────────────────
        const { data: records } = await adminClient
            .from("session_billing_records")
            .select("fan_id, amount, creator_share, created_at")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: false });

        const safeRecords = records || [];
        const grossCollected = safeRecords.reduce((s, r) => s + Number(r.amount), 0);
        const creatorEarned = safeRecords.reduce((s, r) => s + Number(r.creator_share ?? r.amount), 0);
        const uniqueBilledFans = new Set(safeRecords.map(r => r.fan_id)).size;
        const totalMinutesBilled = safeRecords.length;
        const lastChargeAt = safeRecords[0]?.created_at ?? null;

        // ── 4. Live participant count ─────────────────────────────────
        const { data: participants } = await adminClient
            .from("room_session_participants")
            .select("user_id")
            .eq("session_id", sessionId)
            .neq("user_id", effectiveSession.creator_id);

        const liveFanCount = participants ? participants.length : 0;
        const fanCount = liveFanCount > 0 ? liveFanCount : uniqueBilledFans;

        return NextResponse.json({
            total_earned: Number(creatorEarned.toFixed(2)),
            gross_collected: Number(grossCollected.toFixed(2)),
            fan_count: fanCount,
            live_fan_count: liveFanCount,
            billed_fan_count: uniqueBilledFans,
            total_minutes_billed: totalMinutesBilled,
            rate: effectiveRate,
            billing_enabled: billingEnabled,
            last_charge_at: lastChargeAt,
            session_type: effectiveSession.session_type,
        });

    } catch (err: any) {
        console.error("[billing-summary] Error:", err.message, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
