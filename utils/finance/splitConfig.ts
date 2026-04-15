/**
 * Revenue Split Configuration — Single Source of Truth
 *
 * All split percentages and minimum fees for the platform.
 * Referenced by applyRevenueSplit() and disclosure UI components.
 *
 * The static SPLIT_CONFIG below serves as a compile-time fallback.
 * At runtime, getSplitConfig() fetches from the `platform_split_config`
 * Supabase table (with a 60-second TTL cache) so admins can update
 * values without code deploys.
 */

export const SPLIT_CONFIG = {
    /** Tips, reactions, gifts, drops, custom requests, bids — 85% Creator / 15% Platform */
    GLOBAL: { creator: 85, platform: 15 },

    /** Public room entry — 100% Platform ($10 fixed) */
    PUBLIC_ENTRY: { creator: 0, platform: 100, entryFee: 10 },

    /** Public room per-minute billing — 25% Creator / 75% Platform */
    PUBLIC_PER_MIN: { creator: 25, platform: 75, rate: 2 },

    /** Private room entry — 50/50 (min $20) */
    PRIVATE_ENTRY: { creator: 50, platform: 50, min: 20 },

    /** Private room per-minute billing — 50/50 (min $5/min) */
    PRIVATE_PER_MIN: { creator: 50, platform: 50, minRate: 5 },

    /** Suga4U Favorites — 100% Creator */
    SUGA4U_FAVORITES: { creator: 100, platform: 0 },

    /** Competition Tips — 100% Creator */
    COMPETITION_TIPS: { creator: 100, platform: 0 },
} as const;

export type SplitType = keyof typeof SPLIT_CONFIG;

// ─── DB-Backed Dynamic Split Config ────────────────────────────────────────
// Fetches from `platform_split_config` table with a 60s TTL cache.
// Falls back to static SPLIT_CONFIG if the DB is unavailable.

interface DbSplitRow {
    split_key: string;
    creator_pct: number;
    platform_pct: number;
    entry_fee: number | null;
    cost_per_min: number | null;
    min_charge: number | null;
    is_editable: boolean;
    description: string | null;
    label: string;
    updated_at: string;
}

interface LiveSplitConfig {
    creator: number;
    platform: number;
    entryFee?: number | null;
    rate?: number | null;
    min?: number | null;
    minRate?: number | null;
    isEditable?: boolean;
    label?: string;
    description?: string | null;
}

// In-memory TTL cache (module-level, survives across requests in Node process)
let _splitCache: Record<string, LiveSplitConfig> | null = null;
let _splitCacheExpiry: number = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Returns the live split config for a given split key.
 * Reads from DB with a 60s cache; falls back to SPLIT_CONFIG if DB fails.
 */
export async function getSplitConfig(splitKey: SplitType): Promise<LiveSplitConfig> {
    const now = Date.now();

    // Return cached result if still fresh
    if (_splitCache && now < _splitCacheExpiry) {
        return _splitCache[splitKey] ?? staticFallback(splitKey);
    }

    try {
        // Lazy import to avoid circular deps and keep this file lightweight
        const { createAdminClient } = await import('../supabase/admin');
        const admin = createAdminClient();

        const { data, error } = await admin
            .from('platform_split_config')
            .select('*')
            .order('id', { ascending: true });

        if (error || !data || data.length === 0) {
            throw new Error(error?.message || 'No rows returned');
        }

        // Build the cache
        const newCache: Record<string, LiveSplitConfig> = {};
        for (const row of data as DbSplitRow[]) {
            newCache[row.split_key] = {
                creator: Number(row.creator_pct),
                platform: Number(row.platform_pct),
                entryFee: row.entry_fee ?? undefined,
                rate: row.cost_per_min ?? undefined,
                min: row.min_charge ?? undefined,
                minRate: row.cost_per_min ?? undefined,
                isEditable: row.is_editable,
                label: row.label,
                description: row.description,
            };
        }

        _splitCache = newCache;
        _splitCacheExpiry = now + CACHE_TTL_MS;

        return newCache[splitKey] ?? staticFallback(splitKey);
    } catch (err) {
        console.warn('[getSplitConfig] DB fetch failed, using static fallback:', err);
        return staticFallback(splitKey);
    }
}

/** Invalidate the in-memory cache (call after admin updates a split config). */
export function invalidateSplitCache() {
    _splitCache = null;
    _splitCacheExpiry = 0;
}

/** Convert static SPLIT_CONFIG entry to LiveSplitConfig shape. */
function staticFallback(splitKey: SplitType): LiveSplitConfig {
    const s = SPLIT_CONFIG[splitKey];
    if (!s) return { creator: 85, platform: 15 };
    return {
        creator: s.creator,
        platform: s.platform,
        entryFee: (s as any).entryFee ?? null,
        rate: (s as any).rate ?? null,
        min: (s as any).min ?? null,
        minRate: (s as any).minRate ?? null,
        isEditable: true,
    };
}

/**
 * Earnings categories for the creator_earnings_ledger.
 * Maps to specific columns in the ledger table.
 */
export type EarningsCategory =
    | 'tips'
    | 'reactions'
    | 'entry_fees'
    | 'per_min'
    | 'drops'
    | 'gifts'
    | 'custom_requests'
    | 'competition_tips'
    | 'suga_favorites';

/**
 * Map EarningsCategory to the ledger column name for atomic updates.
 */
export const EARNINGS_COLUMN_MAP: Record<EarningsCategory, string> = {
    tips: 'total_tips',
    reactions: 'total_reactions',
    entry_fees: 'total_entry_fees',
    per_min: 'total_per_min',
    drops: 'total_drops',
    gifts: 'total_gifts',
    custom_requests: 'total_custom_requests',
    competition_tips: 'total_competition_tips',
    suga_favorites: 'total_suga_favorites',
};

/**
 * Platform system user ID — receives the platform's share of revenue.
 * This must be set in .env.local as PLATFORM_USER_ID.
 *
 * Fallback: if not configured, platform share is deducted from fan
 * but NOT credited anywhere (tracked in revenue_events only).
 */
export const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || null;
