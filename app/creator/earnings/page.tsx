'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
    DollarSign, TrendingUp, Clock, Users, ArrowLeft,
    ChevronDown, Sparkles, Wallet, Gift, Zap,
    Lock, Wine, MessageSquare, Crown, Trophy, Video,
    BarChart3
} from 'lucide-react';
import EarningsActivityList, { type ActivityItem } from '@/components/creator/earnings/EarningsActivityList';
import RoomEarningsDrawer from '@/components/creator/earnings/RoomEarningsDrawer';
import StatementDownloader from '@/components/creator/earnings/StatementDownloader';
import { toast } from 'sonner';

// ── Category bar chart config ──
const CATEGORY_CONFIG: Array<{ key: string; label: string; icon: string; color: string; gradient: string }> = [
    { key: 'total_tips', label: 'Tips', icon: '💰', color: '#EC4899', gradient: 'from-pink-500 to-rose-500' },
    { key: 'total_entry_fees', label: 'Entry Fees', icon: '🎟️', color: '#06B6D4', gradient: 'from-cyan-500 to-blue-500' },
    { key: 'total_per_min', label: 'Per-Minute', icon: '⏱️', color: '#F59E0B', gradient: 'from-amber-500 to-yellow-500' },
    { key: 'total_gifts', label: 'Gifts', icon: '🎁', color: '#10B981', gradient: 'from-emerald-500 to-green-500' },
    { key: 'total_reactions', label: 'Reactions', icon: '⚡', color: '#8B5CF6', gradient: 'from-violet-500 to-purple-500' },
    { key: 'total_drops', label: 'Drops', icon: '🔓', color: '#6366F1', gradient: 'from-indigo-500 to-blue-500' },
    { key: 'total_custom_requests', label: 'Requests', icon: '✨', color: '#F97316', gradient: 'from-orange-500 to-red-500' },
    { key: 'total_competition_tips', label: 'Competitions', icon: '🏆', color: '#EAB308', gradient: 'from-yellow-500 to-amber-600' },
    { key: 'total_suga_favorites', label: 'Suga Favs', icon: '❤️', color: '#EF4444', gradient: 'from-red-500 to-pink-600' },
];

