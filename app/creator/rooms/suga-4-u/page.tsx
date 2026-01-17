"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Crown,
    Sparkles,
    Flame,
    Gift,
    MessageCircle,
    Timer,
    Mic,
    CheckCircle2,
    XCircle,
    BadgeCheck,
    Users,
    TrendingUp,
    ClipboardList,
    DollarSign,
    ArrowLeft,
} from "lucide-react";

// ---------- Pricing / constants (for display; server is source of truth) ----------
const GOAL_TARGET = 100;

// ---------- Types ----------

type RequestStatus = "pending" | "accepted" | "fulfilled" | "declined";
type PaidRequestType = "POSE" | "SHOUTOUT" | "QUICK_TEASE" | "CUSTOM_CLIP";

type PaidRequest = {
    id: string;
    fanName: string;
    type: PaidRequestType;
    label: string;
    note: string;
    price: number; // dollars
    status: RequestStatus;
    createdAt: number; // epoch ms
};

type OfferDrop = {
    id: string;
    title: string;
    description: string;
    price: number; // dollars
    totalSlots: number;
    slotsRemaining: number;
    endsAt: number; // epoch ms
    claims: number;
    revenue: number; // dollars
};

type ActivityEventType =
    | "ENTRY_FEE"
    | "TIP"
    | "SECRET_UNLOCK"
    | "OFFER_CLAIM"
    | "PAID_REQUEST"
    | "LINK_REVEAL"
    | "BUY_FOR_HER";

type ActivityEvent = {
    id: string;
    ts: number; // epoch ms
    type: ActivityEventType;
    fanName: string;
    label: string;
    amount: number; // dollars
};

// --------------------------- Helpers ----------------------------------------
function formatMMSS(totalSeconds: number) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

function money(n: number) {
    return `$${n.toFixed(0)}`;
}

