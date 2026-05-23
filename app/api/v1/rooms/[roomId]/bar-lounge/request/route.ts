import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";
import { getServerCurrencySymbol } from "@/utils/serverCurrency";

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
    "song", "champagne", "vip_bottle", "tip", "drink", "vip", "booth", "pin", "custom",
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
        "custom_request": "custom",
        "custom request": "custom",
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
    const SYM = await getServerCurrencySymbol();
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
    const SYM = await getServerCurrencySymbol();
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { type, label, amount, sessionId } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!type || amount === undefined || (amount <= 0 && type !== 'custom')) {
        return NextResponse.json({ error: "Missing fields or invalid amount" }, { status: 400 });
    }

    // Normalise type to allowed constraint values
    const safeType = normaliseType(type, label);

    // Get room creator
    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Get fan profile name
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();

    // Determine earnings category: drinks & tips are 'tips', VIP/booth/pin are 'custom_requests'
    const isTipLike = ['drink', 'tip', 'champagne', 'vip_bottle'].includes(safeType);
    const isApprovalRequiredRequest = ['vip', 'booth', 'custom'].includes(safeType);
    const earningsCategory = isTipLike ? 'tips' : 'custom_requests';
    const relatedType = isTipLike ? 'tip' : 'bar_request';
    // Approval required requests start as 'pending' and require creator approval
    const initialStatus = isApprovalRequiredRequest ? 'pending' : undefined;

    // Payment with revenue split (85% creator / 15% platform) (Skip if free/0 or delayed approval)
    let splitResult: { success: boolean; newBalance?: number; error?: string } = { success: true };
    if (amount > 0 && !isApprovalRequiredRequest) {
        const res = await applyRevenueSplit({
            supabase,
            fanUserId: user.id,
            creatorUserId: room.host_id,
            grossAmount: amount,
            splitType: 'GLOBAL',
            description: `Bar Lounge: ${label || type}`,
            roomId,
            relatedType,
            relatedId: null,
            earningsCategory,
        });
        if (!res.success) return NextResponse.json({ error: res.error || "Payment failed" }, { status: 400 });
        splitResult = res;
    } else if (amount > 0 && isApprovalRequiredRequest) {
        // Just verify balance exists without deducting
        const { data: wallet, error: walletError } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();

        if (walletError || !wallet || wallet.balance < amount) {
            return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
        }
    }

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
            ...(sessionId ? { session_id: sessionId } : {}),
            ...(initialStatus ? { status: initialStatus } : {}),
        })
        .select().single();

    if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 });

    // Notification
    await supabase.from("notifications").insert({
        user_id: room.host_id, actor_id: user.id, type: "bar_request",
        message: `${profile?.username || "Fan"} ordered ${label || type} (${SYM}${amount})`,
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
                                        : safeType === "custom" ? "📩"
                                            : "⚡";

    // For tip-like items, use "Sent" language; for custom requests, use "requested"
    const verb = isTipLike ? 'Sent' : (safeType === 'custom' ? 'sent a custom request' : (safeType === 'vip' ? 'bought' : 'bought'));
    const amountStr = amount > 0 ? ` (${SYM}${amount})` : '';
    
    // Skip posting Custom/VIP/Booth requests to the chat feed during pending state.
    // They will only appear in the Creator's Incoming notifications panel and get posted in PATCH when accepted.
    if (safeType !== 'custom' && !isApprovalRequiredRequest) {
        // For VIP, always use the fixed title "VIP Access" — never the user's typed label
        const chatLabel = safeType === 'vip' ? 'VIP Access' : (label || type);
        await supabase.from("bar_lounge_messages").insert({
            room_id: roomId,
            user_id: user.id,
            handle: profile?.username || "Fan",
            content: `${emoji} ${profile?.username || "Fan"} ${verb} ${chatLabel}${amountStr}`,
            is_system: true,
            ...(sessionId ? { session_id: sessionId } : {}),
        });
    }

    return NextResponse.json({ success: true, request: req, new_balance: splitResult.newBalance });
}

/**
 * PATCH for updating request status (creator accepts/declines)
 */
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const SYM = await getServerCurrencySymbol();
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { requestId, status, creatorReply } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify room host
    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room || room.host_id !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    // Fetch existing request to check current status, amount, and type
    const { data: existingRequest, error: fetchReqError } = await supabase
        .from("bar_lounge_requests")
        .select("*")
        .eq("id", requestId)
        .single();
    
    if (fetchReqError || !existingRequest) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Process delayed payment for approval-required requests on transition to accepted
    if (status === 'accepted' && existingRequest.status !== 'accepted' && ['vip', 'booth', 'custom'].includes(existingRequest.type) && existingRequest.amount > 0) {
        const { createAdminClient } = await import("@/utils/supabase/admin");
        const adminClient = createAdminClient();
        
        const res = await applyRevenueSplit({
            supabase: adminClient,
            fanUserId: existingRequest.fan_id,
            creatorUserId: room.host_id,
            grossAmount: existingRequest.amount,
            splitType: 'GLOBAL',
            description: `Bar Lounge: ${existingRequest.label || existingRequest.type}`,
            roomId,
            relatedType: 'bar_request',
            relatedId: existingRequest.id,
            earningsCategory: 'custom_requests',
        });

        if (!res.success) {
            return NextResponse.json({ error: res.error || "Payment failed (Insufficient balance)" }, { status: 400 });
        }
    }

    const updatePayload: any = { status };
    if (creatorReply !== undefined) {
        updatePayload.creator_reply = creatorReply;
    }

    const { data: updated, error } = await supabase
        .from("bar_lounge_requests")
        .update(updatePayload)
        .eq("id", requestId)
        .eq("room_id", roomId)
        .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Post system message to the chat feed on successful acceptance/charge
    if (status === 'accepted' && existingRequest.status !== 'accepted' && ['vip', 'booth', 'custom'].includes(existingRequest.type)) {
        const emoji =
            existingRequest.type === "vip" ? "👑"
                : existingRequest.type === "booth" ? "🛋️"
                    : existingRequest.type === "custom" ? "📩"
                        : "⚡";
        
        const verb = existingRequest.type === 'vip' ? 'upgraded to' : (existingRequest.type === 'booth' ? 'reserved a' : 'purchased');
        const chatLabel = existingRequest.type === 'vip' ? 'VIP Access' : (existingRequest.type === 'booth' ? 'VIP Booth' : (existingRequest.label || existingRequest.type));
        const amountStr = existingRequest.amount > 0 ? ` (${SYM}${existingRequest.amount})` : '';

        // Fetch fan profile name for message
        const { data: fanProfile } = await supabase.from("profiles").select("username").eq("id", existingRequest.fan_id).single();
        const fanName = fanProfile?.username || existingRequest.fan_name || "Fan";

        await supabase.from("bar_lounge_messages").insert({
            room_id: roomId,
            user_id: existingRequest.fan_id,
            handle: fanName,
            content: `${emoji} ${fanName} ${verb} ${chatLabel}${amountStr}`,
            is_system: true,
            ...(existingRequest.session_id ? { session_id: existingRequest.session_id } : {}),
        });
    }

    return NextResponse.json({ success: true, request: updated });
}
