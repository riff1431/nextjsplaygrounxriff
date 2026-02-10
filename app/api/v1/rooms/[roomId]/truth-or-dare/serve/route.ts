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
    const { data: item, error: fetchError } = await supabase
        .from("truth_dare_queue")
        .select("*")
        .eq("id", queueItemId)
        .single();

    if (fetchError || !item) {
        return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
    }

    // 2. Determine prompt details
    let promptLabel = "Unknown Prompt";
    let promptSource = "tier";
    let promptTier = item.meta?.tier;
    let customType = null;

    // Simple mock logic for generating prompt text from tier if not custom
    if (item.type === 'TIER_PURCHASE') {
        promptSource = 'tier';
        // In production, fetch from a "prompts" table. 
        // For now, we'll generate a generic one or pass it from client? 
        // Ideally server-side generation.
        promptLabel = `${item.meta?.tier} Challenge (Generated)`;
    } else if (item.type === 'CUSTOM_TRUTH' || item.type === 'CUSTOM_DARE') {
        promptSource = 'custom';
        promptLabel = item.meta?.text;
        customType = item.type === 'CUSTOM_TRUTH' ? 'truth' : 'dare';
    }

    const newPrompt = {
        id: item.id,
        label: promptLabel,
        source: promptSource,
        tier: promptTier,
        customType,
        purchaser: item.fan_name,
        startedAt: Date.now(),
        durationSeconds: 60
    };

    // 3. Update Game State (set current prompt) & Mark Queue Item Served
    // We can transaction this or just do sequentially.

    // Mark served
    await supabase
        .from("truth_dare_queue")
        .update({ is_served: true })
        .eq("id", queueItemId);

    // Update game
    const { data: game, error: updateError } = await supabase
        .from("truth_dare_games")
        .update({
            current_prompt: newPrompt,
            is_double_dare_armed: false // Consume armed status
        })
        .eq("room_id", roomId)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Broadcast question_answered event for earnings display
    try {
        const earnedAmount = item.meta?.amount || 0;
        const channel = supabase.channel(`room:${roomId}`);
        await channel.send({
            type: 'broadcast',
            event: 'question_answered',
            payload: {
                queueItemId,
                requestId: item.request_id,
                fanName: item.fan_name,
                type: item.type,
                tier: item.meta?.tier,
                earnedAmount,
                timestamp: Date.now()
            }
        });
        console.log('📢 Broadcast question_answered event, earned:', earnedAmount);
    } catch (broadcastError) {
        console.error('Failed to broadcast question_answered:', broadcastError);
    }

    return NextResponse.json({ success: true, game });
}
