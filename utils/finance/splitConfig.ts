/**
 * Revenue Split Configuration — Single Source of Truth
 *
 * All split percentages and minimum fees for the platform.
 * Referenced by applyRevenueSplit() and disclosure UI components.
 */

export const SPLIT_CONFIG = {
    /** Tips, reactions, gifts, drops, custom requests, bids — 85% Creator / 15% Platform */
    GLOBAL: { creator: 85, platform: 15 },

    /** Public room entry — 100% Platform ($10 fixed) */
    PUBLIC_ENTRY: { creator: 0, platform: 100 },

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
