import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch Queued Messages (for initial load)
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const sessionId = request.nextUrl.searchParams.get("session_id");

    let query = supabase
        .from("x_chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "Queued")
        .order("created_at", { ascending: true }); // Oldest first for queue usually
    if (sessionId) query = query.eq("session_id", sessionId);

    const { data: messages, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages });
}

// POST: Simulate Fan Sending Message
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();

    const { senderName, body: msgBody, lane, paidAmount, session_id } = body;

    const insertPayload: any = {
        room_id: roomId,
        sender_name: senderName || "Anonymous Fan",
        body: msgBody,
        lane: lane || "Free",
        paid_amount: paidAmount || 0,
        status: "Queued"
    };
    if (session_id) insertPayload.session_id = session_id;

    const { data: newMessage, error } = await supabase
        .from("x_chat_messages")
        .insert([insertPayload])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: newMessage });
}
