import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;

    // 1. Auth & Host Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('host_id, group_vote_state')
        .eq('id', roomId)
        .single();

    if (!room || room.host_id !== user.id) {
        return NextResponse.json({ error: "Only host can manage group votes" }, { status: 403 });
    }

    // 2. Parse Body
    const body = await request.json();
    const { action, label, target, price, description } = body;
    // action: 'START' | 'STOP'

    // 3. Update State based on Action
    let currentState: any = room.group_vote_state || { isActive: false };

    if (action === 'START') {
        if (!label || !target || !price) {
            return NextResponse.json({ error: "Missing fields for START" }, { status: 400 });
        }

        currentState = {
            isActive: true,
            label,
            description: description || "",
            target: Number(target),
            price: Number(price),
            current: 0 // Reset progress
        };
    } else if (action === 'STOP') {
        currentState = {
            isActive: false,
            label: "",
            description: "",
            target: 0,
            price: 0,
            current: 0
        };
    } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 4. Save to DB
    const { error: updateError } = await supabase
        .from('rooms')
        .update({ group_vote_state: currentState })
        .eq('id', roomId);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 5. Broadcast to room
    await supabase.channel(`room:${roomId}`).send({
        type: 'broadcast',
        event: 'group_vote_update',
        payload: { ...currentState }
    });

    return NextResponse.json({ success: true, state: currentState });
}
