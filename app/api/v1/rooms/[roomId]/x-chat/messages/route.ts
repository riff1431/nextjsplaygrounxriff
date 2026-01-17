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

    const { data: messages, error } = await supabase
        .from("x_chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "Queued")
        .order("created_at", { ascending: true }); // Oldest first for queue usually

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

    const { senderName, body: msgBody, lane, paidAmount } = body;

    const { data: newMessage, error } = await supabase
        .from("x_chat_messages")
        .insert([{
            room_id: roomId,
            sender_name: senderName || "Anonymous Fan",
            body: msgBody,
            lane: lane || "Free",
            paid_amount: paidAmount || 0,
            status: "Queued"
        }])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: newMessage });
}
