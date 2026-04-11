/**
 * GET /api/v1/creator/earnings
 *
 * Returns the authenticated creator's earnings summary + activity.
 * Primary source: revenue_events + revenue_splits (from applyRevenueSplit)
 * Fallback: transactions table (type='credit') if revenue_events is empty
 *
 * Query params:
 *   - year (number)
 *   - month (number)
 *   - limit (number)   default 50
 *   - offset (number)  default 0
 *   - roomId (string)  optional
 *   - eventType (string) optional
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'creator') {
            return NextResponse.json({ error: 'Creator access only' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const roomId = searchParams.get('roomId');
        const eventTypeFilter = searchParams.get('eventType');

        const admin = createAdminClient();

        const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
        const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();

        // ── 1. All-time ledger — computed FRESH, no FK joins ───────────
        const { data: ledgerRow } = await admin
            .from('creator_earnings_ledger')
            .select('*')
            .eq('creator_id', user.id)
            .maybeSingle();

        const CODE_TO_COLUMN: Record<string, string> = {
            tip: 'total_tips', confession_tip: 'total_tips', session_tip: 'total_tips', td_tip: 'total_tips',
            session_reaction: 'total_reactions', xchat_reaction: 'total_reactions', reaction: 'total_reactions',
            entry_fee_private: 'total_entry_fees', entry_fee_public: 'total_entry_fees',
            suga_entry: 'total_entry_fees', td_entry: 'total_entry_fees', session_entry: 'total_entry_fees',
            per_min_private: 'total_per_min', per_min_public: 'total_per_min', xchat_session: 'total_per_min',
            drop_unlock: 'total_drops', flash_drop_unlock: 'total_drops', flash_drop_request: 'total_drops',
            suga_gift: 'total_gifts', gift: 'total_gifts',
            session_custom_request: 'total_custom_requests', custom_request: 'total_custom_requests',
            bar_request: 'total_custom_requests', confession_request: 'total_custom_requests',
            confession_bid: 'total_custom_requests', confession_unlock: 'total_custom_requests',
            competition_tip: 'total_competition_tips',
            suga_favorite: 'total_suga_favorites',
        };

        // Step A: get all succeeded event IDs + revenue_type_id for this creator
        const { data: creatorEvents } = await admin
            .from('revenue_events')
            .select('id, revenue_type_id')
            .eq('creator_user_id', user.id)
            .eq('status', 'succeeded');

        const lifetimeTotals: Record<string, number> = {
            total_earned: 0, total_tips: 0, total_reactions: 0, total_entry_fees: 0,
            total_per_min: 0, total_drops: 0, total_gifts: 0, total_custom_requests: 0,
            total_competition_tips: 0, total_suga_favorites: 0, pending_payout: 0,
        };

        if (creatorEvents && creatorEvents.length > 0) {
            const eventIds = creatorEvents.map((e: any) => e.id);
            const typeIdToEventIds: Record<number, string[]> = {};
            for (const e of creatorEvents as any[]) {
                if (!typeIdToEventIds[e.revenue_type_id]) typeIdToEventIds[e.revenue_type_id] = [];
                typeIdToEventIds[e.revenue_type_id].push(e.id);
            }

            // Step B: fetch revenue type codes
            const typeIds = [...new Set(creatorEvents.map((e: any) => e.revenue_type_id).filter(Boolean))];
            let typeCodeMap: Record<number, string> = {};
            if (typeIds.length > 0) {
                const { data: types } = await admin
                    .from('revenue_types')
                    .select('id, code')
                    .in('id', typeIds);
                types?.forEach((t: any) => { typeCodeMap[t.id] = t.code; });
            }

            // Step C: fetch all creator splits for these events
            const { data: allSplits } = await admin
                .from('revenue_splits')
                .select('revenue_event_id, beneficiary_type, amount')
                .in('revenue_event_id', eventIds)
                .eq('beneficiary_type', 'creator');

            // Step D: build event → split amount map
            const eventSplitMap: Record<string, number> = {};
            for (const s of (allSplits || []) as any[]) {
                eventSplitMap[s.revenue_event_id] = (eventSplitMap[s.revenue_event_id] || 0) + Number(s.amount);
            }

            // Step E: aggregate
            for (const e of creatorEvents as any[]) {
                const amt = eventSplitMap[e.id] || 0;
                const code = typeCodeMap[e.revenue_type_id] || '';
                lifetimeTotals.total_earned += amt;
                lifetimeTotals.pending_payout += amt;
                const col = CODE_TO_COLUMN[code];
                if (col) lifetimeTotals[col] = (lifetimeTotals[col] || 0) + amt;
            }

            Object.keys(lifetimeTotals).forEach(k => {
                lifetimeTotals[k] = Math.round(lifetimeTotals[k] * 100) / 100;
            });
        }

        // Prefer live-computed totals; fall back to ledger row if no events yet
        const ledger = lifetimeTotals.total_earned > 0
            ? { ...ledgerRow, ...lifetimeTotals }
            : (ledgerRow || lifetimeTotals);

        // ── 2. Monthly events — no FK joins, two simple queries ─────
        let monthlyEventsRaw: any[] = [];
        {
            let q = admin
                .from('revenue_events')
                .select('id, occurred_at, revenue_type_id, room_key, currency, gross_amount, fan_user_id, metadata')
                .eq('creator_user_id', user.id)
                .eq('status', 'succeeded')
                .gte('occurred_at', start)
                .lt('occurred_at', end)
                .order('occurred_at', { ascending: false });

            if (roomId) q = q.eq('room_key', roomId);
            const { data: evRaw, error: evErr } = await q;
            if (evErr) console.error('Events fetch error:', evErr);
            monthlyEventsRaw = (evRaw || []) as any[];
        }

        // Fetch splits for monthly events
        let monthlySplitMap: Record<string, { creator: number; platform: number }> = {};
        let monthlyTypeMap: Record<string, { code: string; name: string }> = {};

        if (monthlyEventsRaw.length > 0) {
            const mEventIds = monthlyEventsRaw.map((e: any) => e.id);
            const mTypeIds = [...new Set(monthlyEventsRaw.map((e: any) => e.revenue_type_id).filter(Boolean))];

            const [{ data: mSplits }, { data: mTypes }] = await Promise.all([
                admin.from('revenue_splits').select('revenue_event_id, beneficiary_type, amount').in('revenue_event_id', mEventIds),
                mTypeIds.length > 0
                    ? admin.from('revenue_types').select('id, code, name').in('id', mTypeIds)
                    : Promise.resolve({ data: [] }),
            ]);

            mTypes?.forEach((t: any) => { monthlyTypeMap[t.id] = { code: t.code, name: t.name }; });
            mSplits?.forEach((s: any) => {
                if (!monthlySplitMap[s.revenue_event_id]) monthlySplitMap[s.revenue_event_id] = { creator: 0, platform: 0 };
                if (s.beneficiary_type === 'creator') monthlySplitMap[s.revenue_event_id].creator += Number(s.amount);
                if (s.beneficiary_type === 'platform') monthlySplitMap[s.revenue_event_id].platform += Number(s.amount);
            });
        }

        let filteredEvents = monthlyEventsRaw;

        // ── 3. Fallback: transactions table ────────────────────────
        // If no revenue_events, build synthetic activity from transactions
        // (credit/deposit type entries earned by creator)
        let useFallback = filteredEvents.length === 0;
        let fallbackActivity: any[] = [];
        let fallbackGross = 0;
        let fallbackEarned = 0;

        if (useFallback) {
            const { data: txs } = await admin
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .in('type', ['credit', 'deposit'])
                .eq('status', 'completed')
                .gte('created_at', start)
                .lt('created_at', end)
                .order('created_at', { ascending: false });

            if (txs && txs.length > 0) {
                fallbackActivity = txs.map((tx: any) => ({
                    event_id: tx.id,
                    occurred_at: tx.created_at,
                    revenue_type: tx.metadata?.revenue_type || tx.type,
                    revenue_type_name: tx.description || 'Earning',
                    room_key: tx.metadata?.room_id || null,
                    gross_amount: Number(tx.amount),
                    creator_share: Number(tx.amount),
                    split_name: 'Direct',
                    fan_username: tx.metadata?.fan_username || 'Platform',
                    fan_display_name: tx.metadata?.fan_name || 'Platform',
                    fan_avatar: null,
                }));
                fallbackGross = txs.reduce((s: number, t: any) => s + Number(t.amount), 0);
                fallbackEarned = fallbackGross;
            }
        }

        // ── 4. Filter by event type ─────────────────────────────────
        if (eventTypeFilter && !useFallback) {
            filteredEvents = filteredEvents.filter((e: any) =>
                monthlyTypeMap[e.revenue_type_id]?.code === eventTypeFilter
            );
        }

        // ── 5. Compute month totals ─────────────────────────────────
        let monthGross = useFallback ? fallbackGross : 0;
        let monthCreatorEarned = useFallback ? fallbackEarned : 0;
        let monthPlatform = 0;

        if (!useFallback) {
            for (const e of filteredEvents) {
                monthGross += Number(e.gross_amount);
                const splits = monthlySplitMap[e.id];
                if (splits) {
                    monthCreatorEarned += splits.creator;
                    monthPlatform += splits.platform;
                }
            }
        }

        // ── 6. Fetch fan profiles for display ──────────────────────
        let fansMap: Record<string, any> = {};
        if (!useFallback) {
            const fanIds = [...new Set(filteredEvents.map((e: any) => e.fan_user_id).filter(Boolean))];
            if (fanIds.length > 0) {
                const { data: fans } = await admin
                    .from('profiles')
                    .select('id, username, full_name, avatar_url')
                    .in('id', fanIds);
                fans?.forEach((f: any) => { fansMap[f.id] = f; });
            }
        }

        // ── 7. Build activity list ──────────────────────────────────
        const allActivity = useFallback
            ? fallbackActivity
            : filteredEvents.map((e: any) => {
                const splits = monthlySplitMap[e.id] || { creator: 0, platform: 0 };
                const typeInfo = monthlyTypeMap[e.revenue_type_id] || { code: 'unknown', name: 'Unknown' };
                const fan = fansMap[e.fan_user_id] || {};
                return {
                    event_id: e.id,
                    occurred_at: e.occurred_at,
                    revenue_type: typeInfo.code,
                    revenue_type_name: typeInfo.name,
                    room_key: e.room_key,
                    gross_amount: Number(e.gross_amount),
                    creator_share: splits.creator,
                    split_name: splits.creator > 0 ? 'Standard 85/15' : 'Platform',
                    fan_username: fan.username || 'Unknown',
                    fan_display_name: fan.full_name || 'Unknown',
                    fan_avatar: fan.avatar_url || null,
                };
            });

        // ── 8. Paginate ─────────────────────────────────────────────
        const paginatedActivity = allActivity.slice(offset, offset + limit);

        // ── 9. Unique event types for filter pills ──────────────────
        const uniqueTypes = useFallback
            ? [...new Set(fallbackActivity.map((e: any) => e.revenue_type).filter(Boolean))]
            : [...new Set(filteredEvents.map((e: any) => monthlyTypeMap[e.revenue_type_id]?.code || 'unknown').filter(c => c !== 'unknown'))];

        // ── 10. Build ledger from revenue_events if no ledger row ──
        return NextResponse.json({
            ledger,
            month_summary: {
                year, month,
                gross_collected: Math.round(monthGross * 100) / 100,
                creator_earned: Math.round(monthCreatorEarned * 100) / 100,
                platform_fee: Math.round(monthPlatform * 100) / 100,
                events_count: allActivity.length,
            },
            activity: paginatedActivity,
            pagination: {
                total: allActivity.length,
                limit,
                offset,
                has_more: offset + limit < allActivity.length,
            },
            available_event_types: uniqueTypes,
            data_source: useFallback ? 'transactions' : 'revenue_events',
        });
    } catch (err: any) {
        console.error('Creator earnings API error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
