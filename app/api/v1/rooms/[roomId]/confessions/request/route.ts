import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * GET /api/v1/rooms/[roomId]/confessions/request
 * Fan: get their own confession requests for this room.
 *
 * POST /api/v1/rooms/[roomId]/confessions/request
 * Fan submits a confession request (pay from wallet).
 *
 * Body: { type: 'Text'|'Audio'|'Video', topic: string, amount: number, fan_name?: string, is_anonymous?: boolean }
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is creator (host) of this room
    const { data: room } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", roomId)
        .single();

    let query = supabase
        .from("confession_requests")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

    // If fan, only show their own requests. If creator, show all.
    if (room?.host_id !== user.id) {
        query = query.eq("fan_id", user.id);
    }

    const { data: requests, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: requests || [] });
}

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { type, topic, amount, fan_name, is_anonymous, confession_mode } = body;
    const mode = confession_mode === 'global' ? 'global' : '1on1';

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!type || !topic || !amount || amount <= 0) {
        return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    // Get room to find creator
    const { data: room } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", roomId)
        .single();

    if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const creatorId = room.host_id;

    // For 1on1: transfer funds immediately to the creator with split
    // For global: hold funds (no transfer yet — funds move when a creator accepts)
    if (mode === '1on1') {
        const splitResult = await applyRevenueSplit({
            supabase,
            fanUserId: user.id,
            creatorUserId: creatorId,
            grossAmount: amount,
            splitType: 'GLOBAL',
            description: `Confession request: ${type} - ${topic}`,
            roomId,
            relatedType: 'confession_request',
            relatedId: null,
            earningsCategory: 'custom_requests',
        });

        if (!splitResult.success) {
            return NextResponse.json(
                { error: splitResult.error || "Payment failed" },
                { status: 400 }
            );
        }
    } else {
        // Global: verify the fan has enough balance
        const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();

        if (!wallet || wallet.balance < amount) {
            return NextResponse.json(
                { error: "Insufficient balance" },
                { status: 400 }
            );
        }
    }

    // Create the request
    const { data: req, error: reqError } = await supabase
        .from("confession_requests")
        .insert({
            room_id: roomId,
            fan_id: user.id,
            creator_id: creatorId,
            type,
            topic,
            amount,
            fan_name: is_anonymous ? 'Anonymous' : (fan_name || 'Anonymous'),
            is_anonymous: is_anonymous ?? true,
            confession_mode: mode,
            status: "pending_approval",
        })
        .select()
        .single();

    if (reqError) {
        return NextResponse.json({ error: reqError.message }, { status: 500 });
    }

    // Notification for creator
    await supabase.from("notifications").insert({
        user_id: creatorId,
        actor_id: user.id,
        type: "confession_request",
        message: `New ${type} confession request ($${amount}): "${topic}"`,
        reference_id: req.id,
    });

    return NextResponse.json({ success: true, request: req });
}
