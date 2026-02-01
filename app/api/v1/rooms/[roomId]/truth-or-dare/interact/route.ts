
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from '@supabase/supabase-js';
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

    // Fetch fan name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();

    const fanName = profile?.full_name || profile?.username || user.email?.split('@')[0] || 'Anonymous';


    try {
        const body = await request.json();
        const { type, tier, content: customContent, amount: customAmount } = body;
        // type: 'system_truth' | 'system_dare' | 'custom_truth' | 'custom_dare'

        // 2. Determine Price and Content
        let price = 0;
        let finalContent = "";

        if (type.startsWith('system_')) {
            // Determine Message Content
            // type format: system_truth, system_dare
            const interactionType = type.split('_')[1] as 'truth' | 'dare'; // truth or dare

            // Fetch Dynamic Pricing
            // Default pricing
            let price = 0;
            const defaults = {
                bronze: 5,
                silver: 10,
                gold: 20
            };

            const { data: settings } = await supabase
                .from('admin_settings')
                .select('value')
                .eq('key', 'global_pricing')
                .single();

            const config = settings?.value || {};
            // specific key e.g., system_truth_bronze
            const configKey = `${type}_${tier}`;

            if (config[configKey]) {
                price = Number(config[configKey]);
            } else {
                // Fallback
                if (tier === 'bronze') price = defaults.bronze;
                else if (tier === 'silver') price = defaults.silver;
                else if (tier === 'gold') price = defaults.gold;
                else return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
            }

            // Determine Message Content (Random from DB)
            // ... (rest of logic continues)

            // Try fetching from DB
            let pool: string[] = [];

            // Use 'supabase' (user client) since we allowed public read on system_prompts
            const { data: dbPrompts } = await supabase
                .from('system_prompts')
                .select('content')
                .eq('type', interactionType)
                .eq('tier', tier);

            if (dbPrompts && dbPrompts.length > 0) {
                pool = dbPrompts.map((p: { content: string }) => p.content);
            } else {
                // Fallback to constants
                if (interactionType === 'truth') {
                    // @ts-ignore
                    pool = SYSTEM_TRUTHS[tier] || SYSTEM_TRUTHS['bronze'];
                } else {
                    // @ts-ignore
                    pool = SYSTEM_DARES[tier] || SYSTEM_DARES['bronze'];
                }
            }

            finalContent = pool[Math.floor(Math.random() * pool.length)];
        } else if (type === 'tip') {
            // Tip Logic
            price = Number(customAmount);
            if (price <= 0) {
                return NextResponse.json({ error: "Tip amount must be positive" }, { status: 400 });
            }
            finalContent = "Sent a tip!";
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
            console.log("Creator wallet not visible to fan, using Admin client...");

            // USE SERVICE ROLE to bypass RLS
            const adminSupabase = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // 1. Try to GET wallet again as Admin (in case it exists but RLS hid it)
            const { data: existingWallet } = await adminSupabase
                .from('wallets')
                .select('balance, id')
                .eq('user_id', hostId)
                .single();

            if (existingWallet) {
                creatorBalance = Number(existingWallet.balance || 0);
            } else {
                // Wallet TRULY doesn't exist. Create it.

                // A. Ensure Profile Exists
                const { data: profile } = await adminSupabase
                    .from('profiles')
                    .select('id')
                    .eq('id', hostId)
                    .single();

                if (!profile) {
                    console.log("Creator profile missing, creating placeholder...");
                    const { data: hostUser } = await adminSupabase.auth.admin.getUserById(hostId);
                    const username = hostUser.user?.user_metadata?.full_name || hostUser.user?.email?.split('@')[0] || "Creator";

                    const { error: profileError } = await adminSupabase
                        .from('profiles')
                        .insert({
                            id: hostId,
                            username: username,
                            full_name: username
                        });

                    // Ignore duplicate key error on profile (race condition safe)
                    if (profileError && profileError.code !== '23505') {
                        console.error("Failed to create creator profile", profileError);
                        return NextResponse.json({ error: "System Error: Failed to init creator profile: " + profileError.message }, { status: 500 });
                    }
                }

                // B. Create Wallet
                const { data: newWallet, error: createError } = await adminSupabase
                    .from('wallets')
                    .insert({ user_id: hostId, balance: 0 })
                    .select()
                    .single();

                if (createError) {
                    // One last check for race condition
                    if (createError.code === '23505') {
                        // It was created in parallel, just fetch it (or assume 0 for now to proceed)
                        const { data: retryWallet } = await adminSupabase.from('wallets').select('balance').eq('user_id', hostId).single();
                        creatorBalance = Number(retryWallet?.balance || 0);
                    } else {
                        console.error("Failed to create creator wallet", createError);
                        return NextResponse.json({ error: "System Error: Failed to init creator wallet: " + createError.message }, { status: 500 });
                    }
                } else {
                    creatorBalance = 0;
                }
            }
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
                status: 'pending',
                fan_name: fanName
            })
            .select()
            .single();

        if (reqError) throw reqError;

        // 6. Add to Active Queue (Actionable Item for Creator)
        // Determine Queue Type
        let queueType = 'TIER_PURCHASE'; // Default
        if (type === 'custom_truth') queueType = 'CUSTOM_TRUTH';
        else if (type === 'custom_dare') queueType = 'CUSTOM_DARE';
        else if (type === 'tip') queueType = 'TIP';
        else if (type === 'system_truth' || type === 'system_dare') queueType = 'TIER_PURCHASE';

        const { error: queueError } = await supabase
            .from('truth_dare_queue')
            .insert({
                room_id: roomId,
                fan_id: user.id,
                fan_name: fanName,
                type: queueType,
                amount: price,
                status: 'pending',
                meta: {
                    tier: tier,
                    text: finalContent, // The prompt
                    request_id: newRequest.id
                }
            });

        if (queueError) {
            console.error("Failed to add to queue:", queueError);
            // Non-fatal, creator can still see it in history/requests list if implemented, 
            // but for now we just log it. Request is paid and recorded.
        }

        return NextResponse.json({ success: true, request: newRequest });

    } catch (error: any) {
        console.error("Interaction Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