function timeAgo(ts: number) {
    const delta = Math.max(0, Date.now() - ts);
    const s = Math.floor(delta / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
}

function eventIcon(t: ActivityEventType) {
    switch (t) {
        case "TIP":
            return <Gift className="w-4 h-4" />;
        case "ENTRY_FEE":
            return <BadgeCheck className="w-4 h-4" />;
        case "SECRET_UNLOCK":
            return <Flame className="w-4 h-4" />;
        case "OFFER_CLAIM":
            return <Sparkles className="w-4 h-4" />;
        case "PAID_REQUEST":
            return <Mic className="w-4 h-4" />;
        case "BUY_FOR_HER":
            return <DollarSign className="w-4 h-4" />;
        case "LINK_REVEAL":
            return <TrendingUp className="w-4 h-4" />;
        default:
            return <MessageCircle className="w-4 h-4" />;
    }
}

// --------------------------- Component --------------------------------------

export default function CreatorSuga4URoom() {
    const router = useRouter();
    const supabase = createClient();

    // State
    const [roomId, setRoomId] = useState<string | null>(null);
    const [me, setMe] = useState<{ id: string; name: string } | null>(null);
    const [isLive, setIsLive] = useState(true);

    // Data State
    const [offers, setOffers] = useState<OfferDrop[]>([]);
    const [requests, setRequests] = useState<PaidRequest[]>([]);
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [analytics, setAnalytics] = useState<any[]>([]); // simplified for now

    // Views (Mock for now, hard to real-time track consistently without heartbeat)
    const [viewersTotal, setViewersTotal] = useState(23);
    const [viewersActivePaid, setViewersActivePaid] = useState(17);
    const [viewersExpired, setViewersExpired] = useState(6);

    // Timers
    const [secondsLive, setSecondsLive] = useState(0);
    const liveTimerRef = useRef<number | null>(null);

    // 1. Init
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setMe({ id: user.id, name: user.user_metadata?.full_name || "Suga Baby" });

            // Find room
            const { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('host_id', user.id)
                .limit(1)
                .single();

            let targetRoomId = room?.id;
            if (!targetRoomId) {
                // Auto-create room for demo
                const { data: newRoom } = await supabase
                    .from('rooms')
                    .insert([{ host_id: user.id, title: "Suga 4 U Room", status: "live" }])
                    .select()
                    .single();
                targetRoomId = newRoom?.id;
            }

            if (targetRoomId) {
                setRoomId(targetRoomId);
                loadRoomData(targetRoomId);
            }
        }
        init();
    }, []);

    async function loadRoomData(rid: string) {
        try {
            // Fetch initial State
            const stateRes = await fetch(`/api/v1/rooms/${rid}/suga/state`);
            const stateData = await stateRes.json();

            if (stateData.offers) {
                setOffers(stateData.offers.map((o: any) => ({
                    id: o.id,
                    title: o.title,
                    description: o.description,
                    price: o.price,
                    totalSlots: o.total_slots,
                    slotsRemaining: o.slots_remaining,
                    endsAt: new Date(o.ends_at).getTime(),
                    claims: o.claims,
                    revenue: o.revenue
                })));
            }
            if (stateData.activity) {
                setActivity(stateData.activity.map((a: any) => ({
                    id: a.id,
                    ts: new Date(a.created_at).getTime(),
                    type: a.type,
                    fanName: a.fan_name,
                    label: a.label,
                    amount: a.amount
                })));
            }
            if (stateData.analytics) {
                setAnalytics(stateData.analytics);
            }

            // Fetch Requests (separate call)
            const reqRes = await fetch(`/api/v1/rooms/${rid}/suga/requests`);
            const reqData = await reqRes.json();
            if (reqData.requests) {
                setRequests(reqData.requests.map((r: any) => ({
                    id: r.id,
                    fanName: r.fan_name,
                    type: r.type,
                    label: r.label,
                    note: r.note,
                    price: r.price,
                    status: r.status,
                    createdAt: new Date(r.created_at).getTime()
                })));
            }

        } catch (e) {
            console.error("Failed to load suga data", e);
        }
    }

    // 2. Realtime
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(`room_${roomId}_suga`)
            // Activity Log
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suga_activity_events', filter: `room_id=eq.${roomId}` }, (payload) => {
                const a = payload.new as any;
                const newEvent: ActivityEvent = {
                    id: a.id,
                    ts: new Date(a.created_at).getTime(),
                    type: a.type,
                    fanName: a.fan_name,
                    label: a.label,
                    amount: a.amount
                };
                setActivity(prev => [newEvent, ...prev].slice(0, 50));
            })
            // Requests
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suga_paid_requests', filter: `room_id=eq.${roomId}` }, (payload) => {
                const r = payload.new as any;
                const newReq: PaidRequest = {
                    id: r.id,
                    fanName: r.fan_name,
                    type: r.type,
                    label: r.label,
                    note: r.note,
                    price: r.price,
                    status: r.status,
                    createdAt: new Date(r.created_at).getTime()
                };
                setRequests(prev => [newReq, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'suga_paid_requests', filter: `room_id=eq.${roomId}` }, (payload) => {
                const u = payload.new as any;
                setRequests(prev => prev.map(r => r.id === u.id ? { ...r, status: u.status } : r));
            })
            // Offers (updated on claim)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'suga_offer_drops', filter: `room_id=eq.${roomId}` }, (payload) => {
                const u = payload.new as any;
                setOffers(prev => prev.map(o => o.id === u.id ? {
                    ...o,
                    slotsRemaining: u.slots_remaining,
                    claims: u.claims,
                    revenue: u.revenue
                } : o));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    // Timers
    useEffect(() => {
        if (liveTimerRef.current) window.clearInterval(liveTimerRef.current);
        liveTimerRef.current = window.setInterval(() => {
            setSecondsLive((s) => s + 1);
        }, 1000);
        return () => { if (liveTimerRef.current) window.clearInterval(liveTimerRef.current); };
    }, []);

    // Derived Logic
    const totals = useMemo(() => {
        const byType: Record<ActivityEventType, number> = {
            ENTRY_FEE: 0, TIP: 0, SECRET_UNLOCK: 0, OFFER_CLAIM: 0,
            PAID_REQUEST: 0, LINK_REVEAL: 0, BUY_FOR_HER: 0,
        };
        activity.forEach((e) => {
            if (byType[e.type] !== undefined) byType[e.type] += e.amount;
        });
        const total = Object.values(byType).reduce((a, b) => a + b, 0);
        return { byType, total };
    }, [activity]);

    const goalPct = useMemo(() => {
        const pct = (totals.total / GOAL_TARGET) * 100;
        return Math.max(0, Math.min(100, pct));
    }, [totals.total]);

    const pendingRequests = requests
        .filter((r) => r.status === "pending")
        .sort((a, b) => b.createdAt - a.createdAt);

    // Actions
    async function updateRequestStatus(id: string, status: RequestStatus) {
        if (!roomId) return;
        // Optimistic
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));

        await fetch(`/api/v1/rooms/${roomId}/suga/requests/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    async function simulateOfferClaim(offerId: string) {
        if (!roomId) return;
        // Optimistic handled by realtime subscription primarily, or we can fast-update.
        // Let's rely on API response + realtime to avoid double-counting.
        await fetch(`/api/v1/rooms/${roomId}/suga/offers/${offerId}/claim`, {
            method: 'POST'
        });
    }

    if (!roomId) {
        return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Room...</div>;
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-pink-500/20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/creator/dashboard')}
                        className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-pink-500 text-2xl font-semibold">PlayGround</span>
                        <span className="text-blue-400 text-2xl font-extrabold">X</span>
                    </div>
                </div>

                <div className="text-pink-200 text-sm flex items-center gap-3">
                    <span className="inline-flex items-center gap-2">
                        <Crown className="w-4 h-4" /> Suga4U — Creator
                    </span>

                    <span className="px-2 py-[2px] rounded-full text-[10px] border border-pink-400/40 text-pink-200">
                        {me?.name}
                    </span>

                    <button
                        onClick={() => setIsLive((v) => !v)}
                        className={`px-2 py-[2px] rounded-full text-[10px] border ${isLive ? "border-green-400/40 text-green-200" : "border-gray-600 text-gray-300"
                            }`}
                        title="Toggle live state (preview only)"
                    >
                        {isLive ? "● LIVE" : "OFFLINE"}
                    </button>

                    <span className="px-2 py-[2px] rounded-full text-[10px] border border-pink-500/30 text-pink-200 inline-flex items-center gap-2">
                        <Timer className="w-3 h-3" /> Live {formatMMSS(secondsLive)}
                    </span>
                </div>
            </div>

            <main className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {/* LEFT: Stream + Monetization KPIs */}
                <div className="md:col-span-2 flex flex-col gap-4">
                    {/* Stream Spotlight */}
                    <div className="relative aspect-video rounded-3xl border border-pink-500/40 bg-black flex items-center justify-center overflow-hidden">
                        <div className="pointer-events-none absolute inset-0 opacity-25 animate-pulse bg-gradient-to-b from-pink-500/25 via-transparent to-blue-500/20" />
                        <span className="text-pink-300">Creator Spotlight (Live Feed)</span>

                        <div className="absolute bottom-3 left-3 right-3">
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500" style={{ width: `${goalPct}%` }} />
                            </div>
                            <div className="text-xs text-pink-200 mt-1">
                                Suga Goal: {money(totals.total)} / {money(GOAL_TARGET)}
                            </div>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-pink-500/20 bg-gray-950 p-3">
                            <div className="text-[10px] text-gray-400">Tips & Gifts</div>
                            <div className="text-lg text-pink-200 mt-1">{money(totals.byType.TIP)}</div>
                        </div>
                        <div className="rounded-2xl border border-blue-500/20 bg-gray-950 p-3">
                            <div className="text-[10px] text-gray-400">Secrets</div>
                            <div className="text-lg text-blue-200 mt-1">{money(totals.byType.SECRET_UNLOCK)}</div>
                        </div>
                        <div className="rounded-2xl border border-pink-500/20 bg-gray-950 p-3">
                            <div className="text-[10px] text-gray-400">Offers</div>
                            <div className="text-lg text-pink-200 mt-1">{money(totals.byType.OFFER_CLAIM)}</div>
                        </div>
                        <div className="rounded-2xl border border-yellow-500/20 bg-gray-950 p-3">
                            <div className="text-[10px] text-gray-400">Buy-for-her</div>
                            <div className="text-lg text-yellow-200 mt-1">{money(totals.byType.BUY_FOR_HER)}</div>
                        </div>
                    </div>

                    {/* Offer Drops Performance */}
                    <div className="rounded-2xl border border-blue-500/25 bg-gray-950 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-blue-200 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Offer Drops Performance
                            </h2>
                            <div className="text-[10px] text-gray-400">Timed + limited</div>
                        </div>

                        {offers.length === 0 ? (
                            <div className="text-sm text-gray-500">No active offers.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {offers.map((o) => {
                                    const now = Date.now();
                                    const ended = o.endsAt < now || o.slotsRemaining <= 0;
                                    const secondsLeft = Math.max(0, (o.endsAt - now) / 1000);

                                    return (
                                        <div key={o.id} className="rounded-xl border border-blue-500/20 bg-black/40 p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="text-sm text-blue-100 font-medium">{o.title}</div>
                                                    <div className="text-[11px] text-gray-400 mt-1">{o.description}</div>
                                                </div>
                                                <div className="text-[10px] text-gray-300 whitespace-nowrap">
                                                    {formatMMSS(secondsLeft)}
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-300">
                                                <div>Slots: {o.slotsRemaining}/{o.totalSlots}</div>
                                                <div>Claims: {o.claims}</div>
                                                <div>Price: {money(o.price)}</div>
                                                <div>Revenue: {money(o.revenue)}</div>
                                            </div>

                                            <button
                                                onClick={() => simulateOfferClaim(o.id)}
                                                disabled={ended}
                                                className={`mt-3 w-full px-3 py-2 rounded-xl text-xs border ${ended
                                                    ? "border-gray-700 text-gray-500"
                                                    : "border-blue-400/40 text-blue-200 hover:bg-blue-600/10"
                                                    }`}
                                                title="Preview only: simulates a claim event"
                                            >
                                                {ended ? "Ended" : "Simulate Claim"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Analytics Preview (Static for now until populated by API fully) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-pink-500/25 bg-gray-950 p-4">
                            <h2 className="text-pink-200 mb-2 text-sm flex items-center gap-2">
                                <Flame className="w-4 h-4" /> Secrets Analytics
                            </h2>
                            <div className="text-[11px] text-gray-500">
                                {analytics.length > 0 ? "Data loaded" : "No recent data"}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-pink-500/25 bg-gray-950 p-4">
                            <h2 className="text-pink-200 mb-2 text-sm flex items-center gap-2">
                                <Gift className="w-4 h-4" /> Favorites Analytics
                            </h2>
                            <div className="text-[11px] text-gray-500">
                                {analytics.length > 0 ? "Data loaded" : "No recent data"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* MIDDLE: Live Activity Feed */}
                <aside className="rounded-2xl border border-pink-500/25 bg-gray-950 p-4 flex flex-col">
                    <h3 className="text-pink-200 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Live Activity Feed
                    </h3>

                    <div className="text-[11px] text-gray-400 mb-3">
                        Realtime sales + actions.
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px]">
                        {activity.length === 0 ? (
                            <div className="text-xs text-gray-600">No activity yet.</div>
                        ) : activity.map((e) => (
                            <div
                                key={e.id}
                                className="rounded-xl border border-pink-500/15 bg-black/30 p-2.5"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-pink-200">{eventIcon(e.type)}</span>
                                        <div className="min-w-0">
                                            <div className="text-xs text-gray-100 truncate">
                                                <span className="text-pink-200">{e.fanName}</span>{" "}
                                                <span className="text-gray-300">· {e.label}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-400">{timeAgo(e.ts)}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-pink-200 whitespace-nowrap">{money(e.amount)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* RIGHT: Audience + Request Queue */}
                <aside className="rounded-2xl border border-pink-500/25 bg-gray-950 p-4 space-y-4">
                    {/* Audience Health */}
                    <div className="rounded-xl border border-blue-500/20 bg-black/40 p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-blue-200 text-sm flex items-center gap-2">
                                <Users className="w-4 h-4" /> Audience Health
                            </div>
                            <div className="text-[10px] text-gray-400">Sessions</div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg border border-blue-500/15 bg-black/30 p-2">
                                <div className="text-[10px] text-gray-400">Viewers</div>
                                <div className="text-sm text-blue-100 mt-1">{viewersTotal}</div>
                            </div>
                            <div className="rounded-lg border border-green-500/15 bg-black/30 p-2">
                                <div className="text-[10px] text-gray-400">Active</div>
                                <div className="text-sm text-green-200 mt-1">{viewersActivePaid}</div>
                            </div>
                            <div className="rounded-lg border border-pink-500/15 bg-black/30 p-2">
                                <div className="text-[10px] text-gray-400">Expired</div>
                                <div className="text-sm text-pink-200 mt-1">{viewersExpired}</div>
                            </div>
                        </div>

                        {/* Preview controls */}
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                                className="border border-blue-400/25 rounded-xl py-2 text-[11px] text-blue-200 hover:bg-blue-600/10"
                                onClick={() => setViewersTotal((n) => n + 1)}
                                title="Preview only"
                            >
                                + Viewer
                            </button>
                            <button
                                className="border border-green-400/25 rounded-xl py-2 text-[11px] text-green-200 hover:bg-green-600/10"
                                onClick={() => setViewersActivePaid((n) => n + 1)}
                                title="Preview only"
                            >
                                + Active
                            </button>
                            <button
                                className="border border-pink-400/25 rounded-xl py-2 text-[11px] text-pink-200 hover:bg-pink-600/10"
                                onClick={() => setViewersExpired((n) => n + 1)}
                                title="Preview only"
                            >
                                + Expired
                            </button>
                        </div>
                    </div>

                    {/* Paid Request Queue */}
                    <div className="rounded-xl border border-pink-500/20 bg-black/40 p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-pink-200 text-sm flex items-center gap-2">
                                <ClipboardList className="w-4 h-4" /> Paid Requests
                            </div>
                            <div className="text-[10px] text-gray-400">{pendingRequests.length} pending</div>
                        </div>

                        {pendingRequests.length === 0 ? (
                            <div className="mt-3 text-[11px] text-gray-500">No pending requests.</div>
                        ) : (
                            <div className="mt-3 space-y-2">
                                {pendingRequests.map((r) => (
                                    <div key={r.id} className="rounded-xl border border-pink-500/15 bg-black/30 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-xs text-gray-100">
                                                    <span className="text-pink-200">{r.fanName}</span> · {r.label}{" "}
                                                    <span className="text-gray-400">({money(r.price)})</span>
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-1">{r.note}</div>
                                                <div className="text-[10px] text-gray-500 mt-2">{timeAgo(r.createdAt)}</div>
                                            </div>

                                            <div className="flex flex-col gap-2 items-end">
                                                <button
                                                    onClick={() => updateRequestStatus(r.id, 'accepted')}
                                                    className="px-3 py-1.5 rounded-lg text-[11px] border border-green-400/30 text-green-200 hover:bg-green-600/10 inline-flex items-center gap-1"
                                                    title="Accept"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" /> Accept
                                                </button>
                                                <button
                                                    onClick={() => updateRequestStatus(r.id, 'declined')}
                                                    className="px-3 py-1.5 rounded-lg text-[11px] border border-red-400/30 text-red-200 hover:bg-red-600/10 inline-flex items-center gap-1"
                                                    title="Decline"
                                                >
                                                    <XCircle className="w-4 h-4" /> Decline
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Accepted / fulfilled quick view */}
                        <div className="mt-4 border-t border-pink-500/10 pt-3">
                            <div className="text-[10px] text-gray-400 mb-2">Recently accepted / fulfilled</div>
                            <div className="space-y-2">
                                {requests
                                    .filter((r) => r.status === "accepted" || r.status === "fulfilled")
                                    .sort((a, b) => b.createdAt - a.createdAt)
                                    .slice(0, 3)
                                    .map((r) => (
                                        <div
                                            key={`done:${r.id}`}
                                            className="rounded-xl border border-pink-500/10 bg-black/20 p-2"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-[11px] text-gray-200 truncate">
                                                    {r.fanName} · {r.label}
                                                </div>
                                                <div className="text-[10px] text-gray-500">{r.status}</div>
                                            </div>

                                            {r.status === "accepted" && (
                                                <button
                                                    onClick={() => updateRequestStatus(r.id, 'fulfilled')}
                                                    className="mt-2 w-full px-3 py-2 rounded-xl text-[11px] border border-blue-400/25 text-blue-200 hover:bg-blue-600/10 inline-flex items-center justify-center gap-2"
                                                >
                                                    <BadgeCheck className="w-4 h-4" /> Mark Fulfilled
                                                </button>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
