import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRevenueSplit } from "@/utils/finance/applyRevenueSplit";
import { getServerCurrencySymbol } from "@/utils/serverCurrency";

/**
 * POST /api/v1/rooms/[roomId]/flash-drops/request
 * Fan sends a drop request.
 * Body: { content: string, amount: number }
 *
 * GET /api/v1/rooms/[roomId]/flash-drops/request
 * Get drop requests for this room.
 *
 * PATCH /api/v1/rooms/[roomId]/flash-drops/request
 * Creator accepts/declines a request.
 * Body: { requestId: string, status: 'accepted'|'declined' }
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const SYM = await getServerCurrencySymbol();
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    let query = supabase
        .from("flash_drop_requests")
        .select("*").eq("room_id", roomId)
        .order("created_at", { ascending: false });

    if (sessionId) query = query.eq("session_id", sessionId);

    let { data, error } = await query;

    // Fallback if session_id column doesn't exist yet
    if (error && error.message?.includes('session_id')) {
        ({ data, error } = await supabase
            .from("flash_drop_requests")
            .select("*").eq("room_id", roomId)
            .order("created_at", { ascending: false }));
    }

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
    const { content, amount, description, sessionId, media_urls } = body;
    let finalContent = description || content || "Custom Request";

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Impulse spends and Pack purchases are instant reactions — auto-accept
    const isImpulse = finalContent.includes('Impulse') || finalContent.includes('Reaction');
    const isPack = finalContent.includes('Pack');

    // Payment with revenue split (85% creator / 15% platform)
    let splitResult: { success: boolean; newBalance?: number; error?: string } = { success: true };
    if (amount > 0 && (isImpulse || isPack)) {
        const res = await applyRevenueSplit({
            supabase,
            fanUserId: user.id,
            creatorUserId: room.host_id,
            grossAmount: amount,
            splitType: 'GLOBAL',
            description: finalContent,
            roomId,
            relatedType: 'flash_drop_request',
            relatedId: null,
            earningsCategory: 'custom_requests',
        });
        if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
        splitResult = res;
    } else if (amount > 0 && !(isImpulse || isPack)) {
        // Just verify balance exists without deducting
        const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();

        if (!wallet || wallet.balance < amount) {
            return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
        }
    }

    const { data: profile } = await supabase.from("profiles").select("username, full_name").eq("id", user.id).single();

    // For pack purchases, encode media URLs into content for the incoming notifications
    if (isPack && Array.isArray(media_urls) && media_urls.length > 0) {
        finalContent = finalContent + ' |__MEDIA__|' + JSON.stringify(media_urls);
    }

    const insertPayload: any = { room_id: roomId, fan_id: user.id, fan_name: profile?.username || "Anonymous", content: finalContent, amount, status: (isImpulse || isPack) ? 'accepted' : 'pending' };
    if (sessionId) insertPayload.session_id = sessionId;

    let { data: req, error: reqError } = await supabase
        .from("flash_drop_requests")
        .insert(insertPayload)
        .select().single();

    // Fallback if session_id column doesn't exist yet
    if (reqError && reqError.message?.includes('session_id')) {
        delete insertPayload.session_id;
        ({ data: req, error: reqError } = await supabase
            .from("flash_drop_requests")
            .insert(insertPayload)
            .select().single());
    }

    if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 });

    let systemMsg = "";
    if (finalContent.includes('Pack') || finalContent.includes('Bundle')) {
        let packName = "High Roller";
        const matchPurchased = finalContent.match(/Purchased Pack:\s*(.*?)\s*($|\(|\|__MEDIA__)/);
        const matchUnlocked = finalContent.match(/Pack Unlocked:\s*(.*?)\s*($|\(|\|__MEDIA__)/);
        
        if (matchPurchased && matchPurchased[1]) {
            packName = matchPurchased[1].trim();
        } else if (matchUnlocked && matchUnlocked[1]) {
            packName = matchUnlocked[1].trim();
        } else {
            packName = finalContent.replace(/[💎🎁]/g, '').replace('Purchased Pack:', '').replace('Pack Unlocked:', '').split('|__MEDIA__|')[0].split('(')[0].trim();
        }
        
        const capitalizedPackName = packName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const displayName = profile?.full_name || profile?.username || "Anonymous";
        systemMsg = `${displayName} purchased a ${capitalizedPackName} Pack!`;
    } else if (isImpulse) {
        systemMsg = `⚡ ${profile?.username || "Anonymous"} sent ${SYM}${amount} for ${finalContent.replace('⚡ Impulse ', '').replace('⚡ Reaction ', '').split(':')[0]}!`;
    } else {
        systemMsg = `💰 ${profile?.username || "Anonymous"} submitted a ${SYM}${amount} custom drop request!`;
    }

    // Insert System Message into Chat (Server-side to avoid duplication)
    let query = supabase
        .from("room_chat_messages")
        .select("id")
        .eq("room_id", roomId)
        .eq("is_system", true)
        .eq("message", systemMsg)
        .gt("created_at", new Date(Date.now() - 2000).toISOString())
        .limit(1);
    if (sessionId) query = query.eq("session_id", sessionId);
    const { data: existingMsg } = await query;

    if (!existingMsg || existingMsg.length === 0) {
        const insertPayload: any = {
            room_id: roomId,
            sender_id: null,
            sender_name: "System",
            message: systemMsg,
            is_system: true,
            system_type: "drop_request",
        };
        if (sessionId) insertPayload.session_id = sessionId;
        await supabase.from("room_chat_messages").insert(insertPayload);
    }

    // Only send notification for actual custom requests, not impulse reactions or pack purchases
    if (!isImpulse && !isPack) {
        await supabase.from("notifications").insert({
            user_id: room.host_id, actor_id: user.id, type: "flash_drop_request",
            message: `New drop request (${SYM}${amount}): "${finalContent}"`,
            reference_id: req.id,
        });
    }

    return NextResponse.json({ success: true, request: req, new_balance: splitResult.newBalance });
}

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const SYM = await getServerCurrencySymbol();
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { requestId, status, mediaUrl } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).single();
    if (!room || room.host_id !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const { data: requestToUpdate } = await supabase.from("flash_drop_requests").select("*").eq("id", requestId).single();

    if (status === "accepted" && requestToUpdate && requestToUpdate.status !== "accepted" && Number(requestToUpdate.amount) > 0) {
        const splitResult = await applyRevenueSplit({
            supabase,
            fanUserId: requestToUpdate.fan_id,
            creatorUserId: room.host_id,
            grossAmount: Number(requestToUpdate.amount),
            splitType: 'GLOBAL',
            description: requestToUpdate.content,
            roomId,
            relatedType: 'flash_drop_request',
            relatedId: requestToUpdate.id,
            earningsCategory: 'custom_requests',
        });

        if (!splitResult.success) {
            return NextResponse.json({ error: splitResult.error || "Payment failed (Insufficient balance)" }, { status: 400 });
        }
    }

    const updatePayload: any = { status };
    if (mediaUrl !== undefined && requestToUpdate) {
        // Encode the mediaUrl in the content column since we cannot alter the remote DB schema right now
        updatePayload.content = `${requestToUpdate.content} |__MEDIA__|${mediaUrl}`;
    }

    const { data: updated, error } = await supabase
        .from("flash_drop_requests")
        .update(updatePayload)
        .eq("id", requestId).eq("room_id", roomId)
        .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, request: updated });
}
