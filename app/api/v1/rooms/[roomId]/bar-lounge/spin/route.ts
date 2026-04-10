import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/bar-lounge/spin
 * Fan spins the wheel (pays from wallet). Prize determined server-side.
 * Body: { amount: number }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { amount } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Payment with revenue split (85% creator / 15% platform)
    const splitResult = await applyRevenueSplit({
        supabase,
        fanUserId: user.id,
        creatorUserId: room.host_id,
        grossAmount: amount || 10,
        splitType: 'GLOBAL',
        description: "Bar Lounge: Spin the Wheel",
        roomId,
        relatedType: 'bar_spin',
        relatedId: null,
        earningsCategory: 'reactions',
    });

    if (!splitResult.success) return NextResponse.json({ error: splitResult.error || "Payment failed" }, { status: 400 });

    // Get spin odds from bar_settings or admin_bar_config
    let spinOdds: any[] = [];
    const { data: barSettings } = await supabase
        .from("bar_settings")
        .select("spin_odds")
        .eq("room_id", roomId)
        .single();

    if (barSettings?.spin_odds) {
        spinOdds = barSettings.spin_odds;
    } else {
        const { data: adminConfig } = await supabase
            .from("admin_bar_config")
            .select("spin_odds")
            .eq("id", 1)
            .single();
        spinOdds = adminConfig?.spin_odds || [];
    }

    // Calculate result based on odds
    let selectedResult = "Try Again";
    let selectedReward = "";
    if (spinOdds.length > 0) {
        const totalOdds = spinOdds.reduce((sum: number, o: any) => sum + (o.odds || 0), 0);
        let roll = Math.random() * totalOdds;
        for (const option of spinOdds) {
            roll -= option.odds || 0;
            if (roll <= 0) {
                selectedResult = option.label || "Try Again";
                selectedReward = option.note || "";
                break;
            }
        }
    }

    // Record spin
    const { data: spin, error: spinError } = await supabase
        .from("bar_lounge_spins")
        .insert({ room_id: roomId, fan_id: user.id, result: selectedResult, reward: selectedReward })
        .select().single();

    if (spinError) return NextResponse.json({ error: spinError.message }, { status: 500 });

    return NextResponse.json({
        success: true,
        spin,
        result: selectedResult,
        reward: selectedReward,
        new_balance: splitResult.newBalance,
    });
}
