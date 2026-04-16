'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    DollarSign, TrendingUp, Users, Download, Search,
    ChevronDown, FileText, FileSpreadsheet, Loader2,
    ArrowLeft, Star, Crown, Zap, PieChart, Activity,
    Grid3X3, Lock, Wine, MessageSquare, Video, Trophy,
    Calendar, Clock, ArrowUpRight, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import EarningsActivityList, { type ActivityItem } from '@/components/creator/earnings/EarningsActivityList';
import RoomEarningsDrawer from '@/components/creator/earnings/RoomEarningsDrawer';

// ── Types ────────────────────────────────────────────────────────────────────

interface CreatorRow {
    creator_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    month_gross: number;
    month_earned: number;
    month_platform: number;
    month_events: number;
    lifetime_earned: number;
    pending_payout: number;
}

interface PlatformTotals {
    total_creators: number;
    total_gross: number;
    total_creator_earned: number;
    total_platform: number;
    total_events: number;
}

interface RoomData {
    room_key: string;
    room_title: string;
    room_type: string;
    room_thumbnail?: string | null;
    total_earned: number;
    total_gross: number;
    events_count: number;
    last_activity: string;
    categories: Record<string, number>;
    lines: any[];
}

type AdminView = 'overview' | 'creator-detail';

// ── Room icons ────────────────────────────────────────────────────────────────

const ROOM_ICONS: Record<string, { icon: React.ReactNode; gradient: string }> = {
    confessions: { icon: <Lock className="w-4 h-4" />, gradient: 'from-pink-500/20 to-rose-600/10' },
    'bar-lounge': { icon: <Wine className="w-4 h-4" />, gradient: 'from-purple-500/20 to-indigo-600/10' },
    'x-chat': { icon: <MessageSquare className="w-4 h-4" />, gradient: 'from-yellow-500/20 to-amber-600/10' },
    suga4u: { icon: <Crown className="w-4 h-4" />, gradient: 'from-pink-500/20 to-fuchsia-600/10' },
    'truth-or-dare': { icon: <Video className="w-4 h-4" />, gradient: 'from-green-500/20 to-emerald-600/10' },
    'flash-drop': { icon: <Zap className="w-4 h-4" />, gradient: 'from-blue-500/20 to-cyan-600/10' },
    competition: { icon: <Trophy className="w-4 h-4" />, gradient: 'from-orange-500/20 to-red-600/10' },
    unknown: { icon: <Grid3X3 className="w-4 h-4" />, gradient: 'from-gray-500/20 to-gray-600/10' },
};

// ── Helper ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n);

function Avatar({ url, name, size = 10 }: { url?: string | null; name: string; size?: number }) {
    const letters = name?.slice(0, 2).toUpperCase() || '??';
    const sz = `w-${size} h-${size}`;
    if (url) {
        return (
            <img
                src={url}
                alt={name}
                className={`${sz} rounded-full object-cover border border-white/10`}
            />
        );
    }
    return (
        <div className={`${sz} rounded-full bg-gradient-to-br from-pink-600 to-purple-700 flex items-center justify-center text-xs font-bold text-white border border-white/10 shrink-0`}>
            {letters}
        </div>
    );
}

// ── View A: Creator Overview ──────────────────────────────────────────────────

