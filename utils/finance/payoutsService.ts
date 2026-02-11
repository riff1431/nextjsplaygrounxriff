import { createAdminClient } from '../supabase/admin';

export async function getPayoutsMonth(params: {
    year: number;
    month: number; // 1-12
    search?: string;
    revenueTypeCode?: string;
    status?: string;
    sort?: "creatorEarnedDesc" | "creatorEarnedAsc" | "lastActivityDesc";
}) {
    const { year, month, search, revenueTypeCode, status, sort } = params;
    const supabase = createAdminClient();

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();

    // 1. Filtered Events
    let query = supabase
        .from('revenue_events')
        .select(`
      id,
      occurred_at,
      status,
      gross_amount,
      creator_user_id,
      revenue_types!inner (
        code
      ),
      splits:revenue_splits (
        amount,
        beneficiary_type
      )
    `)
        .gte('occurred_at', start)
        .lt('occurred_at', end);

    if (status) query = query.eq('status', status);
    if (revenueTypeCode) query = query.eq('revenue_types.code', revenueTypeCode);

    const { data: events, error } = await query;

    if (error) throw new Error(`Payouts fetch failed: ${error.message}`);

    // 2. Aggregate in memory (Supabase/PostgREST doesn't support complex GROUP BY with joins easily)
    // For production with millions of rows, use a dedicated RPC function or materialized view.
    // For now, in-memory aggregation is fine for < 10k rows.

    const creatorStats: Record<string, {
        creator_id: string;
        gross_collected: number;
        creator_earned: number;
        platform_earned: number;
        events_count: number;
        last_activity: string;
    }> = {};

    let totalCreatorEarned = 0;
    let totalPlatformEarned = 0;

    for (const e of events) {
        // Only count succeeded events for totals? Usually yes.
        if (e.status !== 'succeeded') continue;

        const creatorId = e.creator_user_id;
        if (!creatorId) {
            // Platform-only event?
            // Add to global platform earned
            e.splits.forEach((s: any) => {
                if (s.beneficiary_type === 'platform') totalPlatformEarned += Number(s.amount);
            });
            continue;
        }

        if (!creatorStats[creatorId]) {
            creatorStats[creatorId] = {
                creator_id: creatorId,
                gross_collected: 0,
                creator_earned: 0,
                platform_earned: 0,
                events_count: 0,
                last_activity: e.occurred_at
            };
        }

        const stats = creatorStats[creatorId];
        stats.gross_collected += Number(e.gross_amount);
        stats.events_count += 1;
        if (e.occurred_at > stats.last_activity) stats.last_activity = e.occurred_at;

        e.splits.forEach((s: any) => {
            const amt = Number(s.amount);
            if (s.beneficiary_type === 'creator') {
                stats.creator_earned += amt;
                totalCreatorEarned += amt;
            }
            else if (s.beneficiary_type === 'platform') {
                stats.platform_earned += amt;
                totalPlatformEarned += amt;
            }
        });
    }

    // 3. Fetch user details for the active creators
    const creatorIds = Object.keys(creatorStats);
    let usersMap: Record<string, any> = {};

    if (creatorIds.length > 0) {
        const { data: users } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url') // Ensure these columns exist in users table
            .in('id', creatorIds);

        users?.forEach(u => usersMap[u.id] = u);
    }

    // 4. Transform to list
    let rows = Object.values(creatorStats).map(stat => {
        const u = usersMap[stat.creator_id] || {};
        return {
            creator_id: stat.creator_id,
            username: u.username || 'Unknown',
            display_name: u.full_name || 'Unknown',
            avatar_url: u.avatar_url || '',
            gross_collected: stat.gross_collected,
            creator_earned: stat.creator_earned,
            platform_earned: stat.platform_earned,
            events_count: stat.events_count,
            last_activity: stat.last_activity,
            status: 'Ready' // Logic for status can be added later (e.g. check KYC)
        };
    });

    // 5. Client-side search & filtering
    if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(r =>
            r.username.toLowerCase().includes(s) ||
            r.display_name.toLowerCase().includes(s)
        );
    }

    // 6. Sorting
    rows.sort((a, b) => {
        if (sort === 'creatorEarnedAsc') return a.creator_earned - b.creator_earned;
        if (sort === 'lastActivityDesc') return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
        return b.creator_earned - a.creator_earned; // default desc
    });

    return {
        rows,
        totals: {
            total_creators_earned: totalCreatorEarned.toFixed(2),
            total_platform_earned: totalPlatformEarned.toFixed(2)
        }
    };
}
