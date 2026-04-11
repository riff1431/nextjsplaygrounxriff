'use client';

import React from 'react';
import { X, TrendingUp } from 'lucide-react';

interface RoomLine {
    event_id: string;
    occurred_at: string;
    revenue_type: string;
    revenue_type_name: string;
    gross_amount: number;
    creator_share: number;
}

interface RoomEarningsData {
    room_key: string;
    room_title: string;
    room_type: string;
    room_thumbnail?: string | null;
    total_earned: number;
    total_gross: number;
    events_count: number;
    last_activity: string;
    categories: Record<string, number>;
    lines: RoomLine[];
}

interface RoomEarningsDrawerProps {
    room: RoomEarningsData;
    onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    tip: '#EC4899',
    session_tip: '#EC4899',
    reaction: '#8B5CF6',
    entry_fee_private: '#3B82F6',
    entry_fee_public: '#06B6D4',
    per_min_public: '#F59E0B',
    per_min_private: '#F59E0B',
    gift: '#10B981',
    custom_request: '#F97316',
    drop_unlock: '#6366F1',
    confession_unlock: '#6366F1',
    bar_request: '#A855F7',
    suga_favorite: '#EF4444',
    competition_tip: '#EAB308',
};

export default function RoomEarningsDrawer({ room, onClose }: RoomEarningsDrawerProps) {
    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    // Sort categories by value
    const sortedCategories = Object.entries(room.categories)
        .sort(([, a], [, b]) => b - a);

    const maxCategoryVal = sortedCategories[0]?.[1] || 1;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Drawer */}
            <div
                className="relative w-full max-w-md bg-[#0a0a0f] border-l border-pink-500/10 h-full overflow-y-auto z-10 animate-slide-in-right"
                style={{
                    animation: 'slideInRight 0.3s ease-out',
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/5 p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">{room.room_title}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 capitalize">
                                    {room.room_type.replace(/-/g, ' ')}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {room.events_count} events
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Total Earned */}
                    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-pink-900/30 to-purple-900/20 border border-pink-500/10">
                        <div className="text-xs text-pink-300/70 uppercase tracking-wider">Room Earnings</div>
                        <div className="text-3xl font-bold text-white mt-1">{fmt(room.total_earned)}</div>
                        <div className="text-xs text-gray-500 mt-1">Gross: {fmt(room.total_gross)}</div>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-pink-500" />
                        Earnings by Category
                    </h3>
                    <div className="space-y-3">
                        {sortedCategories.map(([category, amount]) => {
                            const pct = (amount / maxCategoryVal) * 100;
                            const color = CATEGORY_COLORS[category] || '#6B7280';
                            return (
                                <div key={category}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400 capitalize">{category.replace(/_/g, ' ')}</span>
                                        <span className="text-white font-medium">{fmt(amount)}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${pct}%`,
                                                background: `linear-gradient(90deg, ${color}, ${color}80)`,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Line Items */}
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                        Activity ({room.lines.length})
                    </h3>
                    <div className="space-y-2">
                        {room.lines.map(line => (
                            <div
                                key={line.event_id}
                                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-sm text-white font-medium">
                                            {line.revenue_type_name || line.revenue_type.replace(/_/g, ' ')}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {new Date(line.occurred_at).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-green-400">
                                        +{fmt(line.creator_share)}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {room.lines.length === 0 && (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                No activity in this room.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
