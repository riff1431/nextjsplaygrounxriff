import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { queueItemId } = body;

    if (!queueItemId) {
        return NextResponse.json({ error: "Missing queueItemId" }, { status: 400 });
    }

    // 1. Fetch the queue item
    let { data: item, error: fetchError } = await supabase
        .from("truth_dare_queue")
        .select("*")
        .eq("id", queueItemId)
        .maybeSingle();

    if (!item) {
        // Fallback: try to find the queue item by the request_id in its meta JSONB
        const { data: fallbackItem } = await supabase
            .from("truth_dare_queue")
            .select("*")
            .eq("meta->>request_id", queueItemId)
            .maybeSingle();
        
        if (fallbackItem) {
            item = fallbackItem;
        } else {
            return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
        }
    }

    // 2. Mark queue item as served (removes it from active queue via realtime)
    const { error: serveError } = await supabase
        .from("truth_dare_queue")
        .update({ is_served: true })
        .eq("id", item.id);

    if (serveError) {
        console.error("Failed to dismiss queue item:", serveError);
        return NextResponse.json({ error: "Failed to dismiss" }, { status: 500 });
    }

    // 3. Mark the associated request as declined (no payment was ever taken)
    if (item.meta?.request_id) {
        await supabase
            .from("truth_dare_requests")
            .update({ status: 'declined', declined_at: new Date().toISOString() })
            .eq("id", item.meta.request_id);
    }

    console.log(`🚫 Queue item dismissed: ${queueItemId}, request: ${item.meta?.request_id || 'none'}`);

    return NextResponse.json({ success: true });
}