function CategoryBreakdown({ ledger }: { ledger: any }) {
    const categories = CATEGORY_CONFIG
        .map(c => ({ ...c, value: Number(ledger?.[c.key] || 0) }))
        .filter(c => c.value > 0)
        .sort((a, b) => b.value - a.value);

    if (categories.length === 0) return null;

    const maxVal = categories[0].value;
    const totalEarned = categories.reduce((s, c) => s + c.value, 0);
    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n);

    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-pink-500" />
                Lifetime by Category
            </h2>
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
                {categories.map(cat => {
                    const pct = (cat.value / maxVal) * 100;
                    const sharePct = ((cat.value / totalEarned) * 100).toFixed(1);
                    return (
                        <div key={cat.key}>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-base leading-none">{cat.icon}</span>
                                    <span className="text-gray-300 font-medium">{cat.label}</span>
                                    <span className="text-[10px] text-gray-600">{sharePct}%</span>
                                </div>
                                <span className="text-white font-semibold tabular-nums">{fmt(cat.value)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${cat.gradient} transition-all duration-700`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Room Type Visual Config ──
const ROOM_ICONS: Record<string, { icon: React.ReactNode; gradient: string }> = {
    confessions: { icon: <Lock className="w-5 h-5" />, gradient: 'from-pink-500/30 to-rose-600/20' },
    'bar-lounge': { icon: <Wine className="w-5 h-5" />, gradient: 'from-purple-500/30 to-indigo-600/20' },
    'x-chat': { icon: <MessageSquare className="w-5 h-5" />, gradient: 'from-yellow-500/30 to-amber-600/20' },
    suga4u: { icon: <Crown className="w-5 h-5" />, gradient: 'from-pink-500/30 to-fuchsia-600/20' },
    'truth-or-dare': { icon: <Video className="w-5 h-5" />, gradient: 'from-green-500/30 to-emerald-600/20' },
    'flash-drop': { icon: <Zap className="w-5 h-5" />, gradient: 'from-blue-500/30 to-cyan-600/20' },
    competition: { icon: <Trophy className="w-5 h-5" />, gradient: 'from-orange-500/30 to-red-600/20' },
    unknown: { icon: <Sparkles className="w-5 h-5" />, gradient: 'from-gray-500/30 to-gray-600/20' },
};

export default function CreatorEarningsPage() {
    const router = useRouter();
    const supabase = createClient();

    // State
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    // Data
    const [ledger, setLedger] = useState<any>(null);
    const [monthSummary, setMonthSummary] = useState<any>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [pagination, setPagination] = useState<any>({ total: 0, has_more: false });
    const [eventTypes, setEventTypes] = useState<string[]>([]);

    // Room data
    const [rooms, setRooms] = useState<any[]>([]);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

    // Filters
    const [searchValue, setSearchValue] = useState('');
    const [selectedEventType, setSelectedEventType] = useState('');

    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n);

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Fetch data
    const fetchEarnings = useCallback(async (offset = 0) => {
        try {
            const qs = new URLSearchParams({
                year: String(year),
                month: String(month),
                limit: '50',
                offset: String(offset),
            });
            if (selectedEventType) qs.set('eventType', selectedEventType);

            const res = await fetch(`/api/v1/creator/earnings?${qs.toString()}`);
            if (!res.ok) {
                const err = await res.json();
                if (res.status === 401) { router.push('/auth'); return; }
                if (res.status === 403) { router.push('/home'); return; }
                throw new Error(err.error);
            }

            const data = await res.json();
            setLedger(data.ledger);
            setMonthSummary(data.month_summary);
            setEventTypes(data.available_event_types || []);

            if (offset === 0) {
                setActivity(data.activity);
            } else {
                setActivity(prev => [...prev, ...data.activity]);
            }
            setPagination(data.pagination);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load earnings');
        } finally {
            setLoading(false);
        }
    }, [year, month, selectedEventType, router]);

    const fetchRooms = useCallback(async () => {
        setRoomsLoading(true);
        try {
            const qs = new URLSearchParams({ year: String(year), month: String(month) });
            const res = await fetch(`/api/v1/creator/earnings/rooms?${qs.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setRooms(data.rooms || []);
            }
        } catch (err) {
            console.error('Room earnings error:', err);
        } finally {
            setRoomsLoading(false);
        }
    }, [year, month]);

    useEffect(() => {
        setLoading(true);
        fetchEarnings(0);
        fetchRooms();
    }, [fetchEarnings, fetchRooms]);

    const handleLoadMore = () => {
        fetchEarnings(pagination.offset + pagination.limit);
    };

    const handleMonthChange = (offset: number) => {
        let nM = month + offset;
        let nY = year;
        if (nM > 12) { nM = 1; nY++; }
        if (nM < 1) { nM = 12; nY--; }
        setMonth(nM);
        setYear(nY);
    };

    // Filter activity by search
    const filteredActivity = searchValue
        ? activity.filter(a =>
            a.revenue_type_name?.toLowerCase().includes(searchValue.toLowerCase()) ||
            a.fan_username?.toLowerCase().includes(searchValue.toLowerCase()) ||
            a.revenue_type?.toLowerCase().includes(searchValue.toLowerCase())
        )
        : activity;

    // (ledger pills replaced by CategoryBreakdown component)

    if (loading && !ledger) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-3" />
                    <div className="text-gray-500 text-sm">Loading earnings...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Room Drawer */}
            {selectedRoom && (
                <RoomEarningsDrawer
                    room={selectedRoom}
                    onClose={() => setSelectedRoom(null)}
                />
            )}

            <div className="max-w-5xl mx-auto px-4 py-6 pb-24 space-y-8">
                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/creator/dashboard')}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
                                Earnings
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">Track your revenue across all rooms</p>
                        </div>
                    </div>

                    {/* Month Navigator */}
                    <div className="flex items-center bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <button onClick={() => handleMonthChange(-1)} className="px-3 py-2 hover:bg-white/5 transition text-gray-400">
                            <ChevronDown className="w-4 h-4 rotate-90" />
                        </button>
                        <span className="px-3 py-2 text-sm text-white font-medium min-w-[120px] text-center">
                            {monthName}
                        </span>
                        <button onClick={() => handleMonthChange(1)} className="px-3 py-2 hover:bg-white/5 transition text-gray-400">
                            <ChevronDown className="w-4 h-4 -rotate-90" />
                        </button>
                    </div>
                </div>

                {/* ── Section 1: Summary Hero ── */}
                <div className="relative rounded-3xl overflow-hidden p-8 border border-white/[0.08]">
                    {/* Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-950/80 via-black to-purple-950/60" />
                    <div className="absolute top-0 right-0 w-72 h-72 bg-pink-500/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-500/10 blur-[100px] rounded-full" />

                    <div className="relative z-10">
                        {/* All-time total */}
                        <div className="text-center mb-6">
                            <div className="text-xs text-pink-300/60 uppercase tracking-widest mb-1">Total Lifetime Earnings</div>
                            <div className="text-5xl md:text-6xl font-bold text-white drop-shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                                {fmt(Number(ledger?.total_earned || 0))}
                            </div>
                        </div>

                        {/* Month stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-center">
                                <div className="flex items-center justify-center gap-1.5 text-green-400 mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-wider">This Month</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{fmt(monthSummary?.creator_earned || 0)}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-center">
                                <div className="flex items-center justify-center gap-1.5 text-purple-400 mb-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-wider">Pending</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{fmt(Number(ledger?.pending_payout || 0))}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-center">
                                <div className="flex items-center justify-center gap-1.5 text-cyan-400 mb-1">
                                    <Zap className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-wider">Events</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{monthSummary?.events_count || 0}</div>
                            </div>
                        </div>

                        {/* Month breakdown mini-pills */}
                        <div className="flex flex-wrap gap-2 mt-4 justify-center text-xs">
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                                Gross: <span className="text-white font-semibold">{fmt(monthSummary?.gross_collected || 0)}</span>
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                                Your 85%: <span className="text-green-400 font-semibold">{fmt(monthSummary?.creator_earned || 0)}</span>
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                                Platform: <span className="text-purple-400 font-semibold">{fmt(monthSummary?.platform_fee || 0)}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Section 1.5: Category Breakdown ── */}
                {ledger && <CategoryBreakdown ledger={ledger} />}

                {/* ── Section 2: Per-Room Earnings Grid ── */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-pink-500" />
                        Room Earnings
                    </h2>

                    {roomsLoading && rooms.length === 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse" />
                            ))}
                        </div>
                    )}

                    {!roomsLoading && rooms.length === 0 && (
                        <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-gray-500 text-sm">
                            No room earnings yet for {monthName}.
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.map(room => {
                            const cfg = ROOM_ICONS[room.room_type] || ROOM_ICONS.unknown;
                            return (
                                <button
                                    key={room.room_key}
                                    onClick={() => setSelectedRoom(room)}
                                    className="group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-pink-500/30 hover:bg-white/[0.04] transition-all text-left relative overflow-hidden"
                                >
                                    {/* Glow */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-xl bg-white/5 text-pink-400 group-hover:bg-pink-500/20 transition">
                                                {cfg.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-white truncate">{room.room_title}</div>
                                                <div className="text-[10px] text-gray-500 capitalize">{room.room_type.replace(/-/g, ' ')}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-between">
                                            <div>
                                                <div className="text-xl font-bold text-green-400">{fmt(room.total_earned)}</div>
                                                <div className="text-[10px] text-gray-500 mt-0.5">{room.events_count} events</div>
                                            </div>
                                            <div className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition">
                                                View details →
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Section 3: Activity Feed ── */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-pink-500" />
                        Activity Feed
                    </h2>
                    <EarningsActivityList
                        items={filteredActivity}
                        loading={loading}
                        hasMore={pagination.has_more}
                        onLoadMore={handleLoadMore}
                        searchValue={searchValue}
                        onSearchChange={setSearchValue}
                        eventTypes={eventTypes}
                        selectedEventType={selectedEventType}
                        onEventTypeChange={setSelectedEventType}
                    />
                </div>

                {/* ── Section 4: Statement Downloads ── */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-pink-500" />
                        Statements
                    </h2>
                    <StatementDownloader
                        downloadEndpoint="/api/v1/creator/earnings/download"
                        previewStats={{
                            earned: monthSummary?.creator_earned || 0,
                            gross: monthSummary?.gross_collected || 0,
                            events: monthSummary?.events_count || 0,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
