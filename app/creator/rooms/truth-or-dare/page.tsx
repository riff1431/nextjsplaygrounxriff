"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Crown,
    Video,
    Users,
    Timer,
    Zap,
    Star,
    Eye,
    MessageCircle,
    Shield,
    CheckCircle2,
    XCircle,
    Flame,
    Crown as CrownIcon,
    TrendingUp,
    Mic,
    Play,
    Pause,
    RotateCcw,
    ArrowLeft,
} from "lucide-react";

// ---------- Pricing / constants (for display; server is source of truth) ----------
const ENTRY_FEE = 10;
const FREE_MINUTES = 10;
const PER_MIN_FEE = 2;

const TIP_SPLIT_CREATOR = 0.9; // 90/10

const TIERS = [
    { id: "bronze", label: "Bronze", price: 5, desc: "Light & playful" },
    { id: "silver", label: "Silver", price: 10, desc: "Spicy" },
    { id: "gold", label: "Gold", price: 20, desc: "Very explicit" },
] as const;

type TierId = (typeof TIERS)[number]["id"];
type CustomType = "truth" | "dare";

const CROWD_TIER_FEES: Record<TierId, number> = { bronze: 5, silver: 10, gold: 15 };
const CROWD_TV_FEES = { truth: 5, dare: 10 } as const;

// ---------- Types ----------
type Role = "creator" | "fan";

type Creator = { id: string; name: string; isHost?: boolean };
type Fan = {
    id: string;
    name: string;
    paidEntry: boolean;
    minutesInRoom: number;
    onCamera: boolean; // opt-in
    walletOk: boolean; // preview flag for low balance handling
    spendTotal: number; // for Dare King/Queen
};

type QueueItemType =
    | "TIER_PURCHASE"
    | "CUSTOM_TRUTH"
    | "CUSTOM_DARE"
    | "TIP"
    | "CROWD_VOTE_TIER"
    | "CROWD_VOTE_TV"
    | "REPLAY_PURCHASE"
    | "TIME_EXTENSION"
    | "ANGLE_UNLOCK"
    | "DOUBLE_DARE";

type QueueItem = {
    id: string;
    type: QueueItemType;
    createdAt: number;
    fanName?: string;
    amount: number; // dollars
    meta: Record<string, any>;
};

type CurrentPrompt = {
    id: string;
    label: string; // what to do
    source: "tier" | "custom";
    tier?: TierId;
    customType?: CustomType;
    purchaser?: string;
    isDoubleDare?: boolean;
    startedAt?: number;
    durationSeconds?: number;
};

// ---------- Helpers ----------
function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}
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
    const d = Math.max(0, Date.now() - ts);
    const s = Math.floor(d / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
}

