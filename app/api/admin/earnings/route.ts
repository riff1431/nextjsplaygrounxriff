/**
 * GET /api/admin/earnings
 *
 * Admin endpoint — global earnings activity feed across all creators.
 * Query params:
 *   - year, month — period filter
 *   - creatorId — filter by specific creator
 *   - search — search by creator name
 *   - roomType — filter by room type
 *   - limit, offset — pagination
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
        const creatorId = searchParams.get('creatorId');
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        const admin = createAdminClient();

        const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
        const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();

        // Build query
        let query = admin
            .from('revenue_events')
            .select(`
                id, occurred_at, status,
                revenue_type:revenue_types(code, name),
                room_key, currency, gross_amount,
                creator_user_id, fan_user_id,
                splits:revenue_splits(
                    beneficiary_type, amount,
                    split_profile:split_profiles(name)
                )
            `)
            .eq('status', 'succeeded')
            .gte('occurred_at', start)
            .lt('occurred_at', end)
            .order('occurred_at', { ascending: false });

        if (creatorId) query = query.eq('creator_user_id', creatorId);

        const { data: events, error } = await query;
        if (error) throw new Error(`Admin earnings fetch failed: ${error.message}`);

        // Collect user IDs
        const userIds = new Set<string>();
        (events || []).forEach((e: any) => {
            if (e.creator_user_id) userIds.add(e.creator_user_id);
            if (e.fan_user_id) userIds.add(e.fan_user_id);
        });

        let usersMap: Record<string, any> = {};
        if (userIds.size > 0) {
            const { data: users } = await admin
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .in('id', Array.from(userIds));
            users?.forEach((u: any) => usersMap[u.id] = u);
        }

        // Process & filter
        let processed = (events || []).map((e: any) => {
            let creatorShare = 0;
            let platformShare = 0;
            let splitName = '';
            e.splits?.forEach((s: any) => {
                if (s.beneficiary_type === 'creator') creatorShare += Number(s.amount);
                if (s.beneficiary_type === 'platform') platformShare += Number(s.amount);
                if (s.split_profile?.name) splitName = s.split_profile.name;
            });

            const creator = usersMap[e.creator_user_id] || {};
            const fan = usersMap[e.fan_user_id] || {};

            return {
                event_id: e.id,
                occurred_at: e.occurred_at,
                revenue_type: e.revenue_type?.code || 'unknown',
                revenue_type_name: e.revenue_type?.name || 'Unknown',
                room_key: e.room_key,
                gross_amount: Number(e.gross_amount),
                creator_share: creatorShare,
                platform_share: platformShare,
                split_name: splitName,
                creator_id: e.creator_user_id,
                creator_username: creator.username || 'Unknown',
                creator_name: creator.full_name || 'Unknown',
                creator_avatar: creator.avatar_url || null,
                fan_username: fan.username || 'Unknown',
                fan_name: fan.full_name || 'Unknown',
            };
        });

        // Search filter
        if (search) {
            const s = search.toLowerCase();
            processed = processed.filter((r: any) =>
                r.creator_username.toLowerCase().includes(s) ||
                r.creator_name.toLowerCase().includes(s) ||
                r.fan_username.toLowerCase().includes(s)
            );
        }

        // Totals
        let totalGross = 0;
        let totalCreator = 0;
        let totalPlatform = 0;
        processed.forEach((r: any) => {
            totalGross += r.gross_amount;
            totalCreator += r.creator_share;
            totalPlatform += r.platform_share;
        });

        // Paginate
        const paginated = processed.slice(offset, offset + limit);

        return NextResponse.json({
            activity: paginated,
            totals: {
                gross_collected: Math.round(totalGross * 100) / 100,
                total_creator_earned: Math.round(totalCreator * 100) / 100,
                total_platform_earned: Math.round(totalPlatform * 100) / 100,
                events_count: processed.length,
            },
            pagination: {
                total: processed.length,
                limit,
                offset,
                has_more: offset + limit < processed.length,
            },
        });
    } catch (err: any) {
        console.error('Admin earnings error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
