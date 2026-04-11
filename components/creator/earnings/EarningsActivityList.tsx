'use client';

import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Search, Filter, ChevronDown } from 'lucide-react';

export type ActivityItem = {
    event_id: string;
    occurred_at: string;
    revenue_type: string;
    revenue_type_name: string;
    room_key?: string;
    gross_amount: number;
    creator_share: number;
    platform_share?: number;
    split_name?: string;
    fan_username?: string;
    fan_display_name?: string;
    fan_avatar?: string | null;
    // Admin fields
    creator_id?: string;
    creator_username?: string;
    creator_name?: string;
    creator_avatar?: string | null;
};

const EVENT_ICONS: Record<string, string> = {
    tip: '💰',
    session_tip: '💰',
    td_tip: '💰',
    confession_tip: '💰',
    reaction: '⚡',
    session_reaction: '⚡',
    xchat_reaction: '⚡',
    entry_fee_public: '🎟️',
    entry_fee_private: '🔐',
    session_entry: '🎟️',
    td_entry: '🎟️',
    suga_entry: '🎟️',
    per_min_public: '⏱️',
    per_min_private: '⏱️',
    suga_gift: '🎁',
    gift: '🎁',
    custom_request: '✨',
    session_custom_request: '✨',
    drop_unlock: '🔓',
    flash_drop_unlock: '🔓',
    flash_drop_request: '📦',
    confession_unlock: '🔓',
    confession_bid: '🔨',
    confession_request: '📩',
    bar_request: '🍸',
    bar_effect: '✨',
    bar_spin: '🎰',
    suga_favorite: '❤️',
    competition_tip: '🏆',
    td_vote: '🗳️',
    xchat_session: '💬',
};

interface EarningsActivityListProps {
    items: ActivityItem[];
    loading?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;
    /** Admin mode shows creator info + platform share */
    adminMode?: boolean;
    /** Search callback */
    searchValue?: string;
    onSearchChange?: (val: string) => void;
    /** Event type filter */
    eventTypes?: string[];
    selectedEventType?: string;
    onEventTypeChange?: (val: string) => void;
}

export default function EarningsActivityList({
    items,
    loading,
    hasMore,
    onLoadMore,
    adminMode = false,
    searchValue = '',
    onSearchChange,
    eventTypes = [],
    selectedEventType = '',
    onEventTypeChange,
}: EarningsActivityListProps) {
    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    return (
        <div className="space-y-4">
            {/* Filters row */}
            {(onSearchChange || onEventTypeChange) && (
                <div className="flex flex-wrap gap-3 items-center">
                    {onSearchChange && (
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <input
                                value={searchValue}
                                onChange={e => onSearchChange(e.target.value)}
                                placeholder={adminMode ? 'Search creator or fan...' : 'Search activity...'}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:border-pink-500/50 focus:outline-none transition"
                            />
                        </div>
                    )}
                    {onEventTypeChange && eventTypes.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedEventType}
                                onChange={e => onEventTypeChange(e.target.value)}
                                className="appearance-none bg-white/5 border border-white/10 rounded-xl py-2 pl-4 pr-8 text-sm text-white focus:border-pink-500/50 focus:outline-none cursor-pointer"
                            >
                                <option value="">All Types</option>
                                {eventTypes.map(t => (
                                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                    )}
                </div>
            )}

            {/* Activity Items */}
            <div className="space-y-2">
                {loading && items.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <div className="inline-block w-6 h-6 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-2" />
                        <div className="text-sm">Loading activity...</div>
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-3">📭</div>
                        <div className="text-sm">No earnings activity found for this period.</div>
                    </div>
                )}

                {items.map(item => (
                    <div
                        key={item.event_id}
                        className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-pink-500/20 transition-all duration-200"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Icon */}
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/10 border border-pink-500/10 flex items-center justify-center text-lg shrink-0">
                                    {EVENT_ICONS[item.revenue_type] || '💵'}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white truncate">
                                            {item.revenue_type_name || item.revenue_type.replace(/_/g, ' ')}
                                        </span>
                                        {item.room_key && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5 truncate max-w-[100px]">
                                                {item.room_key.slice(0, 8)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <span>{new Date(item.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <span>·</span>
                                        <span>{new Date(item.occurred_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                        {item.fan_username && (
                                            <>
                                                <span>·</span>
                                                <span className="text-pink-400/70">from @{item.fan_username}</span>
                                            </>
                                        )}
                                    </div>
                                    {adminMode && item.creator_username && (
                                        <div className="text-xs text-cyan-400/70 mt-0.5">
                                            to @{item.creator_username}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-green-400">
                                    +{fmt(item.creator_share)}
                                </div>
                                {adminMode && item.platform_share !== undefined && item.platform_share > 0 && (
                                    <div className="text-[10px] text-cyan-400/60 mt-0.5">
                                        Platform: {fmt(item.platform_share)}
                                    </div>
                                )}
                                {item.split_name && (
                                    <div className="text-[10px] text-gray-600 mt-0.5">
                                        {item.split_name}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Load More */}
            {hasMore && (
                <button
                    onClick={onLoadMore}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
                >
                    {loading ? 'Loading...' : 'Load More'}
                </button>
            )}
        </div>
    );
}