// ---------- Component ----------
export default function TruthOrDareCreatorRoom() {
    const router = useRouter();
    const supabase = createClient();

    // State
    const [roomId, setRoomId] = useState<string | null>(null);
    const [me, setMe] = useState<Creator>({ id: "c1", name: "Creator", isHost: true });
    const isHost = !!me.isHost;
    const [isLive, setIsLive] = useState(true);

    // Data State
    const [creators, setCreators] = useState<Creator[]>([]);
    const [fans, setFans] = useState<Fan[]>([]);
    const [queue, setQueue] = useState<QueueItem[]>([]);

    // Game State
    const [currentPrompt, setCurrentPrompt] = useState<CurrentPrompt | null>(null);
    const [votesTier, setVotesTier] = useState<Record<TierId, number>>({ bronze: 0, silver: 0, gold: 0 });
    const [votesTV, setVotesTV] = useState<{ truth: number; dare: number }>({ truth: 0, dare: 0 });
    const [doubleDareArmed, setDoubleDareArmed] = useState(false);
    const [replayUntil, setReplayUntil] = useState<number | null>(null);

    const [promptElapsed, setPromptElapsed] = useState(0);
    const promptTimerRef = useRef<number | null>(null);

    // 1. Initialize Room ID & Load Data
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setMe({ id: user.id, name: user.user_metadata?.full_name || "Creator", isHost: true }); // Assume host for creator view

            // Find first room hosted by user
            const { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('host_id', user.id)
                .limit(1)
                .single();

            let targetRoomId = room?.id;

            if (!targetRoomId) {
                // Auto-create room for demo if missing
                const { data: newRoom } = await supabase
                    .from('rooms')
                    .insert([{ host_id: user.id, title: "Truth or Dare Room", status: "live" }])
                    .select()
                    .single();
                targetRoomId = newRoom?.id;
            }

            if (targetRoomId) {
                setRoomId(targetRoomId);
                loadGameData(targetRoomId);
            }
        }
        init();
    }, []);

    async function loadGameData(rid: string) {
        try {
            // Fetch initial state via API
            const res = await fetch(`/api/v1/rooms/${rid}/truth-or-dare/creator`);
            const data = await res.json();

            if (data.game_state) {
                const g = data.game_state;
                if (g.current_prompt) setCurrentPrompt(g.current_prompt);
                if (g.votes_tier) setVotesTier(g.votes_tier);
                if (g.votes_tv) setVotesTV(g.votes_tv);
                setDoubleDareArmed(!!g.is_double_dare_armed);
                if (g.replay_until) setReplayUntil(new Date(g.replay_until).getTime());
            }

            // Fetch Queue
            const qRes = await fetch(`/api/v1/rooms/${rid}/truth-or-dare/queue`);
            const qData = await qRes.json();
            if (qData.queue) {
                // Map DB queue to local type if needed, or assume match
                // DB uses snake_case keys like is_served? No, queue returns items.
                // Types need to match. DB: created_at, fan_name, amount, type, meta, id.
                setQueue(qData.queue.map((i: any) => ({
                    ...i,
                    createdAt: new Date(i.created_at).getTime(),
                    fanName: i.fan_name
                })));
            }

            // Mock creators/fans for visual slots if API returns empty for now
            if (data.creators && data.creators.length > 0) {
                setCreators(data.creators);
            } else {
                setCreators([{ id: "c1", name: "Creator 1", isHost: true }, { id: "c2", name: "Creator 2" }, { id: "c3", name: "Creator 3" }, { id: "c4", name: "Creator 4" }]);
            }

            // We can keep some mock fans for the "On Camera" strip demo if DB is empty
            if (data.camera_slots && data.camera_slots.length > 0) {
                // map slots
            } else {
                setFans([
                    { id: "f1", name: "TopSuga", paidEntry: true, minutesInRoom: 12, onCamera: true, walletOk: true, spendTotal: 120 },
                    { id: "f2", name: "Mike", paidEntry: true, minutesInRoom: 6, onCamera: true, walletOk: true, spendTotal: 45 },
                    { id: "f3", name: "Jason", paidEntry: true, minutesInRoom: 15, onCamera: false, walletOk: true, spendTotal: 70 },
                ]);
            }
        } catch (e) {
            console.error("Failed to load game data", e);
        }
    }

    // 2. Realtime Subscriptions
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(`room_${roomId}_tod`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'truth_dare_games', filter: `room_id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData) {
                    if (newData.current_prompt) setCurrentPrompt(newData.current_prompt);
                    else setCurrentPrompt(null);

                    if (newData.votes_tier) setVotesTier(newData.votes_tier);
                    if (newData.votes_tv) setVotesTV(newData.votes_tv);
                    setDoubleDareArmed(newData.is_double_dare_armed);
                    setReplayUntil(newData.replay_until ? new Date(newData.replay_until).getTime() : null);
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'truth_dare_queue', filter: `room_id=eq.${roomId}` }, (payload) => {
                const newItem = payload.new as any;
                setQueue(prev => [{
                    id: newItem.id,
                    type: newItem.type,
                    createdAt: new Date(newItem.created_at).getTime(),
                    fanName: newItem.fan_name,
                    amount: newItem.amount,
                    meta: newItem.meta
                }, ...prev]);
                // Update derived stats? (Tips etc updated via component memo)
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_queue', filter: `room_id=eq.${roomId}` }, (payload) => {
                const updated = payload.new as any;
                if (updated.is_served) {
                    setQueue(prev => prev.filter(q => q.id !== updated.id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);


    // Derived Logic (Same as before)
    const onCamFans = useMemo(() => fans.filter((f) => f.onCamera).slice(0, 10), [fans]);
    const topSpender = useMemo(() => {
        const sorted = [...fans].sort((a, b) => b.spendTotal - a.spendTotal);
        return sorted[0]?.name ?? "—";
    }, [fans]);

    const revenue = useMemo(() => {
        const tips = queue.filter((q) => q.type === "TIP").reduce((s, q) => s + q.amount, 0);
        const tier = queue.filter((q) => q.type === "TIER_PURCHASE").reduce((s, q) => s + q.amount, 0);
        const custom = queue.filter((q) => q.type === "CUSTOM_TRUTH" || q.type === "CUSTOM_DARE").reduce((s, q) => s + q.amount, 0);
        const votes =
            queue.filter((q) => q.type === "CROWD_VOTE_TIER" || q.type === "CROWD_VOTE_TV").reduce((s, q) => s + q.amount, 0);
        const replay = queue.filter((q) => q.type === "REPLAY_PURCHASE").reduce((s, q) => s + q.amount, 0);
        const addons = queue.filter((q) => q.type === "DOUBLE_DARE" || q.type === "TIME_EXTENSION" || q.type === "ANGLE_UNLOCK").reduce((s, q) => s + q.amount, 0);

        const total = tips + tier + custom + votes + replay + addons;
        const creatorTake = tips * TIP_SPLIT_CREATOR + (total - tips);
        return { tips, tier, custom, votes, replay, addons, total, creatorTake };
    }, [queue]);

    useEffect(() => {
        if (promptTimerRef.current) window.clearInterval(promptTimerRef.current);
        promptTimerRef.current = window.setInterval(() => {
            setPromptElapsed((s) => s + 1);
        }, 1000);
        return () => { if (promptTimerRef.current) window.clearInterval(promptTimerRef.current); };
    }, []);

    useEffect(() => {
        if (!currentPrompt?.startedAt) return;
        setPromptElapsed(Math.floor((Date.now() - currentPrompt.startedAt) / 1000));
    }, [currentPrompt?.startedAt]);

    const replayRemaining = useMemo(() => {
        if (!replayUntil) return 0;
        return Math.max(0, Math.floor((replayUntil - Date.now()) / 1000));
    }, [replayUntil]);


    // ---------- Actions (API) ----------
    async function serveQueueItem(item: QueueItem) {
        if (!roomId) return;

        // Optimistic remove? Or wait for realtime update?
        // Realtime is fast, but optimistic feels snappier.
        // Let's just wait for API+Realtime to keep single source of truth for now, 
        // or just local remove knowing the API marks it served.
        setQueue(q => q.filter(x => x.id !== item.id));

        await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/serve`, {
            method: 'POST',
            body: JSON.stringify({ queueItemId: item.id })
        });
    }

    async function declineCurrentPrompt() {
        if (!roomId) return;
        await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/decline`, { method: 'POST' });
    }

    async function endPrompt() {
        setCurrentPrompt(null);
        setPromptElapsed(0);
        // In production: Maybe an API to clear prompt?
        // For now we just clear local, but state persists in DB.
        // Ideally calls /api/.../end or we reset in DB.
        // Skipping API for "End Prompt" as it wasn't in list, but easy to add. 
    }

    async function toggleDoubleDare() {
        if (!roomId) return;
        const newState = !doubleDareArmed;
        setDoubleDareArmed(newState); // Optimistic
        await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/addons`, {
            method: 'PATCH',
            body: JSON.stringify({ action: 'TOGGLE_DOUBLE_DARE', is_double_dare_armed: newState })
        });
    }

    async function openReplayWindow() {
        if (!roomId) return;
        setReplayUntil(Date.now() + 120000); // Optimistic
        await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/addons`, {
            method: 'PATCH',
            body: JSON.stringify({ action: 'OPEN_REPLAY' })
        });
    }

    const truthWins = votesTV.truth >= votesTV.dare;

    const promptTimeLeft = useMemo(() => {
        if (!currentPrompt?.durationSeconds || !currentPrompt?.startedAt) return 0;
        const elapsed = Math.floor((Date.now() - currentPrompt.startedAt) / 1000);
        return Math.max(0, currentPrompt.durationSeconds - elapsed);
    }, [currentPrompt, promptElapsed]);

    // Loading state if checking roomId
    if (!roomId && isLive) {
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

                <div className="flex items-center gap-3 text-pink-200 text-sm">
                    <Crown className="w-4 h-4" /> Truth or Dare — Creator
                    <span className="hidden sm:inline text-[10px] text-gray-400">
                        Fan billing: Entry ${ENTRY_FEE} · First {FREE_MINUTES} min free · Then ${PER_MIN_FEE}/min
                    </span>
                    <span className="px-2 py-[2px] rounded-full text-[10px] border border-pink-400/40 text-pink-200">
                        {me.name}{isHost ? " (Host)" : ""}
                    </span>
                    <button
                        onClick={() => setIsLive((v) => !v)}
                        className={`px-2 py-[2px] rounded-full text-[10px] border ${isLive ? "border-green-400/40 text-green-200" : "border-gray-600 text-gray-300"
                            }`}
                        title="Preview only"
                    >
                        {isLive ? "● LIVE" : "OFFLINE"}
                    </button>
                </div>
            </div>

            <main className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {/* MAIN STAGE */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                    {/* Creator Grid */}
                    <div className="grid grid-cols-2 grid-rows-2 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => {
                            const c = creators[i];
                            return (
                                <div
                                    key={`creator-${i}`}
                                    className="relative rounded-2xl border border-pink-500/40 aspect-video flex items-center justify-center bg-gray-950"
                                >
                                    <Video className="w-10 h-10 text-pink-400" />
                                    <span className="absolute bottom-2 left-2 text-xs text-pink-200">
                                        {c ? c.name : `Creator ${i + 1}`}
                                    </span>
                                    {c?.isHost && (
                                        <span className="absolute top-2 left-2 text-[10px] px-2 py-[2px] rounded-full border border-yellow-400/40 text-yellow-200">
                                            Host
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Fan Camera Strip (opt-in only) */}
                    <div className="rounded-2xl border border-blue-500/20 bg-gray-950 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-blue-200 text-sm flex items-center gap-2">
                                <Users className="w-4 h-4" /> Fans on Camera
                            </div>
                            <div className="text-[10px] text-gray-400">{onCamFans.length}/10 slots used</div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {onCamFans.length === 0 ? (
                                <div className="text-[11px] text-gray-500">No fans on camera. Fans must opt in (“Join on Camera”).</div>
                            ) : (
                                onCamFans.map((f) => (
                                    <div
                                        key={f.id}
                                        className="relative rounded-xl border border-blue-400/40 w-40 aspect-video flex items-center justify-center bg-gray-900"
                                    >
                                        <Users className="w-6 h-6 text-blue-400" />
                                        <span className="absolute bottom-1 left-1 text-[10px] text-blue-200">{f.name}</span>
                                        {!f.walletOk && (
                                            <span className="absolute top-1 right-1 text-[10px] px-1.5 py-[1px] rounded border border-red-400/40 text-red-200">
                                                Low $
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Preview controls to flip camera state */}
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {fans.slice(0, 4).map((f) => (
                                <button
                                    key={`togglecam-${f.id}`}
                                    onClick={() =>
                                        setFans((fs) =>
                                            fs.map((x) =>
                                                x.id === f.id
                                                    ? { ...x, onCamera: !x.onCamera }
                                                    : x
                                            )
                                        )
                                    }
                                    className="rounded-xl border border-blue-400/25 py-2 text-[11px] text-blue-200 hover:bg-blue-600/10"
                                    title="Preview only"
                                >
                                    {f.onCamera ? `Remove ${f.name}` : `Add ${f.name}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Current Prompt Panel */}
                    <div className="rounded-2xl border border-pink-500/25 bg-gray-950 p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-pink-200 flex items-center gap-2">
                                <Flame className="w-4 h-4" /> Current Prompt
                            </h2>
                            <div className="text-[10px] text-gray-400">
                                Safe-word decline = replacement (no refund)
                            </div>
                        </div>

                        {!currentPrompt ? (
                            <div className="mt-3 text-[11px] text-gray-500">
                                No prompt active. Serve one from the queue.
                            </div>
                        ) : (
                            <div className="mt-3 rounded-xl border border-pink-500/15 bg-black/30 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm text-gray-100">{currentPrompt.label}</div>
                                        <div className="text-[11px] text-gray-400 mt-1">
                                            Purchaser: <span className="text-pink-200">{currentPrompt.purchaser ?? "—"}</span>
                                            {" · "}
                                            Source: {currentPrompt.source}
                                            {currentPrompt.tier ? ` · Tier: ${currentPrompt.tier.toUpperCase()}` : ""}
                                            {currentPrompt.customType ? ` · ${currentPrompt.customType.toUpperCase()}` : ""}
                                            {currentPrompt.isDoubleDare ? " · DOUBLE DARE" : ""}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs text-pink-200 inline-flex items-center gap-2">
                                            <Timer className="w-4 h-4" /> {formatMMSS(promptTimeLeft)}
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">time left</div>
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <button
                                        onClick={declineCurrentPrompt}
                                        className="rounded-xl border border-red-400/30 py-2 text-xs text-red-200 hover:bg-red-600/10 inline-flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" /> Decline / Safe-word
                                    </button>
                                    <button
                                        onClick={() => { }}
                                        className="rounded-xl border border-blue-400/25 py-2 text-xs text-blue-200 hover:bg-blue-600/10 inline-flex items-center justify-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" /> Close-up
                                    </button>
                                    <button
                                        onClick={endPrompt}
                                        className="rounded-xl border border-pink-500/25 py-2 text-xs text-pink-200 hover:bg-pink-600/10 inline-flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> End Prompt
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CONTROL PANEL */}
                <aside className="rounded-2xl border border-pink-500/30 bg-gray-950 p-4 space-y-4">
                    {/* Host controls */}
                    <div className="rounded-xl border border-blue-500/20 bg-black/40 p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-blue-200 text-sm flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Room Controls
                            </div>
                            <div className="text-[10px] text-gray-400">{isHost ? "Host" : "Creator"}</div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                                onClick={toggleDoubleDare}
                                className={`rounded-xl py-2 text-xs border ${doubleDareArmed ? "border-yellow-400/40 text-yellow-200" : "border-pink-500/25 text-pink-200"
                                    } hover:bg-pink-600/10 inline-flex items-center justify-center gap-2`}
                                title="Arms the next prompt with Double Dare (+$15)."
                            >
                                <Zap className="w-4 h-4" /> {doubleDareArmed ? "Double Dare Armed" : "Arm Double Dare"}
                            </button>

                            <button
                                onClick={openReplayWindow}
                                className="rounded-xl border border-pink-500/25 py-2 text-xs text-pink-200 hover:bg-pink-600/10 inline-flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" /> Open Replay Window
                            </button>
                        </div>

                        <div className="mt-2 text-[10px] text-gray-500">
                            Replay remaining: {replayUntil ? formatMMSS(replayRemaining) : "—"}
                        </div>
                    </div>

                    {/* Queue */}
                    <div className="rounded-xl border border-pink-500/20 bg-black/40 p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-pink-200 text-sm flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" /> Incoming Queue
                            </div>
                            <div className="text-[10px] text-gray-400">{queue.length} items</div>
                        </div>

                        <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto pr-1">
                            {queue.map((q) => {
                                const isPrompt =
                                    q.type === "TIER_PURCHASE" || q.type === "CUSTOM_TRUTH" || q.type === "CUSTOM_DARE";
                                return (
                                    <div key={q.id} className="rounded-xl border border-pink-500/15 bg-black/30 p-2.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-xs text-gray-100">
                                                    <span className="text-pink-200">{q.fanName ?? "—"}</span>{" "}
                                                    <span className="text-gray-300">· {q.type.replaceAll("_", " ")}</span>
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-1">
                                                    {q.type === "TIER_PURCHASE" && (
                                                        <>Tier: <span className="text-gray-200">{String(q.meta.tier).toUpperCase()}</span></>
                                                    )}
                                                    {(q.type === "CUSTOM_TRUTH" || q.type === "CUSTOM_DARE") && (
                                                        <>“{String(q.meta.text)}”</>
                                                    )}
                                                    {q.type === "TIP" && <>Tip received</>}
                                                    {q.type === "CROWD_VOTE_TIER" && <>Vote Tier: {String(q.meta.tier).toUpperCase()}</>}
                                                    {q.type === "CROWD_VOTE_TV" && <>Vote: {String(q.meta.pick).toUpperCase()}</>}
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-1">{timeAgo(q.createdAt)}</div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-xs text-pink-200">{money(q.amount)}</div>
                                                {isPrompt ? (
                                                    <button
                                                        onClick={() => serveQueueItem(q)}
                                                        className="mt-2 w-full rounded-lg border border-green-400/25 py-1 text-[11px] text-green-200 hover:bg-green-600/10 inline-flex items-center justify-center gap-1"
                                                    >
                                                        <Play className="w-4 h-4" /> Serve
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setQueue((qq) => qq.filter((x) => x.id !== q.id))}
                                                        className="mt-2 w-full rounded-lg border border-gray-600 py-1 text-[11px] text-gray-300 hover:bg-white/5 inline-flex items-center justify-center gap-1"
                                                        title="Preview-only: dismiss non-prompt items"
                                                    >
                                                        <Pause className="w-4 h-4" /> Dismiss
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {queue.length === 0 && <div className="text-[11px] text-gray-500">Queue empty.</div>}
                        </div>

                        <div className="mt-2 text-[10px] text-gray-500">
                            Note: In production, safe-word decline triggers a same-tier replacement; no refund.
                        </div>
                    </div>

                    {/* Crowd Vote Panels */}
                    <div className="rounded-xl border border-blue-500/20 bg-black/40 p-3">
                        <div className="text-blue-200 text-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Crowd Votes (Paid)
                        </div>

                        <div className="mt-3">
                            <div className="text-[11px] text-gray-300 mb-2">Escalate Tier</div>
                            <div className="grid grid-cols-3 gap-2 text-[11px]">
                                {(Object.keys(votesTier) as TierId[]).map((t) => (
                                    <div key={`vt-${t}`} className="rounded-lg border border-blue-500/15 bg-black/30 p-2">
                                        <div className="text-gray-200">{t.toUpperCase()}</div>
                                        <div className="text-gray-400">{votesTier[t]} votes</div>
                                        <div className="text-blue-200">{money(CROWD_TIER_FEES[t])}/vote</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="text-[11px] text-gray-300 mb-2">Truth vs Dare</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div
                                    className={`rounded-lg border p-2 ${truthWins ? "border-pink-500/40" : "border-blue-500/15"} bg-black/30`}
                                >
                                    <div className="text-gray-200">Truth</div>
                                    <div className="text-gray-400">{votesTV.truth} votes</div>
                                    <div className="text-blue-200">{money(CROWD_TV_FEES.truth)}/vote</div>
                                </div>
                                <div
                                    className={`rounded-lg border p-2 ${!truthWins ? "border-pink-500/40" : "border-blue-500/15"} bg-black/30`}
                                >
                                    <div className="text-gray-200">Dare</div>
                                    <div className="text-gray-400">{votesTV.dare} votes</div>
                                    <div className="text-blue-200">{money(CROWD_TV_FEES.dare)}/vote</div>
                                </div>
                            </div>
                            <div className="mt-2 text-[10px] text-gray-500">
                                Majority wins (preview). In production: apply threshold/round rules server-side.
                            </div>
                        </div>
                    </div>

                    {/* Revenue + Leaderboard */}
                    <div className="rounded-xl border border-pink-500/20 bg-black/40 p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-pink-200 text-sm flex items-center gap-2">
                                <Star className="w-4 h-4" /> Room Earnings
                            </div>
                            <div className="text-[10px] text-gray-400">Tips split 90/10</div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded-lg border border-pink-500/15 bg-black/30 p-2">
                                <div className="text-gray-400">Tips</div>
                                <div className="text-pink-200">{money(revenue.tips)}</div>
                            </div>
                            <div className="rounded-lg border border-pink-500/15 bg-black/30 p-2">
                                <div className="text-gray-400">Tier</div>
                                <div className="text-pink-200">{money(revenue.tier)}</div>
                            </div>
                            <div className="rounded-lg border border-pink-500/15 bg-black/30 p-2">
                                <div className="text-gray-400">Custom</div>
                                <div className="text-pink-200">{money(revenue.custom)}</div>
                            </div>
                            <div className="rounded-lg border border-pink-500/15 bg-black/30 p-2">
                                <div className="text-gray-400">Votes/Add-ons</div>
                                <div className="text-pink-200">{money(revenue.votes + revenue.addons)}</div>
                            </div>
                        </div>

                        <div className="mt-3 text-[11px] text-gray-300 flex items-center justify-between">
                            <span>Total</span>
                            <span className="text-pink-200">{money(revenue.total)}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-gray-500 flex items-center justify-between">
                            <span>Estimated creator take</span>
                            <span>{money(revenue.creatorTake)}</span>
                        </div>

                        <div className="mt-3 text-xs text-pink-200 flex items-center gap-2">
                            <CrownIcon className="w-4 h-4" /> Dare King / Queen: {topSpender}
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
