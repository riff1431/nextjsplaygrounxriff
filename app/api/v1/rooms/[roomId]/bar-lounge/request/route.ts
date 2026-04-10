import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";

/**
 * POST /api/v1/rooms/[roomId]/bar-lounge/request
 * Fan sends a request (drink/tip/vip/booth/pin/song/champagne/vip_bottle).
 * Body: { type, label, amount }
 *
 * GET /api/v1/rooms/[roomId]/bar-lounge/request
 * Get all requests for this room.
 */

// Allowed types in bar_lounge_requests check constraint
const ALLOWED_TYPES = new Set([
    "song", "champagne", "vip_bottle", "tip", "drink", "vip", "booth", "pin",
]);

// Normalise any incoming type to a constraint-safe value
function normaliseType(type: string, label?: string): string {
    const t = (type || "").toLowerCase().trim();
    if (ALLOWED_TYPES.has(t)) return t;

    // Map common UI aliases
    const aliases: Record<string, string> = {
        "vip upgrade": "vip",
        "vip_upgrade": "vip",
        "booth reservation": "booth",
        "booth_reservation": "booth",
        "pin name to top": "pin",
        "pin_name": "pin",
        "champagne bottle": "champagne",
        "champagne_bottle": "champagne",
        "vip bottle": "vip_bottle",
        "vip_bottle_drink": "vip_bottle",
    };

    const alias = aliases[t] || aliases[(label || "").toLowerCase().trim()];
    if (alias) return alias;

    // Fallback — any drink-like thing is "drink"
    return "drink";
}

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("bar_lounge_requests")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ requests: data || [] });
}

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { type, label, amount } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!type || !amount || amount <= 0) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Normalise type to allowed constraint values
    const safeType = normaliseType(type, label);

    // Get room creator
    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Get fan profile name
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();

    // Payment with revenue split (85% creator / 15% platform)
    const splitResult = await applyRevenueSplit({
        supabase,
        fanUserId: user.id,
        creatorUserId: room.host_id,
        grossAmount: amount,
        splitType: 'GLOBAL',
        description: `Bar Lounge: ${label || type}`,
        roomId,
        relatedType: 'bar_request',
        relatedId: null,
        earningsCategory: 'custom_requests',
    });

    if (!splitResult.success) return NextResponse.json({ error: splitResult.error || "Payment failed" }, { status: 400 });

    // Insert request with safe type
    const { data: req, error: reqError } = await supabase
        .from("bar_lounge_requests")
        .insert({
            room_id: roomId,
            fan_id: user.id,
            fan_name: profile?.username || "Anonymous",
            type: safeType,
            label,
            amount,
        })
        .select().single();

    if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 });

    // Notification
    await supabase.from("notifications").insert({
        user_id: room.host_id, actor_id: user.id, type: "bar_request",
        message: `${profile?.username || "Fan"} ordered ${label || type} ($${amount})`,
        reference_id: req.id,
    });

    // System message in chat feed
    const emoji =
        safeType === "drink" ? "🍸"
            : safeType === "champagne" ? "🥂"
                : safeType === "vip_bottle" ? "🍾"
                    : safeType === "tip" ? "💰"
                        : safeType === "vip" ? "👑"
                            : safeType === "booth" ? "🛋️"
                                : safeType === "pin" ? "📌"
                                    : safeType === "song" ? "🎵"
                                        : "⚡";

    await supabase.from("bar_lounge_messages").insert({
        room_id: roomId,
        user_id: user.id,
        handle: profile?.username || "Fan",
        content: `${emoji} ${profile?.username || "Fan"} ${safeType === "tip" ? "sent a" : "bought"} ${label || type} ($${amount})`,
        is_system: true,
    });

    return NextResponse.json({ success: true, request: req, new_balance: splitResult.newBalance });
}

/**
 * PATCH for updating request status (creator accepts/declines)
 */
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { requestId, status } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify room host
    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room || room.host_id !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const { data: updated, error } = await supabase
        .from("bar_lounge_requests")
        .update({ status })
        .eq("id", requestId)
        .eq("room_id", roomId)
        .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, request: updated });
}
