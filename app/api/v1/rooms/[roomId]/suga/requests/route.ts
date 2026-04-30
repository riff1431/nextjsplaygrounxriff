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

    // Validate body...
    const { type, label, note, price, fanName, sessionId } = body;

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

    const { requestId, status } = body;

    const { data: updatedRequest, error } = await supabase
        .from("suga_paid_requests")
        .update({ status })
        .eq("id", requestId)
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: updatedRequest });
}
