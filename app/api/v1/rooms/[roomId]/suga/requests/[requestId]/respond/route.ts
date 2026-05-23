import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST: Creator responds to a custom request with text + media
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; requestId: string }> }
) {
    const params = await props.params;
    const { roomId, requestId } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { responseText, responseMediaUrl } = body;

    if (!responseText && !responseMediaUrl) {
        return NextResponse.json({ error: "Please provide a response text or media" }, { status: 400 });
    }

    // Fetch existing request
    const { data: existingReq, error: fetchError } = await supabase
        .from("suga_paid_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (fetchError || !existingReq) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existingReq.status !== "accepted" && Number(existingReq.price) > 0) {
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

    const updatePayload: any = {
        status: "accepted",
        response_text: responseText || null,
        response_media_url: responseMediaUrl || null,
        updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
        .from("suga_paid_requests")
        .update(updatePayload)
        .eq("id", requestId)
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: updated });
}
