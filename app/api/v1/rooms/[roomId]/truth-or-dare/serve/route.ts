import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from '@supabase/supabase-js';
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

    // 2. Process deferred payment (Fan -> Creator)
    // Payment was only balance-verified at request time; now we actually charge.
    const price = Number(item.amount || 0);
    const fanId = item.fan_id;

    if (price > 0 && fanId) {
        // Get room host
        const { data: room } = await supabase
            .from('rooms')
            .select('host_id')
            .eq('id', roomId)
            .single();

        if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        const hostId = room.host_id;

        // Use admin client to bypass RLS for wallet operations
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // A. Verify fan still has sufficient balance
        const { data: fanWallet } = await adminSupabase
            .from('wallets')
            .select('balance')
            .eq('user_id', fanId)
            .single();

        const fanBalance = Number(fanWallet?.balance || 0);

        if (fanBalance < price) {
            return NextResponse.json({
                error: `Fan has insufficient balance (${fanBalance.toFixed(0)} < ${price}). Cannot complete this request.`
            }, { status: 402 });
        }

        // B. Get or create creator wallet
        let creatorBalance = 0;
        const { data: creatorWallet } = await adminSupabase
            .from('wallets')
            .select('balance')
            .eq('user_id', hostId)
            .single();

        if (creatorWallet) {
            creatorBalance = Number(creatorWallet.balance || 0);
        } else {
            // Lazily create creator wallet
            const { data: creatorProfile } = await adminSupabase
                .from('profiles')
                .select('id')
                .eq('id', hostId)
                .single();

            if (!creatorProfile) {
                const { data: hostUser } = await adminSupabase.auth.admin.getUserById(hostId);
                const username = hostUser.user?.user_metadata?.full_name || hostUser.user?.email?.split('@')[0] || "Creator";
                await adminSupabase.from('profiles').insert({ id: hostId, username, full_name: username });
            }

            const { error: createError } = await adminSupabase
                .from('wallets')
                .insert({ user_id: hostId, balance: 0 })
                .select()
                .single();

            if (createError && createError.code !== '23505') {
                console.error("Failed to create creator wallet", createError);
                return NextResponse.json({ error: "System Error: Failed to init creator wallet" }, { status: 500 });
            }

            // Re-fetch in case of race condition
            if (createError?.code === '23505') {
                const { data: retryWallet } = await adminSupabase.from('wallets').select('balance').eq('user_id', hostId).single();
                creatorBalance = Number(retryWallet?.balance || 0);
            }
        }

        // C. Execute transfer
        const { error: deductError } = await adminSupabase
            .from('wallets')
            .update({ balance: fanBalance - price })
            .eq('user_id', fanId);

        if (deductError) {
            console.error("Failed to deduct fan wallet on serve:", deductError);
            return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
        }

        const { error: addError } = await adminSupabase
            .from('wallets')
            .update({ balance: creatorBalance + price })
            .eq('user_id', hostId);

        if (addError) {
            console.error("CRITICAL: Money deducted but not added to creator on serve!", { fan: fanId, host: hostId, amount: price });
            // Attempt refund
            await adminSupabase.from('wallets').update({ balance: fanBalance }).eq('user_id', fanId);
            return NextResponse.json({ error: "Payment processing failed, fan was refunded" }, { status: 500 });
        }

        console.log(`💰 Deferred payment processed on serve: Fan ${fanId} -> Creator ${hostId}, amount: ${price}`);
    }

    // 3. Determine prompt details
    let promptLabel = "Unknown Prompt";
    let promptSource = "tier";
    let promptTier = item.meta?.tier;
    let customType = null;

    if (item.type === 'TIER_PURCHASE') {
        promptSource = 'tier';
        promptLabel = item.meta?.text || `${item.meta?.tier} Challenge (Generated)`;
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

    // 4. Mark Queue Item Served & Update Request Status
    await supabase
        .from("truth_dare_queue")
        .update({ is_served: true })
        .eq("id", queueItemId);

    if (item.meta?.request_id) {
        await supabase
            .from("truth_dare_requests")
            .update({ status: 'answered', answered_at: new Date().toISOString() })
            .eq("id", item.meta.request_id);
    }

    // 5. Update game state
    const { data: game, error: updateError } = await supabase
        .from("truth_dare_games")
        .update({
            current_prompt: newPrompt,
            is_double_dare_armed: false
        })
        .eq("room_id", roomId)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 6. Broadcast question_answered event for earnings display
    try {
        const earnedAmount = price;
        const channel = supabase.channel(`room:${roomId}`);
        await channel.send({
            type: 'broadcast',
            event: 'question_answered',
            payload: {
                queueItemId,
                requestId: item.meta?.request_id,
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
