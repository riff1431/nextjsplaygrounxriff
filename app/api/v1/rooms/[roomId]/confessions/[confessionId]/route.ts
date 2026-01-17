import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH: Update
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; confessionId: string }> }
) {
    const params = await props.params;
    const { roomId, confessionId } = params;
    const supabase = await createClient();
    const body = await request.json();

    // Allow updating any field
    const { title, teaser, content, mediaUrl, type, tier, status } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (teaser !== undefined) updates.teaser = teaser;
    if (content !== undefined) updates.content = content;
    if (mediaUrl !== undefined) updates.media_url = mediaUrl;
    if (type !== undefined) updates.type = type;
    if (tier !== undefined) updates.tier = tier;
    if (status !== undefined) updates.status = status;

    const { data: updated, error } = await supabase
        .from("confessions")
        .update(updates)
        .eq("id", confessionId)
        .eq("room_id", roomId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, confession: updated });
}

// DELETE: Remove (or hard delete)
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; confessionId: string }> }
) {
    const params = await props.params;
    const { roomId, confessionId } = params;
    const supabase = await createClient();

    const { error } = await supabase
        .from("confessions")
        .delete()
        .eq("id", confessionId)
        .eq("room_id", roomId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
