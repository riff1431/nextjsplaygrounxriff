/**
 * GET /api/admin/earnings/creators
 *
 * Admin endpoint — list all creators with their earnings totals.
 * Query params:
 *   - year (number)   — defaults to current year
 *   - month (number)  — defaults to current month (1-12)
 *   - search (string) — filter by creator username / name
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access only' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const search = searchParams.get('search') || '';

        const admin = createAdminClient();

        const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
        const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();

        // 1. Fetch all creator profiles
        let creatorQuery = admin
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('role', 'creator')
            .order('username', { ascending: true });

        if (search) {
            creatorQuery = creatorQuery.or(
                `username.ilike.%${search}%,full_name.ilike.%${search}%`
            );
        }

        const { data: creators, error: creatorsErr } = await creatorQuery;
        if (creatorsErr) throw new Error(`Creators fetch failed: ${creatorsErr.message}`);

        if (!creators || creators.length === 0) {
            return NextResponse.json({ creators: [] });
        }

        const creatorIds = creators.map((c: any) => c.id);

        // 2. Fetch this month's events for all creators
        const { data: events, error: eventsErr } = await admin
            .from('revenue_events')
            .select(`
                creator_user_id, gross_amount,
                splits:revenue_splits(beneficiary_type, amount)
            `)
            .in('creator_user_id', creatorIds)
            .eq('status', 'succeeded')
            .gte('occurred_at', start)
            .lt('occurred_at', end);

        if (eventsErr) throw new Error(`Events fetch failed: ${eventsErr.message}`);

        // 3. Fetch lifetime ledgers for all creators
        const { data: ledgers } = await admin
            .from('creator_earnings_ledger')
            .select('creator_id, total_earned, pending_payout')
            .in('creator_id', creatorIds);

        const ledgerMap: Record<string, any> = {};
        (ledgers || []).forEach((l: any) => { ledgerMap[l.creator_id] = l; });

        // 4. Aggregate per creator
        const creatorMap: Record<string, {
            month_gross: number;
            month_earned: number;
            month_platform: number;
            month_events: number;
        }> = {};

        creatorIds.forEach((id: string) => {
            creatorMap[id] = { month_gross: 0, month_earned: 0, month_platform: 0, month_events: 0 };
        });

        (events || []).forEach((e: any) => {
            const row = creatorMap[e.creator_user_id];
            if (!row) return;
            row.month_gross += Number(e.gross_amount);
            row.month_events += 1;
            (e.splits || []).forEach((s: any) => {
                if (s.beneficiary_type === 'creator') row.month_earned += Number(s.amount);
                if (s.beneficiary_type === 'platform') row.month_platform += Number(s.amount);
            });
        });

        // 5. Build response
        const result = creators.map((c: any) => {
            const agg = creatorMap[c.id] || { month_gross: 0, month_earned: 0, month_platform: 0, month_events: 0 };
            const ledger = ledgerMap[c.id] || null;
            return {
                creator_id: c.id,
                username: c.username || 'unknown',
                full_name: c.full_name || '',
                avatar_url: c.avatar_url || null,
                month_gross: Math.round(agg.month_gross * 100) / 100,
                month_earned: Math.round(agg.month_earned * 100) / 100,
                month_platform: Math.round(agg.month_platform * 100) / 100,
                month_events: agg.month_events,
                lifetime_earned: ledger ? Math.round(Number(ledger.total_earned) * 100) / 100 : 0,
                pending_payout: ledger ? Math.round(Number(ledger.pending_payout) * 100) / 100 : 0,
            };
        });

        // Sort by month_earned descending
        result.sort((a: any, b: any) => b.month_earned - a.month_earned);

        // Platform-wide totals
        const totals = {
            total_creators: result.length,
            total_gross: Math.round(result.reduce((s: number, r: any) => s + r.month_gross, 0) * 100) / 100,
            total_creator_earned: Math.round(result.reduce((s: number, r: any) => s + r.month_earned, 0) * 100) / 100,
            total_platform: Math.round(result.reduce((s: number, r: any) => s + r.month_platform, 0) * 100) / 100,
            total_events: result.reduce((s: number, r: any) => s + r.month_events, 0),
        };

        return NextResponse.json({ creators: result, totals });
    } catch (err: any) {
        console.error('Admin creators earnings error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
