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

    const { data: requests, error } = await supabase
        .from("suga_paid_requests")
        .select("*")
        .eq("room_id", roomId)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false });

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
    const { type, label, note, price, fanName } = body;

    const { data: newRequest, error } = await supabase
        .from("suga_paid_requests")
        .insert([{
            room_id: roomId,
            type,
            label,
            note,
            price,
            fan_name: fanName || "Anonymous",
            status: "pending"
        }])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also log activity?
    await supabase
        .from("suga_activity_events")
        .insert([{
            room_id: roomId,
            type: "PAID_REQUEST",
            fan_name: fanName || "Anonymous",
            label,
            amount: price
        }]);

    return NextResponse.json({ success: true, request: newRequest });
}