function CreatorOverview({
    year, month, onSelectCreator,
}: {
    year: number;
    month: number;
    onSelectCreator: (creator: CreatorRow) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [creators, setCreators] = useState<CreatorRow[]>([]);
    const [totals, setTotals] = useState<PlatformTotals | null>(null);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ year: String(year), month: String(month) });
            if (search) qs.set('search', search);
            const res = await window.fetch(`/api/admin/earnings/creators?${qs}`);
            if (!res.ok) throw new Error('Failed to fetch creators');
            const data = await res.json();
            setCreators(data.creators || []);
            setTotals(data.totals || null);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [year, month, search]);

    useEffect(() => { fetch(); }, [fetch]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    return (
        <div className="space-y-5">
            {/* Platform Totals */}
            {totals && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Creators', value: String(totals.total_creators), icon: <Users className="w-3.5 h-3.5" />, color: 'text-cyan-400', border: 'border-cyan-500/10' },
                        { label: 'Gross', value: fmt(totals.total_gross), icon: <Activity className="w-3.5 h-3.5" />, color: 'text-white', border: 'border-white/[0.06]' },
                        { label: 'Creator Payouts', value: fmt(totals.total_creator_earned), icon: <DollarSign className="w-3.5 h-3.5" />, color: 'text-green-400', border: 'border-green-500/10' },
                        { label: 'Platform Revenue', value: fmt(totals.total_platform), icon: <PieChart className="w-3.5 h-3.5" />, color: 'text-purple-400', border: 'border-purple-500/10' },
                        { label: 'Events', value: totals.total_events.toLocaleString(), icon: <Zap className="w-3.5 h-3.5" />, color: 'text-amber-400', border: 'border-amber-500/10' },
                    ].map(stat => (
                        <div key={stat.label} className={`p-4 rounded-2xl bg-black/30 border ${stat.border}`}>
                            <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-2 ${stat.color} opacity-70`}>
                                {stat.icon}
                                {stat.label}
                            </div>
                            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search by creator name or username..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-pink-500/50 focus:outline-none transition"
                />
            </div>

            {/* Creator Cards */}
            {loading && creators.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse" />
                    ))}
                </div>
            )}

            {!loading && creators.length === 0 && (
                <div className="py-16 text-center text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <div className="text-sm">No creators found{search ? ` for "${search}"` : ''}.</div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {creators.map(creator => (
                    <button
                        key={creator.creator_id}
                        onClick={() => onSelectCreator(creator)}
                        className="group p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-pink-500/30 hover:bg-white/[0.04] transition-all text-left relative overflow-hidden"
                    >
                        {/* Hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="relative flex items-center gap-3">
                            <Avatar url={creator.avatar_url} name={creator.username} size={10} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-white truncate">
                                        {creator.full_name || creator.username}
                                    </span>
                                    <span className="text-[10px] text-gray-500 shrink-0">@{creator.username}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-green-400 font-medium">{fmt(creator.month_earned)} this month</span>
                                    <span className="text-[10px] text-gray-600">{creator.month_events} events</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Lifetime</div>
                                <div className="text-sm font-bold text-white">{fmt(creator.lifetime_earned)}</div>
                                <div className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition mt-0.5">
                                    View → 
                                </div>
                            </div>
                        </div>

                        {/* Month bar */}
                        {creator.month_gross > 0 && (
                            <div className="mt-3 space-y-1">
                                <div className="flex justify-between text-[10px] text-gray-600">
                                    <span>Creator {((creator.month_earned / creator.month_gross) * 100).toFixed(0)}%</span>
                                    <span>Platform {((creator.month_platform / creator.month_gross) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-l-full"
                                        style={{ width: `${(creator.month_earned / creator.month_gross) * 100}%` }}
                                    />
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-r-full"
                                        style={{ width: `${(creator.month_platform / creator.month_gross) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── View B: Creator Detail ────────────────────────────────────────────────────

function CreatorDetail({
    creator, year, month, onBack,
}: {
    creator: CreatorRow;
    year: number;
    month: number;
    onBack: () => void;
}) {
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [rooms, setRooms] = useState<RoomData[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);

    const [activityLoading, setActivityLoading] = useState(false);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [pagination, setPagination] = useState({ total: 0, has_more: false, offset: 0, limit: 50 });
    const [search, setSearch] = useState('');
    const [eventType, setEventType] = useState('');
    const [eventTypes, setEventTypes] = useState<string[]>([]);

    const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Fetch rooms
    const fetchRooms = useCallback(async () => {
        setRoomsLoading(true);
        try {
            const qs = new URLSearchParams({ year: String(year), month: String(month) });
            const res = await window.fetch(`/api/admin/earnings/creator/${creator.creator_id}/rooms?${qs}`);
            if (res.ok) {
                const data = await res.json();
                setRooms(data.rooms || []);
            }
        } catch (err) {
            console.error('Rooms fetch error:', err);
        } finally {
            setRoomsLoading(false);
        }
    }, [creator.creator_id, year, month]);

    // Fetch activity
    const fetchActivity = useCallback(async (offset = 0) => {
        setActivityLoading(true);
        try {
            const qs = new URLSearchParams({
                year: String(year),
                month: String(month),
                creatorId: creator.creator_id,
                limit: '50',
                offset: String(offset),
            });
            if (search) qs.set('search', search);
            if (eventType) qs.set('eventType', eventType);

            const res = await window.fetch(`/api/admin/earnings?${qs}`);
            if (!res.ok) throw new Error('Failed to fetch activity');
            const data = await res.json();

            if (offset === 0) {
                setActivity(data.activity || []);
            } else {
                setActivity(prev => [...prev, ...(data.activity || [])]);
            }
            setPagination(data.pagination || { total: 0, has_more: false, offset, limit: 50 });

            // Extract available event types from activity
            const types = [...new Set((data.activity || []).map((a: any) => a.revenue_type).filter(Boolean))] as string[];
            if (offset === 0) setEventTypes(types);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setActivityLoading(false);
        }
    }, [creator.creator_id, year, month, search, eventType]);

    useEffect(() => {
        fetchRooms();
        fetchActivity(0);
    }, [fetchRooms, fetchActivity]);

    const handleDownload = async (format: 'pdf' | 'excel') => {
        setDownloading(format);
        try {
            const qs = new URLSearchParams({
                format, year: String(year), month: String(month),
                creatorId: creator.creator_id,
            });
            const res = await window.fetch(`/api/admin/earnings/download?${qs}`);
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin_${creator.username}_${year}_${month}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success(`${format.toUpperCase()} downloaded!`);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Room drawer */}
            {selectedRoom && (
                <RoomEarningsDrawer room={selectedRoom} onClose={() => setSelectedRoom(null)} />
            )}

            {/* Breadcrumb + back */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="text-sm text-gray-500">
                    <span className="hover:text-white cursor-pointer transition" onClick={onBack}>All Creators</span>
                    <span className="mx-2 text-gray-700">→</span>
                    <span className="text-white font-medium">@{creator.username}</span>
                </div>
            </div>

            {/* Creator Hero Card */}
            <div className="relative rounded-3xl overflow-hidden p-6 border border-white/[0.08]">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-950/60 via-black to-purple-950/50" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-[100px] rounded-full" />

                <div className="relative flex items-start gap-4">
                    <Avatar url={creator.avatar_url} name={creator.username} size={16} />
                    <div className="flex-1 min-w-0">
                        <div className="text-xl font-bold text-white">{creator.full_name || creator.username}</div>
                        <div className="text-sm text-gray-400 mt-0.5">@{creator.username}</div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <span className="px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300">
                                Lifetime: {fmt(creator.lifetime_earned)}
                            </span>
                            {creator.pending_payout > 0 && (
                                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                                    Pending: {fmt(creator.pending_payout)}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Download buttons */}
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => handleDownload('pdf')}
                            disabled={downloading !== null}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-600/80 hover:bg-pink-500 text-white text-xs font-medium transition disabled:opacity-50"
                        >
                            {downloading === 'pdf' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                            PDF
                        </button>
                        <button
                            onClick={() => handleDownload('excel')}
                            disabled={downloading !== null}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium transition disabled:opacity-50"
                        >
                            {downloading === 'excel' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                            Excel
                        </button>
                    </div>
                </div>

                {/* Month summary stats */}
                <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    {[
                        { label: 'Month Gross', value: fmt(creator.month_gross), color: 'text-white' },
                        { label: 'Creator Earned', value: fmt(creator.month_earned), color: 'text-green-400' },
                        { label: 'Platform Fee', value: fmt(creator.month_platform), color: 'text-purple-400' },
                        { label: 'Events', value: creator.month_events.toString(), color: 'text-cyan-400' },
                    ].map(s => (
                        <div key={s.label} className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-center">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
                            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                        </div>
                    ))}
                </div>

                <div className="relative mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>{monthName} report</span>
                </div>
            </div>

            {/* Room Earnings Grid */}
            <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-pink-500" />
                    Room Breakdown
                </h3>

                {roomsLoading && rooms.length === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse" />
                        ))}
                    </div>
                )}

                {!roomsLoading && rooms.length === 0 && (
                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-gray-500 text-sm">
                        No room earnings for {monthName}.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {rooms.map(room => {
                        const cfg = ROOM_ICONS[room.room_type] || ROOM_ICONS.unknown;
                        return (
                            <button
                                key={room.room_key}
                                onClick={() => setSelectedRoom(room)}
                                className="group p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-pink-500/30 hover:bg-white/[0.04] transition-all text-left relative overflow-hidden"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1.5 rounded-lg bg-white/5 text-pink-400">{cfg.icon}</div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-medium text-white truncate">{room.room_title}</div>
                                            <div className="text-[10px] text-gray-500 capitalize">{room.room_type.replace(/-/g, ' ')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div className="text-base font-bold text-green-400">{fmt(room.total_earned)}</div>
                                        <div className="text-[10px] text-gray-600">{room.events_count} events</div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Activity Feed */}
            <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-pink-500" />
                    Earning Activity
                </h3>
                <EarningsActivityList
                    items={activity}
                    loading={activityLoading}
                    hasMore={pagination.has_more}
                    onLoadMore={() => fetchActivity(pagination.offset + pagination.limit)}
                    adminMode={true}
                    searchValue={search}
                    onSearchChange={setSearch}
                    eventTypes={eventTypes}
                    selectedEventType={eventType}
                    onEventTypeChange={setEventType}
                />
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminCreatorEarnings() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [view, setView] = useState<AdminView>('overview');
    const [selectedCreator, setSelectedCreator] = useState<CreatorRow | null>(null);
    const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    const handleMonthChange = (off: number) => {
        let nM = month + off;
        let nY = year;
        if (nM > 12) { nM = 1; nY++; }
        if (nM < 1) { nM = 12; nY--; }
        setMonth(nM);
        setYear(nY);
    };

    const handleSelectCreator = (creator: CreatorRow) => {
        setSelectedCreator(creator);
        setView('creator-detail');
    };

    const handleBack = () => {
        setView('overview');
        setSelectedCreator(null);
    };

    const handleDownloadAll = async (format: 'pdf' | 'excel') => {
        setDownloading(format);
        try {
            const qs = new URLSearchParams({ format, year: String(year), month: String(month) });
            const res = await fetch(`/api/admin/earnings/download?${qs}`);
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin_all_creators_${year}_${month}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success(`${format.toUpperCase()} downloaded!`);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                            <DollarSign className="w-5 h-5 text-green-400" />
                        </div>
                        {view === 'overview' ? 'Creator Earnings' : `@${selectedCreator?.username} — Earnings`}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        {view === 'overview'
                            ? 'All creator earning activity across the platform'
                            : `Detailed earning breakdown for ${selectedCreator?.full_name || selectedCreator?.username}`}
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Month navigator */}
                    <div className="flex items-center bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                        <button onClick={() => handleMonthChange(-1)} className="px-3 py-2 hover:bg-white/5 transition text-gray-400">
                            <ChevronDown className="w-4 h-4 rotate-90" />
                        </button>
                        <span className="px-3 py-2 text-sm text-white font-medium min-w-[120px] text-center">{monthName}</span>
                        <button onClick={() => handleMonthChange(1)} className="px-3 py-2 hover:bg-white/5 transition text-gray-400">
                            <ChevronDown className="w-4 h-4 -rotate-90" />
                        </button>
                    </div>

                    {/* All-creators download (overview only) */}
                    {view === 'overview' && (
                        <>
                            <button
                                onClick={() => handleDownloadAll('pdf')}
                                disabled={downloading !== null}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-600/80 hover:bg-pink-500 text-white text-xs font-medium transition disabled:opacity-50"
                            >
                                {downloading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                PDF
                            </button>
                            <button
                                onClick={() => handleDownloadAll('excel')}
                                disabled={downloading !== null}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium transition disabled:opacity-50"
                            >
                                {downloading === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                                Excel
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Views ── */}
            {view === 'overview' && (
                <CreatorOverview
                    year={year}
                    month={month}
                    onSelectCreator={handleSelectCreator}
                />
            )}

            {view === 'creator-detail' && selectedCreator && (
                <CreatorDetail
                    creator={selectedCreator}
                    year={year}
                    month={month}
                    onBack={handleBack}
                />
            )}
        </div>
    );
}
