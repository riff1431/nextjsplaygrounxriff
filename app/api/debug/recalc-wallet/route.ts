import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/debug/recalc-wallet
 * Recalculate wallet balances from ALL completed transactions.
 * 
 * ?all=true → recalculate ALL users' wallets (admin only)
 * default  → recalculate only the current user's wallet
 */
export async function GET(request: Request) {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 });

    const url = new URL(request.url);
    const fixAll = url.searchParams.get('all') === 'true';

    if (fixAll) {
        // Verify admin role
        const { data: profile } = await admin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 });
        }

        // Get ALL wallets
        const { data: wallets, error: wErr } = await admin
            .from('wallets')
            .select('id, user_id, balance');

        if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

        const results: any[] = [];

        for (const w of (wallets || [])) {
            const { data: txs } = await admin
                .from('transactions')
                .select('type, amount, status')
                .eq('user_id', w.user_id)
                .eq('status', 'completed');

            let incoming = 0;
            let outgoing = 0;
            (txs || []).forEach((tx: any) => {
                const amt = Number(tx.amount);
                if (tx.type === 'deposit' || tx.type === 'credit' || tx.type === 'admin_credit') {
                    incoming += amt;
                } else if (tx.type === 'debit' || tx.type === 'withdrawal' || tx.type === 'transfer' || tx.type === 'admin_debit') {
                    outgoing += amt;
                }
            });

            const correctBalance = Math.max(0, incoming - outgoing);
            const oldBalance = Number(w.balance);

            if (Math.abs(oldBalance - correctBalance) > 0.005) {
                await admin
                    .from('wallets')
                    .update({ balance: correctBalance })
                    .eq('id', w.id);

                results.push({
                    user_id: w.user_id,
                    oldBalance,
                    newBalance: correctBalance,
                    incoming,
                    outgoing,
                });
            }
        }

        return NextResponse.json({
            success: true,
            totalWallets: wallets?.length ?? 0,
            fixed: results.length,
            details: results,
        });
    }

    // Single user recalc
    const { data: allTxs, error: txErr } = await admin
        .from('transactions')
        .select('type, amount, status')
        .eq('user_id', user.id)
        .eq('status', 'completed');

    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

    let incoming = 0;
    let outgoing = 0;
    (allTxs || []).forEach((tx: any) => {
        const amt = Number(tx.amount);
        if (tx.type === 'deposit' || tx.type === 'credit' || tx.type === 'admin_credit') {
            incoming += amt;
        } else if (tx.type === 'debit' || tx.type === 'withdrawal' || tx.type === 'transfer' || tx.type === 'admin_debit') {
            outgoing += amt;
        }
    });

    const correctBalance = Math.max(0, incoming - outgoing);

    const { data: wallet } = await admin
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

    const oldBalance = Number(wallet?.balance ?? 0);

    await admin
        .from('wallets')
        .update({ balance: correctBalance })
        .eq('user_id', user.id);

    return NextResponse.json({
        success: true,
        oldBalance,
        newBalance: correctBalance,
        totalIncoming: incoming,
        totalOutgoing: outgoing,
        transactionCount: allTxs?.length ?? 0,
        message: `Balance corrected from €${oldBalance.toFixed(2)} to €${correctBalance.toFixed(2)}`,
    });
}
