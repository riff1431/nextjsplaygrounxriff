/**
 * applyRevenueSplit — Core revenue split helper
 *
 * Replaces direct `transfer_funds` calls across all monetization endpoints.
 * Handles the full split lifecycle:
 *   1. Compute creator/platform shares
 *   2. Transfer funds (fan → creator, fan → platform)
 *   3. Record revenue_event + revenue_splits
 *   4. Update creator_earnings_ledger
 *
 * Usage:
 *   const result = await applyRevenueSplit({
 *     supabase,
 *     fanUserId: user.id,
 *     creatorUserId: session.creator_id,
 *     grossAmount: amount,
 *     splitType: 'GLOBAL',
 *     description: 'Tip in "My Session"',
 *     roomId: session.room_id,
 *     relatedType: 'session_tip',
 *     relatedId: sessionId,
 *     earningsCategory: 'tips',
 *   });
 */
import { createAdminClient } from '../supabase/admin';
import {
    getSplitConfig,
    PLATFORM_USER_ID,
    EARNINGS_COLUMN_MAP,
    type SplitType,
    type EarningsCategory,
} from './splitConfig';

export interface SplitResult {
    success: boolean;
    error?: string;
    grossAmount: number;
    creatorShare: number;
    platformShare: number;
    newBalance?: number;
}

export interface ApplyRevenueSplitParams {
    /** Supabase client — can be the server client (authenticated as the fan), used for transfer_funds */
    supabase: any;
    /** Fan's user ID (payer) */
    fanUserId: string;
    /** Creator's user ID (payee) */
    creatorUserId: string;
    /** Total amount the fan is paying */
    grossAmount: number;
    /** Split profile to apply */
    splitType: SplitType;
    /** Human-readable description for the transaction */
    description: string;
    /** Optional room ID */
    roomId?: string | null;
    /** Related entity type (e.g. 'session_tip', 'confession_unlock') */
    relatedType?: string | null;
    /** Related entity ID */
    relatedId?: string | null;
    /** Earnings category for the creator_earnings_ledger */
    earningsCategory?: EarningsCategory;
}

/**
 * Round to 2 decimal places.
 */
function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Apply revenue split for a payment.
 *
 * This function orchestrates the entire split:
 * - Computes shares based on SPLIT_CONFIG
 * - Transfers the creator's share via transfer_funds
 * - Transfers the platform's share via transfer_funds (if PLATFORM_USER_ID is set)
 * - Records the revenue event and splits in the database
 * - Updates the creator's earnings ledger
 */
