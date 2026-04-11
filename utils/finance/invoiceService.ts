import { createAdminClient } from '../supabase/admin';

export async function getCreatorInvoice(params: {
    creatorId: string;
    year: number;
    month: number;
}) {
    const { creatorId, year, month } = params;
    const supabase = createAdminClient();

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();

    // 1. Fetch Events with Splits & Types & Sessions
    const { data: events, error } = await supabase
        .from('revenue_events')
        .select(`
        id, created_at, occurred_at, 
        revenue_type:revenue_types!revenue_events_revenue_type_id_fkey(code),
        room_key, currency, gross_amount, status, metadata,
        fan_user_id,
        splits:revenue_splits(
            beneficiary_type, amount,
            split_profile:split_profiles(name)
        ),
        sessions:revenue_event_sessions(
            session:creator_activity_sessions(duration_seconds)
        )
    `)
        .eq('creator_user_id', creatorId)
        .gte('occurred_at', start)
        .lt('occurred_at', end)
        .order('occurred_at', { ascending: false });

    if (error) throw new Error(`Invoice fetch failed: ${error.message}`);
    if (!events || events.length === 0) return { summary: { gross_collected: 0, creator_earned: 0, platform_earned: 0, events_count: 0, last_activity: null }, lines: [] };

    // 2. Fetch Fan details efficiently
    const fanIds = [...new Set(events.map(e => e.fan_user_id))];
    let fansMap: Record<string, any> = {};
    if (fanIds.length > 0) {
        const { data: fans } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', fanIds);
        fans?.forEach(f => fansMap[f.id] = f);
    }

    // 3. Process Lines
    const lines = events.map((e: any) => {
        let creatorShare = 0;
        let platformShare = 0;
        let splitName = '';

        e.splits?.forEach((s: any) => {
            if (s.beneficiary_type === 'creator') creatorShare += Number(s.amount);
            if (s.beneficiary_type === 'platform') platformShare += Number(s.amount);
            if (s.split_profile?.name) splitName = s.split_profile.name;
        });

        const duration = e.sessions?.[0]?.session?.duration_seconds || 0;
        const fan = fansMap[e.fan_user_id] || { username: 'Unknown' };

        return {
            event_id: e.id,
            occurred_at: e.occurred_at,
            revenue_type: e.revenue_type?.code,
            room_key: e.room_key,
            currency: e.currency,
            gross_amount: Number(e.gross_amount),
            status: e.status,
            fan_username: fan.username,
            fan_display_name: fan.full_name,
            split_name: splitName,
            duration_seconds: duration,
            creator_share: creatorShare,
            platform_share: platformShare
        };
    });

    // 4. Compute Summary
    const summary = {
        gross_collected: lines.reduce((acc: number, l: any) => acc + l.gross_amount, 0),
        creator_earned: lines.reduce((acc: number, l: any) => acc + l.creator_share, 0),
        platform_earned: lines.reduce((acc: number, l: any) => acc + l.platform_share, 0),
        events_count: lines.length,
        last_activity: lines.length > 0 ? lines[0].occurred_at : null
    };

    return { summary, lines };
}

/**
 * Get earnings broken down by room for a specific creator and month.
 * Groups revenue_events by room_key and aggregates totals + category breakdown.
 */
export async function getRoomEarnings(params: {
    creatorId: string;
    year: number;
    month: number;
}) {
    const { creatorId, year, month } = params;
    const supabase = createAdminClient();

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();

    // Fetch events grouped by room
    const { data: events, error } = await supabase
        .from('revenue_events')
        .select(`
            id, occurred_at,
            revenue_type:revenue_types!revenue_events_revenue_type_id_fkey(code, name),
            room_key, gross_amount, status,
            splits:revenue_splits(
                beneficiary_type, amount
            )
        `)
        .eq('creator_user_id', creatorId)
        .eq('status', 'succeeded')
        .gte('occurred_at', start)
        .lt('occurred_at', end)
        .order('occurred_at', { ascending: false });

    if (error) throw new Error(`Room earnings fetch failed: ${error.message}`);
    if (!events || events.length === 0) return [];

    // Aggregate by room_key
    const roomMap: Record<string, {
        room_key: string;
        total_earned: number;
        total_gross: number;
        events_count: number;
        last_activity: string;
        categories: Record<string, number>;
        lines: any[];
    }> = {};

    for (const e of events as any[]) {
        const roomKey = e.room_key || 'unknown';
        if (!roomMap[roomKey]) {
            roomMap[roomKey] = {
                room_key: roomKey,
                total_earned: 0,
                total_gross: 0,
                events_count: 0,
                last_activity: e.occurred_at,
                categories: {},
                lines: [],
            };
        }

        const room = roomMap[roomKey];
        room.events_count += 1;
        room.total_gross += Number(e.gross_amount);

        if (e.occurred_at > room.last_activity) room.last_activity = e.occurred_at;

        let creatorShare = 0;
        e.splits?.forEach((s: any) => {
            if (s.beneficiary_type === 'creator') creatorShare += Number(s.amount);
        });
        room.total_earned += creatorShare;

        // Category
        const typeCode = e.revenue_type?.code || 'other';
        room.categories[typeCode] = (room.categories[typeCode] || 0) + creatorShare;

        room.lines.push({
            event_id: e.id,
            occurred_at: e.occurred_at,
            revenue_type: typeCode,
            revenue_type_name: e.revenue_type?.name || typeCode,
            gross_amount: Number(e.gross_amount),
            creator_share: creatorShare,
        });
    }

    // Fetch room details for room_keys
    const roomKeys = Object.keys(roomMap).filter(k => k !== 'unknown');
    let roomsMap: Record<string, any> = {};
    if (roomKeys.length > 0) {
        const { data: rooms } = await supabase
            .from('rooms')
            .select('id, title, type, thumbnail_url')
            .in('id', roomKeys);
        rooms?.forEach(r => roomsMap[r.id] = r);
    }

    // Build result
    const roomEarnings = Object.values(roomMap).map(room => ({
        ...room,
        room_title: roomsMap[room.room_key]?.title || room.room_key,
        room_type: roomsMap[room.room_key]?.type || 'unknown',
        room_thumbnail: roomsMap[room.room_key]?.thumbnail_url || null,
        total_earned: Math.round(room.total_earned * 100) / 100,
        total_gross: Math.round(room.total_gross * 100) / 100,
    }));

    // Sort by total earned descending
    roomEarnings.sort((a, b) => b.total_earned - a.total_earned);

    return roomEarnings;
}
