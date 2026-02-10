import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { paymentIntentId } = body;

        // Fetch Stripe Secret Key
        const { data: settings } = await supabase
            .from('payment_settings')
            .select('secret_config')
            .eq('provider', 'stripe')
            .single();

        const secretKey = settings?.secret_config?.secret_key || process.env.STRIPE_SECRET_KEY;

        if (!secretKey) {
            console.error("Stripe Secret Key missing");
            return NextResponse.json({ error: 'System config error' }, { status: 500 });
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2024-12-18.acacia' as any,
        });

        // Retrieve the PaymentIntent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
        }

        // Verify Owner
        if (paymentIntent.metadata.userId !== user.id) {
            return NextResponse.json({ error: 'Invalid payment owner' }, { status: 403 });
        }

        const amount = paymentIntent.amount / 100; // Convert cents to dollars

        // Idempotency Check: Check if this payment ID was already processed in transactions
        // We'll search in metadata->stripe_payment_id
        const { data: existingTx } = await supabase
            .from('transactions')
            .select('id')
            .eq('metadata->>stripe_payment_id', paymentIntentId)
            .single();

        if (existingTx) {
            return NextResponse.json({ success: true, message: "Already processed" });
        }

        // The RPC `add_funds` likely creates a transaction, but we need to ensure we tag it with the payment ID.
        // If `add_funds` creates a simple transaction, we might need to update it or insert our own.
        // Let's assume for now `add_funds` is simple. 
        // To ensure we have the payment ID, let's update the latest transaction for this user or modify the approach.
        // BETTER APPROACH: Don't use RPC if we can't control it fully.
        // Let's do it manually here securely.

        // 1. Get Wallet
        const { data: wallet } = await supabase.from('wallets').select('id, balance').eq('user_id', user.id).single();
        if (!wallet) throw new Error("Wallet not found");

        // 2. Insert Transaction
        const { error: txError } = await supabase.from('transactions').insert({
            wallet_id: wallet.id,
            user_id: user.id,
            amount: amount,
            type: 'deposit',
            description: `Top Up via Stripe`,
            status: 'completed',
            payment_method: 'stripe',
            metadata: {
                stripe_payment_id: paymentIntentId,
                stripe_amount: paymentIntent.amount
            }
        });

        if (txError) throw txError;

        // 3. Update Balance
        const { error: updateError } = await supabase
            .from('wallets')
            .update({ balance: wallet.balance + amount })
            .eq('id', wallet.id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, newBalance: wallet.balance + amount });

    } catch (err: any) {
        console.error("Error confirming wallet payment:", err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
