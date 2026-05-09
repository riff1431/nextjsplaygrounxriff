import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/truth-or-dare/entry
 * Fan pays entry fee to join Truth or Dare.
 * Uses admin client for session lookups (bypasses RLS)
 * Body: { amount?: number }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const admin = createAdminClient();
    const body = await request.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if already entered
    const { data: existing } = await admin
        .from("truth_dare_entries")
        .select("id").eq("room_id", roomId).eq("fan_id", user.id).single();

    if (existing) return NextResponse.json({ success: true, alreadyEntered: true });

    // Look up the current active session for session-scoped access (admin bypasses RLS)
    const { data: activeSession } = await admin
        .from("truth_dare_sessions")
        .select("id")
        .eq("room_id", roomId)
        .in("status", ["active", "pending"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const currentSessionId = activeSession?.id || null;

    const { data: room } = await admin.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Get entry price from game settings
    const { data: game } = await admin.from("truth_dare_games").select("unlock_price").eq("room_id", roomId).single();
    const amount = body.amount || game?.unlock_price || 10;

    // Payment with revenue split (50% creator / 50% platform for entry)
    // applyRevenueSplit uses its own supabase client internally, pass admin for RPC calls
    const splitResult = await applyRevenueSplit({
        supabase: admin,
        fanUserId: user.id,
        creatorUserId: room.host_id,
        grossAmount: amount,
        splitType: 'PRIVATE_ENTRY',
        description: "Truth or Dare: Entry Fee",
        roomId,
        relatedType: 'td_entry',
        relatedId: null,
        earningsCategory: 'entry_fees',
    });

    if (!splitResult.success) return NextResponse.json({ error: splitResult.error || "Payment failed" }, { status: 400 });

    const { data: entry, error: insertError } = await admin
        .from("truth_dare_entries")
        .insert({ room_id: roomId, fan_id: user.id, amount, session_id: currentSessionId })
        .select().single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // Also insert into truth_dare_unlocks for backward-compatible access checks
    await admin
        .from("truth_dare_unlocks")
        .upsert({ room_id: roomId, fan_id: user.id, amount, session_id: currentSessionId }, { onConflict: "room_id,fan_id" })
        .select();

    return NextResponse.json({ success: true, entry, new_balance: splitResult.newBalance });
}

/**
 * GET /api/v1/rooms/[roomId]/truth-or-dare/entry
 * Check if fan has paid entry.
 * Uses admin client for session/entry lookups (bypasses RLS)
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ hasAccess: false });

    // Look up the current active session (admin bypasses RLS)
    const { data: activeSession } = await admin
        .from("truth_dare_sessions")
        .select("id")
        .eq("room_id", roomId)
        .in("status", ["active", "pending"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const currentSessionId = activeSession?.id || null;

    // Check truth_dare_entries (scoped to session)
    let entryQuery = admin.from("truth_dare_entries")
        .select("id").eq("room_id", roomId).eq("fan_id", user.id);
    if (currentSessionId) entryQuery = entryQuery.eq("session_id", currentSessionId);
    const { data } = await entryQuery.single();

    // Also check truth_dare_unlocks (scoped to session)
    let unlockQuery = admin.from("truth_dare_unlocks")
        .select("id").eq("room_id", roomId).eq("fan_id", user.id);
    if (currentSessionId) unlockQuery = unlockQuery.eq("session_id", currentSessionId);
    const { data: unlock } = await unlockQuery.single();

    return NextResponse.json({ hasAccess: !!(data || unlock) });
}
