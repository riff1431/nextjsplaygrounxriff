
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_TRUTHS, SYSTEM_DARES } from "@/utils/truth_dare_prompts";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const supabase = await createClient();
    const { roomId } = await params;

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { type, tier, content: customContent, amount: customAmount } = body;
        // type: 'system_truth' | 'system_dare' | 'custom_truth' | 'custom_dare'

        // 2. Determine Price and Content
        let price = 0;
        let finalContent = "";

        if (type.startsWith('system_')) {
            // Pricing Logic
            if (tier === 'bronze') price = 5;
            else if (tier === 'silver') price = 10;
            else if (tier === 'gold') price = 20;
            else return NextResponse.json({ error: "Invalid tier" }, { status: 400 });

            // Random Content Logic
            const category = type === 'system_truth' ? SYSTEM_TRUTHS : SYSTEM_DARES;
            // @ts-ignore
            const pool = category[tier];
            if (!pool) return NextResponse.json({ error: "Invalid tier pool" }, { status: 400 });

            finalContent = pool[Math.floor(Math.random() * pool.length)];
        } else {
            // Custom Logic
            price = Number(customAmount);
            finalContent = customContent;

            // Validate minimums
            const minPrice = type === 'custom_truth' ? 25 : 35;
            if (price < minPrice) {
                return NextResponse.json({ error: `Minimum price is $${minPrice}` }, { status: 400 });
            }
        }

        // 3. Get Room Host (to pay them)
        const { data: room } = await supabase
            .from('rooms')
            .select('host_id')
            .eq('id', roomId)
            .single();

        if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
        const hostId = room.host_id;

        // 4. Process Payment (Transfer Fan -> Creator)

        // A. Check Fan Balance
        const { data: fanWallet } = await supabase
            .from('wallets')
            .select('balance, id')
            .eq('user_id', user.id)
            .single();

        const fanBalance = Number(fanWallet?.balance || 0);

        if (fanBalance < price) {
            return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
        }

        // B. Get Creator Wallet
        const { data: creatorWallet } = await supabase
            .from('wallets')
            .select('balance, id')
            .eq('user_id', hostId)
            .single();

        // If creator has no wallet, we technically can't pay them. 
        // In a real app we'd handle this gracefully (queueing funds), but for now fail fast.
        // If creator has no wallet, lazily create one
        let creatorBalance = 0;

        if (!creatorWallet) {
            console.log("Creator has no wallet, creating one...");
            const { data: newWallet, error: createError } = await supabase
                .from('wallets')
                .insert({ user_id: hostId, balance: 0 })
                .select()
                .single();

            if (createError) {
                console.error("Failed to create creator wallet", createError);
                return NextResponse.json({ error: "Creator wallet system error" }, { status: 500 });
            }
            creatorBalance = 0;
        } else {
            creatorBalance = Number(creatorWallet.balance || 0);
        }

        // C. Execute Transfer (Ideally in a Transaction/RPC, doing sequentially for MVP)
        // Deduct from Fan
        const { error: deductError } = await supabase
            .from('wallets')
            .update({ balance: fanBalance - price })
            .eq('user_id', user.id);

        if (deductError) throw deductError;

        // Add to Creator
        // creatorBalance is already set above

        const { error: addError } = await supabase
            .from('wallets')
            .update({ balance: creatorBalance + price })
            .eq('user_id', hostId);

        if (addError) {
            // CRITICAL: Failed to add funds after deduction. 
            // In prod, refund user or log critical alert. 
            console.error("CRITICAL: Money deducted but not added to creator!", { fan: user.id, host: hostId, amount: price });
        }

        // 5. Record Request
        const { data: newRequest, error: reqError } = await supabase
            .from('truth_dare_requests')
            .insert({
                room_id: roomId,
                fan_id: user.id,
                type,
                tier,
                content: finalContent,
                amount: price,
                status: 'pending'
            })
            .select()
            .single();

        if (reqError) throw reqError;

        return NextResponse.json({ success: true, request: newRequest });

    } catch (error: any) {
        console.error("Interaction Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
