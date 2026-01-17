import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; requestId: string }> }
) {
    const params = await props.params;
    const { roomId, requestId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { status } = body;

    const { data: updated, error } = await supabase
        .from("suga_paid_requests")
        .update({ status })
        .eq("id", requestId)
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log if accepted/fulfilled?

    return NextResponse.json({ success: true, request: updated });
}
