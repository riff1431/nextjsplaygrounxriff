import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Filter list
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();

    // Ideally filter by status or params, but simplest is fetch all for creator workspace
    const { data: confessions, error } = await supabase
        .from("confessions")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ confessions });
}

// POST: Create
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();

    const { title, teaser, content, mediaUrl, type, tier, status } = body;

    const { data: newConfession, error } = await supabase
        .from("confessions")
        .insert([{
            room_id: roomId,
            title,
            teaser,
            content,
            media_url: mediaUrl,
            type,
            tier,
            status: status || 'Draft',
            price: 0 // In real app, looked up from tier map
        }])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, confession: newConfession });
}
