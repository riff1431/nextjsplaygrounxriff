import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch pending/accepted requests
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const sessionId = request.nextUrl.searchParams.get("sessionId");

    let query = supabase
        .from("suga_paid_requests")
        .select("*")
        .eq("room_id", roomId)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false });
    if (sessionId) query = query.eq("session_id", sessionId);
    const { data: requests, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests });
}

// POST: Create a request (Debug/Simulated Fan)
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();

    // Validate body...
    const { type, label, note, price, fanName, sessionId, customText } = body;

    // Check balance if authenticated and price > 0
    if (user && price > 0) {
        const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();
        if (!wallet || wallet.balance < price) {
            return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
        }
    }

    const insertPayload: any = {
        room_id: roomId,
        type,
        label,
        note,
        price,
        fan_name: fanName || "Anonymous",
        status: "pending"
    };
    if (sessionId) insertPayload.session_id = sessionId;
    if (customText) insertPayload.custom_text = customText;

    const { data: newRequest, error } = await supabase
        .from("suga_paid_requests")
        .insert([insertPayload])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also log activity
    const actInsert: any = {
        room_id: roomId,
        type: "PAID_REQUEST",
        fan_name: fanName || "Anonymous",
        fan_id: user?.id || null,
        label,
        amount: price
    };
    if (sessionId) actInsert.session_id = sessionId;
    await supabase
        .from("suga_activity_events")
        .insert([actInsert]);

    return NextResponse.json({ success: true, request: newRequest });
}

// PATCH: Update request status
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();

    const { requestId, status, responseText, responseMediaUrl } = body;

    // Fetch existing request
    const { data: existingReq, error: fetchError } = await supabase
        .from("suga_paid_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (fetchError || !existingReq) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (status === "accepted" && existingReq.status !== "accepted" && Number(existingReq.price) > 0) {
        // 1. Resolve fan_id
        let fanId: string | null = null;
        const { data: actEvent } = await supabase
            .from("suga_activity_events")
            .select("fan_id")
            .eq("room_id", roomId)
            .eq("type", "PAID_REQUEST")
            .eq("fan_name", existingReq.fan_name)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (actEvent && actEvent.fan_id) {
            fanId = actEvent.fan_id;
        }

        if (!fanId) {
            const { data: profileByUsername } = await supabase
                .from("profiles")
                .select("id")
                .eq("username", existingReq.fan_name)
                .limit(1)
                .maybeSingle();
            if (profileByUsername) {
                fanId = profileByUsername.id;
            } else {
                const { data: profileByFullName } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("full_name", existingReq.fan_name)
                    .limit(1)
                    .maybeSingle();
                if (profileByFullName) {
                    fanId = profileByFullName.id;
                }
            }
        }

        if (!fanId) {
            return NextResponse.json({ error: "Could not resolve fan profile" }, { status: 400 });
        }

        // 2. Fetch room creator
        const { data: room } = await supabase
            .from("rooms")
            .select("host_id")
            .eq("id", roomId)
            .single();

        if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        // 3. Apply revenue split split deduction on acceptance
        const { applyRevenueSplit } = await import("@/utils/finance/applyRevenueSplit");
        const splitResult = await applyRevenueSplit({
            supabase,
            fanUserId: fanId,
            creatorUserId: room.host_id,
            grossAmount: Number(existingReq.price),
            splitType: 'GLOBAL',
            description: `Suga4U Action accepted: ${existingReq.label}`,
            roomId,
            relatedType: 'suga_request',
            relatedId: existingReq.id,
            earningsCategory: 'custom_requests',
        });

        if (!splitResult.success) {
            return NextResponse.json({ error: splitResult.error || "Payment failed (Insufficient balance)" }, { status: 400 });
        }
    }

    const updatePayload: any = { status };
    if (responseText !== undefined) updatePayload.response_text = responseText;
    if (responseMediaUrl !== undefined) updatePayload.response_media_url = responseMediaUrl;

    const { data: updatedRequest, error } = await supabase
        .from("suga_paid_requests")
        .update(updatePayload)
        .eq("id", requestId)
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: updatedRequest });
}
