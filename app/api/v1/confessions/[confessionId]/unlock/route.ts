import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ confessionId: string }> }
) {
    const params = await props.params;
    const { confessionId } = params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch Confession details (Price, Room Owner)
    const { data: confession, error: confError } = await supabase
        .from("confessions")
        .select("*, rooms(host_id)")
        .eq("id", confessionId)
        .single();

    if (confError || !confession) {
        return NextResponse.json({ error: "Confession not found" }, { status: 404 });
    }

    const price = Number(confession.price);
    const hostId = confession.rooms.host_id;

    // 2. Check if already unlocked
    const { data: existingUnlock } = await supabase
        .from("confession_unlocks")
        .select("id")
        .eq("user_id", user.id)
        .eq("confession_id", confessionId)
        .single();

    if (existingUnlock) {
        return NextResponse.json({ success: true, message: "Already unlocked" });
    }

    // 3. Financial Transaction
    const body = await request.json().catch(() => ({}));
    const paymentMethod = body.paymentMethod || 'wallet';

    if (paymentMethod === 'wallet') {
        // A. Check Balance
        const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();

        if (!wallet || wallet.balance < price) {
            return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
        }

        // B. Deduct API (Deduct from Fan, Add to Creator)
        const { error: deductError } = await supabase.rpc("deduct_balance", {
            p_user_id: user.id,
            p_amount: price
        });

        if (deductError) return NextResponse.json({ error: "Payment failed" }, { status: 500 });
    }

    // For external payments (Stripe/PayPal), we assume success in this MVP flow
    // In a real app, we'd verify the webhook or payment intent here

    // Add to Creator (Always add to creator regardless of source for tracking)
    // Actually, if external, we might not add to 'wallet' directly unless we auto-withdraw?
    // For MVP, let's simulates adding to creator wallet even for external, or just skip it?
    // Let's Add to Creator wallet so they see earnings.
    if (paymentMethod === 'wallet' || true) { // Always credit creator for visual MVP?
        const { error: addError } = await supabase.rpc("add_balance", {
            p_user_id: hostId,
            p_amount: price
        });
    }

    // 4. Record Unlock
    const { error: unlockError } = await supabase
        .from("confession_unlocks")
        .insert([{
            user_id: user.id,
            confession_id: confessionId,
            price_paid: price
        }]);

    if (unlockError) return NextResponse.json({ error: "Failed to record unlock" }, { status: 500 });

    return NextResponse.json({ success: true });
}