export async function applyRevenueSplit(
    params: ApplyRevenueSplitParams
): Promise<SplitResult> {
    const {
        supabase,
        fanUserId,
        creatorUserId,
        grossAmount,
        splitType,
        description,
        roomId,
        relatedType,
        relatedId,
        earningsCategory,
    } = params;

    // Fetch live config from DB (falls back to static constants if DB unavailable)
    const config = await getSplitConfig(splitType);
    if (!config) {
        return { success: false, error: `Unknown split type: ${splitType}`, grossAmount, creatorShare: 0, platformShare: 0 };
    }

    const creatorPct = config.creator;
    const platformPct = config.platform;

    const creatorShare = round2(grossAmount * (creatorPct / 100));
    const platformShare = round2(grossAmount - creatorShare); // remainder to platform

    let newBalance: number | undefined;

    try {
        // ─── Step 1: Transfer creator's share ──────────────────────
        if (creatorShare > 0) {
            const { data: result, error: rpcError } = await supabase.rpc('transfer_funds', {
                p_from_user_id: fanUserId,
                p_to_user_id: creatorUserId,
                p_amount: creatorShare,
                p_description: `[Creator ${creatorPct}%] ${description}`,
                p_room_id: roomId || null,
                p_related_type: relatedType || null,
                p_related_id: relatedId || null,
            });

            if (rpcError) throw rpcError;
            if (!result?.success) {
                return {
                    success: false,
                    error: result?.error || 'Insufficient balance',
                    grossAmount,
                    creatorShare,
                    platformShare,
                };
            }
            newBalance = result.new_balance;
        }

        // ─── Step 2: Transfer platform's share ─────────────────────
        if (platformShare > 0 && PLATFORM_USER_ID) {
            const { data: platResult, error: platError } = await supabase.rpc('transfer_funds', {
                p_from_user_id: fanUserId,
                p_to_user_id: PLATFORM_USER_ID,
                p_amount: platformShare,
                p_description: `[Platform ${platformPct}%] ${description}`,
                p_room_id: roomId || null,
                p_related_type: `platform_fee_${relatedType || 'general'}`,
                p_related_id: relatedId || null,
            });

            if (platError) {
                console.error('Platform share transfer failed:', platError.message);
                // Don't fail the whole transaction — the creator got paid.
                // Platform share is still tracked in revenue_events.
            } else if (platResult?.new_balance !== undefined) {
                newBalance = platResult.new_balance;
            }
        } else if (platformShare > 0 && !PLATFORM_USER_ID) {
            // No platform user configured — deduct from fan but don't credit anyone.
            // This handles the case where 100% goes to platform but no platform user exists.
            // The fan still pays the full gross amount, which has already been deducted
            // via the creator's transfer (or not, if creatorShare == 0).
            if (creatorShare === 0) {
                // 100% platform (e.g. public entry) — deduct from fan directly
                const { data: result, error: rpcError } = await supabase.rpc('deduct_balance', {
                    p_user_id: fanUserId,
                    p_amount: platformShare,
                });
                if (rpcError) {
                    return {
                        success: false,
                        error: rpcError.message || 'Insufficient balance for platform fee',
                        grossAmount,
                        creatorShare,
                        platformShare,
                    };
                }
                // Note: deduct_balance doesn't return new_balance directly
            }
        }

        // ─── Step 3: Record in revenue tracking (admin client) ─────
        const adminClient = createAdminClient();

        // Find revenue type ID for the related type
        let revenueTypeId: number | null = null;
        if (relatedType) {
            const { data: rt } = await adminClient
                .from('revenue_types')
                .select('id')
                .eq('code', relatedType)
                .single();
            revenueTypeId = rt?.id || null;
        }

        if (revenueTypeId) {
            // Insert revenue event
            const { data: revEvent, error: revError } = await adminClient
                .from('revenue_events')
                .insert({
                    occurred_at: new Date().toISOString(),
                    fan_user_id: fanUserId,
                    creator_user_id: creatorUserId,
                    revenue_type_id: revenueTypeId,
                    room_key: roomId || null,
                    currency: 'USD',
                    gross_amount: grossAmount,
                    net_amount: creatorShare,
                    payment_provider: 'wallet',
                    payment_intent_id: `wallet_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    status: 'succeeded',
                    metadata: {
                        split_type: splitType,
                        creator_pct: creatorPct,
                        platform_pct: platformPct,
                        description,
                    },
                })
                .select('id')
                .single();

            if (!revError && revEvent) {
                // Find split profile for reference
                const { data: splitProfile } = await adminClient
                    .from('split_profiles')
                    .select('id')
                    .eq('creator_pct', creatorPct)
                    .eq('platform_pct', platformPct)
                    .limit(1)
                    .single();

                const splitProfileId = splitProfile?.id || 1;

                // Insert revenue splits
                const splits = [];
                if (creatorShare > 0) {
                    splits.push({
                        revenue_event_id: revEvent.id,
                        beneficiary_type: 'creator' as const,
                        beneficiary_id: creatorUserId,
                        split_profile_id: splitProfileId,
                        pct: creatorPct,
                        amount: creatorShare,
                    });
                }
                if (platformShare > 0) {
                    splits.push({
                        revenue_event_id: revEvent.id,
                        beneficiary_type: 'platform' as const,
                        beneficiary_id: PLATFORM_USER_ID || null,
                        split_profile_id: splitProfileId,
                        pct: platformPct,
                        amount: platformShare,
                    });
                }

                if (splits.length > 0) {
                    await adminClient.from('revenue_splits').insert(splits);
                }
            }
        }

        // ─── Step 4: Update creator earnings ledger ────────────────
        if (creatorShare > 0 && earningsCategory) {
            const columnName = EARNINGS_COLUMN_MAP[earningsCategory];
            if (columnName) {
                try {
                    const { data: existing } = await adminClient
                        .from('creator_earnings_ledger')
                        .select('creator_id, total_earned')
                        .eq('creator_id', creatorUserId)
                        .single();

                    if (existing) {
                        // Update — increment total_earned and specific category
                        // Try the dedicated RPC first, fall back to manual UPDATE
                        try {
                            await adminClient.rpc('increment_creator_earnings', {
                                p_creator_id: creatorUserId,
                                p_amount: creatorShare,
                                p_column: columnName,
                            });
                        } catch {
                            // Fallback: manual update if RPC doesn't exist
                            await adminClient
                                .from('creator_earnings_ledger')
                                .update({
                                    total_earned: round2(Number(existing.total_earned || 0) + creatorShare),
                                    last_earned_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                })
                                .eq('creator_id', creatorUserId);
                        }
                    } else {
                        // Insert new ledger entry
                        const insertData: Record<string, any> = {
                            creator_id: creatorUserId,
                            total_earned: creatorShare,
                            [columnName]: creatorShare,
                            last_earned_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        };
                        await adminClient
                            .from('creator_earnings_ledger')
                            .insert(insertData);
                    }
                } catch (ledgerErr) {
                    // Non-critical — log but don't fail the transaction
                    console.error('Earnings ledger update failed:', ledgerErr);
                }
            }
        }

        return {
            success: true,
            grossAmount,
            creatorShare,
            platformShare,
            newBalance,
        };
    } catch (err: any) {
        console.error('applyRevenueSplit error:', err);
        return {
            success: false,
            error: err.message || 'Split payment failed',
            grossAmount,
            creatorShare,
            platformShare,
        };
    }
}
