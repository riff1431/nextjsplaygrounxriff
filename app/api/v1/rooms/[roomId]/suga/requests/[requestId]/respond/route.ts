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
