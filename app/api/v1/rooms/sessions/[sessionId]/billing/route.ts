import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

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
            .select("id, creator_id, room_id, title, status, session_type, is_private, cost_per_min")
            .eq("id", sessionId)
            .single();

        if (!session || session.status !== "active") {
            return NextResponse.json({ error: "Session is not active" }, { status: 400 });
        }

        if (session.creator_id === user.id) {
            return NextResponse.json({ error: "Creator is not billed" }, { status: 400 });
        }

        // Determine rate and split type
        const isPrivate = session.session_type === 'private' || session.is_private;
        const rate = isPrivate
            ? Math.max(session.cost_per_min || 5, 5) // Private: min $5/min
            : 2; // Public: $2/min
        const splitType = isPrivate ? 'PRIVATE_PER_MIN' : 'PUBLIC_PER_MIN';

        // Get last billing record for this session + fan
        const { data: lastBilling } = await supabase
            .from("session_billing_records")
            .select("minute_number")
            .eq("session_id", sessionId)
            .eq("fan_id", user.id)
            .order("minute_number", { ascending: false })
            .limit(1)
            .single();

        const minuteNumber = (lastBilling?.minute_number || 0) + 1;

        // Apply revenue split
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
        });

        if (!splitResult.success) {
            return NextResponse.json({
                error: splitResult.error || "Insufficient balance — auto-eject",
                auto_eject: true,
            }, { status: 402 });
        }

        // Record billing
        const { error: billingError } = await supabase
            .from("session_billing_records")
            .insert({
                session_id: sessionId,
                fan_id: user.id,
                minute_number: minuteNumber,
                amount: rate,
                creator_share: splitResult.creatorShare,
                platform_share: splitResult.platformShare,
            });

        if (billingError) {
            console.error("Billing record insert error:", billingError);
        }

        return NextResponse.json({
            success: true,
            minute_number: minuteNumber,
            amount: rate,
            creator_share: splitResult.creatorShare,
            platform_share: splitResult.platformShare,
            new_balance: splitResult.newBalance,
            total_billed: minuteNumber * rate,
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
    const { sessionId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: records, error } = await supabase
            .from("session_billing_records")
            .select("*")
            .eq("session_id", sessionId)
            .eq("fan_id", user.id)
            .order("minute_number", { ascending: true });

        if (error) throw error;

        const totalBilled = (records || []).reduce((sum, r) => sum + Number(r.amount), 0);

        return NextResponse.json({
            records: records || [],
            total_minutes: records?.length || 0,
            total_billed: totalBilled,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
