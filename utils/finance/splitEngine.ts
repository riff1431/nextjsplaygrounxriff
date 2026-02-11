import { createAdminClient } from '../supabase/admin';

export type SplitProfile = {
    id: number;
    name: string;
    creator_pct: number;
    platform_pct: number;
    processing_pct: number;
    affiliate_pct: number;
    other_pct: number;
};

function round2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function getSplitProfileForEvent(params: {
    revenueTypeId: number;
    roomKey?: string | null;
    occurredAt: Date;
}): Promise<SplitProfile> {
    const { revenueTypeId, roomKey, occurredAt } = params;
    const supabase = createAdminClient();

    // Find the valid mapping for this revenue type + optional room key at the time of event
    // We prioritize specific room mapping over generic mapping (where room_key is null)
    const { data, error } = await supabase
        .from('revenue_type_split_map')
        .select(`
      *,
      split_profiles (*)
    `)
        .eq('revenue_type_id', revenueTypeId)
        .lte('effective_from', occurredAt.toISOString())
        .or(`effective_to.is.null,effective_to.gt.${occurredAt.toISOString()}`)
        .order('room_key', { ascending: false, nullsFirst: false }) // prioritization trick: room_key values come before null
        .order('effective_from', { ascending: false })
        .limit(1);

    if (error) throw new Error(`Split profile lookup failed: ${error.message}`);

    // Client-side filtering for room_key to handle the "specific vs generic" logic precisely if SQL sort isn't enough
    // But the SQL sort above (nulls last for room_key desc) should put 'truth_or_dare' before null.
    // Ideally, we'd use robust SQL logic, but Supabase API is simpler.
    // Let's iterate if we get multiple matches, but we limited to 1.

    // Refined approach: fetch all potentially matching, then filter in code to be safe about the "best match" logic
    // because `.or` with mixed null checks can be tricky in simple SDK query.

    // Actually, let's try a better query pattern:
    // We want: where revenue_type = X AND (room_key = Y OR room_key IS NULL)
    // And then sort by room_key having a value first.

    const { data: mappings, error: mapError } = await supabase
        .from('revenue_type_split_map')
        .select(`
      id,
      room_key,
      effective_from,
      split_profiles (
        *
      )
    `)
        .eq('revenue_type_id', revenueTypeId)
        .lte('effective_from', occurredAt.toISOString())
        .or(`effective_to.is.null,effective_to.gt.${occurredAt.toISOString()}`);

    if (mapError) throw new Error(`Split lookup error: ${mapError.message}`);
    if (!mappings || mappings.length === 0) {
        throw new Error(`No split profile found for revenueType=${revenueTypeId}`);
    }

    // Find best match:
    // 1. Matches roomKey exactly (if provided)
    // 2. Fallback to roomKey is null
    let bestMatch = mappings.find(m => m.room_key === roomKey);

    if (!bestMatch && roomKey) {
        // If we didn't find specific room match, look for generic (null)
        bestMatch = mappings.find(m => m.room_key === null);
    } else if (!roomKey) {
        // If no room key provided, we only want the generic one
        bestMatch = mappings.find(m => m.room_key === null);
    }

    if (!bestMatch) {
        throw new Error(`No matching split profile found for revenueType=${revenueTypeId} roomKey=${roomKey}`);
    }

    // Supabase returns an array or object for joined relation? usually simple object if 1:1, but here it's M:1 so it's an object
    // type casting
    const profile = bestMatch.split_profiles as unknown as SplitProfile;
    if (!profile) throw new Error("Joined split_profile is missing");

    return profile;
}

export function computeSplits(baseAmount: number, profile: SplitProfile) {
    const parts = [
        { key: "creator", pct: profile.creator_pct },
        { key: "platform", pct: profile.platform_pct },
        { key: "processor", pct: profile.processing_pct },
        { key: "affiliate", pct: profile.affiliate_pct },
        { key: "other", pct: profile.other_pct },
    ].filter(p => p.pct > 0);

    const amounts = parts.map(p => ({
        ...p,
        amount: round2(baseAmount * (p.pct / 100)),
    }));

    // Remainder handling (from rounding): add to platform by default
    const sum = round2(amounts.reduce((a, b) => a + b.amount, 0));
    const remainder = round2(baseAmount - sum);

    if (remainder !== 0) {
        const platform = amounts.find(a => a.key === "platform");
        if (platform) {
            platform.amount = round2(platform.amount + remainder);
        } else if (amounts.length > 0) {
            // If no platform share, dump to first beneficiary (e.g. creator)
            amounts[0].amount = round2(amounts[0].amount + remainder);
        }
    }

    return amounts;
}
