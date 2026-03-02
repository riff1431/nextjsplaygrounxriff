import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/rooms/[roomId]/x-chat/request
 * Fan creates a chat request
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { message } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get fan profile name
    const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", user.id)
        .single();

    const fanName = profile?.full_name || profile?.username || "Anonymous";

    const { data: req, error } = await supabase
        .from("x_chat_requests")
        .insert({
            room_id: roomId,
            fan_id: user.id,
            fan_name: fanName,
            message: message || "Wants to chat",
            avatar_url: profile?.avatar_url,
            status: "pending",
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, request: req });
}

/**
 * PATCH /api/v1/rooms/[roomId]/x-chat/request
 * Creator accepts or declines a request
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

    if (!["accepted", "declined"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
        .from("x_chat_requests")
        .update({ status })
        .eq("id", requestId)
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, request: updated });
}
