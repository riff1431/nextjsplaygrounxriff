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
            return NextResponse.json({ error: 'System config error' }, { status: 500 });
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2024-12-18.acacia' as any,
        });

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
        }

        // Verify Owner
        if (paymentIntent.metadata.userId !== user.id) {
            return NextResponse.json({ error: 'Invalid payment owner' }, { status: 403 });
        }

        // Idempotency: Check if we already processed this? 
        // For profile updates, re-running is mostly harmless (idempotent by nature), 
        // but we should log the transaction.

        const amount = paymentIntent.amount / 100;
        const { planType, planId, planName } = paymentIntent.metadata;

        // 1. Insert Transaction Record
        // We'll use a generic 'transactions' or 'payments' table if available, or just rely on Stripe.
        // But let's insert into 'transactions' for consistency if it supports non-wallet types.
        // 'transactions' table seems linked to 'wallet_id'. 
        // If this payment isn't wallet-based, we might not have a wallet_id easily?
        // Let's check if user has a wallet, if so, log it there?
        // Or just Log to a `payment_history` table?
        // For MVP, we'll skip the transaction log if it's complex, or try to get wallet.

        let walletId = null;
        const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', user.id).maybeSingle();
        if (wallet) walletId = wallet.id;

        if (walletId) {
            const { error: txError } = await supabase.from('transactions').insert({
                wallet_id: walletId,
                user_id: user.id,
                amount: amount,
                type: 'payment', // vs 'deposit'
                description: `Payment for ${planName || planType}`,
                status: 'completed',
                payment_method: 'stripe',
                metadata: {
                    stripe_payment_id: paymentIntentId,
                    planType,
                    planId
                }
            });
            // Ignore error if duplicate? or log it.
        }

        // 2. Update Profile based on Plan Type
        const updateData: any = {};

        if (planType === 'account_type') {
            updateData.account_type_id = planId;
            updateData.pending_account_type_id = null; // Clear pending if any
        } else if (planType === 'creator_level') {
            updateData.creator_level_id = planId;
        } else if (planType === 'membership') {
            // Assuming simplified membership level
            updateData.membership_level = planId;
        }

        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id);

            if (updateError) throw updateError;
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Error confirming membership payment:", err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
