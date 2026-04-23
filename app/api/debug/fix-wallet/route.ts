import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/debug/fix-wallet
 * One-time cleanup: delete bogus "credit" transactions from self-transfers
 * (where a plan purchase used transfer_funds with same user as sender+receiver).
 * Uses admin client to bypass RLS.
 */
export async function GET() {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 });

    // Find credit transactions that were created by self-transfers for plan purchases
    const { data: bogus, error: findErr } = await admin
        .from('transactions')
        .select('id, type, amount, description')
        .eq('user_id', user.id)
        .eq('type', 'credit')
        .or('description.ilike.%account_type%,description.ilike.%membership%,description.ilike.%creator_level%');

    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });

    if (bogus && bogus.length > 0) {
        const ids = bogus.map(t => t.id);
        const { error: delErr } = await admin
            .from('transactions')
            .delete()
            .in('id', ids);

        if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

        // Also recalculate and sync wallet balance
        const { data: allTxs } = await admin
            .from('transactions')
            .select('type, amount, status')
            .eq('user_id', user.id)
            .eq('status', 'completed');

        let incoming = 0, outgoing = 0;
        (allTxs || []).forEach((tx: any) => {
            const amt = Number(tx.amount);
            if (tx.type === 'deposit' || tx.type === 'credit') incoming += amt;
            else if (tx.type === 'debit' || tx.type === 'withdrawal' || tx.type === 'transfer') outgoing += amt;
        });
        const correctBalance = Math.max(0, incoming - outgoing);

        await admin.from('wallets').update({ balance: correctBalance }).eq('user_id', user.id);

        return NextResponse.json({
            fixed: true,
            deleted: bogus,
            newBalance: correctBalance,
            message: `Deleted ${bogus.length} bogus credit(s). Balance corrected to €${correctBalance.toFixed(2)}`,
        });
    }

    return NextResponse.json({ fixed: false, message: 'No bogus transactions found' });
}
