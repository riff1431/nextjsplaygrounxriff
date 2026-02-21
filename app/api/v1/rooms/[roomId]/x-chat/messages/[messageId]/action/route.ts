import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; messageId: string }> }
) {
    const params = await props.params;
    const { roomId, messageId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { action, reply } = body; // action: 'answer' | 'refund' | 'pin'

    let updates: any = {};

    if (action === 'answer') {
        updates.status = 'Answered';
        if (reply) updates.creator_reply = reply;
    } else if (action === 'refund') {
        updates.status = 'Refunded';
    } else if (action === 'pin') {
        updates.status = 'Pinned';
    } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
        .from("x_chat_messages")
        .update(updates)
        .eq("id", messageId)
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: updated });
}
