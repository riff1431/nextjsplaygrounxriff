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
        revenue_type:revenue_types(code),
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

        e.splits.forEach((s: any) => {
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
