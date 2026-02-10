"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useRouter } from "next/navigation";
// import { createClient } from "@/utils/supabase/client";
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
    Clock,
} from "lucide-react";
import { toast } from "sonner";
import { playNotificationSound } from "@/utils/sounds";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import BrandLogo from "@/components/common/BrandLogo";
// import AgoraProvider, { createAgoraClient } from "@/components/providers/AgoraProvider"; // Removed
// import CreatorStream from "@/components/rooms/CreatorStream"; // Removed

import dynamic from 'next/dynamic';
const LiveStreamWrapper = dynamic(() => import('@/components/rooms/LiveStreamWrapper'), { ssr: false });
import InteractionOverlay, { OverlayPrompt } from "@/components/rooms/InteractionOverlay";
import CreatorCountdown from "./components/CreatorCountdown";
import EarningsModal from "./components/EarningsModal";
import RoomRequestManager from "@/components/rooms/RoomRequestManager";
import { playMoneySound } from "@/utils/sounds";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

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
    avatar?: string | null;
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

// New Types for Enhanced Features
type ActivityItem = {
    id: string;
    timestamp: number;
    fanName: string;
    type: 'truth' | 'dare' | 'tip' | 'custom_truth' | 'custom_dare';
    tier?: TierId;
    amount: number;
    message?: string;
};

type SessionEarnings = {
    total: number;
    tips: number;
    truths: number;
    dares: number;
    custom: number;
};

type RevealItem = {
    id: string;
    fanId: string;
    fanName: string;
    type: 'truth' | 'dare';
    tier: TierId;
    question: string;
    amount: number;
    timestamp: number;
    requestId: string;
};

type TipItem = {
    id: string;
    fanName: string;
    amount: number;
    message?: string;
};

type CountdownRequest = {
    requestId: string;
    fanId: string;
    fanName: string;
    type: string;
    tier: string;
    content: string;
    amount: number;
    startedAt: number;
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
function money(n: number | undefined | null) {
    return `$${(n ?? 0).toFixed(0)}`;
}
function timeAgo(ts: number) {
    const d = Math.max(0, Date.now() - ts);
    const s = Math.floor(d / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
}

function formatCanadaDate(isoString: string | null | undefined) {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    try {
        return d.toLocaleDateString("en-CA", {
            timeZone: "America/Toronto", // Defaulting to Eastern Time as requested for "Canada Time"
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
    } catch (e) {
        return d.toLocaleDateString("en-CA"); // Fallback if timezone invalid
    }
}

// ---------- Component ----------
export default function TruthOrDareCreatorRoom() {
    const router = useRouter();
    const supabase = createClient();

    // State
    const [roomId, setRoomId] = useState<string | null>(null);
    const [me, setMe] = useState<Creator>({ id: "c1", name: "Creator", isHost: true });
    const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
    const isHost = !!me.isHost;
    const [isLive, setIsLive] = useState(true);

    // Data State
    const [creators, setCreators] = useState<Creator[]>([]);
    const [fans, setFans] = useState<Fan[]>([]);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isGameLoading, setIsGameLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);

    // New State for Enhanced Features
    const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
    const [sessionEarnings, setSessionEarnings] = useState<SessionEarnings>({
        total: 0,
        tips: 0,
        truths: 0,
        dares: 0,
        custom: 0
    });
    const [fanSpending, setFanSpending] = useState<Record<string, { name: string; total: number }>>({});
    const [revealQueue, setRevealQueue] = useState<RevealItem[]>([]);
    const [activeReveal, setActiveReveal] = useState<RevealItem | null>(null);
    const [customResponse, setCustomResponse] = useState("");
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
    const [activeTip, setActiveTip] = useState<TipItem | null>(null);
    const [activeCountdown, setActiveCountdown] = useState<CountdownRequest | null>(null);
    const [earningsNotification, setEarningsNotification] = useState<{
        amount: number;
        fanName: string;
        type: string;
        tier?: string;
    } | null>(null);

    // Game State
    const [currentPrompt, setCurrentPrompt] = useState<CurrentPrompt | null>(null);
    const [votesTier, setVotesTier] = useState<Record<TierId, number>>({ bronze: 0, silver: 0, gold: 0 });
    const [votesTV, setVotesTV] = useState<{ truth: number; dare: number }>({ truth: 0, dare: 0 });
    const [doubleDareArmed, setDoubleDareArmed] = useState(false);
    const [replayUntil, setReplayUntil] = useState<number | null>(null);

    const [promptElapsed, setPromptElapsed] = useState(0);
    const promptTimerRef = useRef<number | null>(null);

    // Session State
    const [sessionActive, setSessionActive] = useState(false);
    const [isInStudio, setIsInStudio] = useState(false);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showExitConfirmation, setShowExitConfirmation] = useState(false); // Moved here
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);

    const startCountdown = () => {
        setCountdown(3);
        let count = 3;
        const timer = setInterval(() => {
            count--;
            if (count < 0) { // < 0 allows "0" (GO!) to show for a beat
                clearInterval(timer);
                setCountdown(null);
                setIsBroadcasting(true);
            } else {
                setCountdown(count);
            }
        }, 1000);
    };

    const [sessionForm, setSessionForm] = useState({
        title: "",
        description: "",
        isPrivate: false,
        price: 10
    });
    const [sessionInfo, setSessionInfo] = useState<{ title: string; isPrivate: boolean; price: number } | null>(null);

    const [overlayPrompt, setOverlayPrompt] = useState<OverlayPrompt | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);

    // 1. Initialize Room ID & Load Data
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setMe({ id: user.id, name: user.user_metadata?.full_name || "Creator", isHost: true }); // Assume host for creator view

            // Fetch creator profile for avatar
            const { data: profile } = await supabase
                .from('profiles')
                .select('avatar_url, full_name, username')
                .eq('id', user.id)
                .single();

            if (profile) {
                setMyAvatarUrl(profile.avatar_url);
                if (profile.full_name || profile.username) {
                    setMe(prev => ({ ...prev, name: profile.full_name || profile.username || prev.name }));
                }
            }

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
                loadGameData(targetRoomId, user.id);
            }
        }
        init();
    }, []);

    async function loadGameData(rid: string, currentUserId: string) {
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

                // Session Info
                if (g.status === 'active') {
                    setSessionActive(true);
                    setSessionInfo({
                        title: g.session_title || "Truth or Dare Session",
                        isPrivate: g.is_private || false,
                        price: g.unlock_price || 0
                    });
                    // Do NOT auto-enter studio. Allow user to "Resume".
                    // setIsInStudio(false); 
                    setShowStartModal(false);
                } else {
                    setSessionActive(false);
                    setIsInStudio(false);
                    setShowStartModal(false); // Show Dashboard first
                }
            }

            // Fetch Queue
            const qRes = await fetch(`/api/v1/rooms/${rid}/truth-or-dare/queue`);
            const qData = await qRes.json();
            if (qData.queue) {
                // Map DB queue to local type if needed, or assume match
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
                // Default to just me
                setCreators([{ id: currentUserId, name: "Me", isHost: true }]);
            }

            // Fans are now populated dynamically via Presence subscription
            // No mock data needed

            // Fetch session history for Dashboard via API (Server Client)
            console.log("Fetching session history for room:", rid);
            const historyRes = await fetch(`/api/v1/rooms/${rid}/truth-or-dare/session`);
            const historyData = await historyRes.json();

            if (historyData.history) {
                console.log("Past games fetched via API:", historyData.history);
                // Map to UI format if needed (title vs session_title mismatch handling as fallback)
                const mapped = historyData.history.map((p: any) => ({
                    ...p,
                    session_title: p.title
                }));
                setHistory(mapped);
            }

            if (historyData.currentEarnings) {
                console.log("Setting initial session earnings:", historyData.currentEarnings);
                setSessionEarnings(prev => ({
                    ...prev,
                    ...historyData.currentEarnings
                }));
            } else {
                console.error("History API error or no earnings:", historyData.error);
            }

        } catch (e) {
            console.error("Failed to load game data", e);
        } finally {
            setIsGameLoading(false);
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

                    if (newData.status === 'active') {
                        setSessionActive(true);
                        setSessionInfo({
                            title: newData.session_title,
                            isPrivate: newData.is_private,
                            price: newData.unlock_price
                        });
                        // Don't auto-open studio on external update, just show resume button
                    } else if (newData.status === 'ended') {
                        setSessionActive(false);
                        setSessionInfo(null);
                        setIsInStudio(false); // Force exit studio if ended remotely
                        setShowStartModal(false); // Return to Dashboard
                    }
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
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_queue', filter: `room_id=eq.${roomId}` }, (payload) => {
                const updated = payload.new as any;
                if (updated.is_served) {
                    setQueue(prev => prev.filter(q => q.id !== updated.id));
                }
            })

            // NEW: Listen for truth_dare_requests (fan purchases)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'truth_dare_requests',
                filter: `room_id=eq.${roomId}`
            }, async (payload) => {
                const request = payload.new as any;
                console.log('🔔 RECEIVED NEW REQUEST EVENT:', request);
                console.log('📊 Room ID check:', { requestRoomId: request.room_id, currentRoomId: roomId });

                // Determine type and tier
                const isSystemPrompt = request.type?.startsWith('system_');
                const isCustom = request.type?.startsWith('custom_');
                const isTip = request.type === 'tip';

                const interactionType = isTip
                    ? 'tip'
                    : isSystemPrompt
                        ? request.type.split('_')[1] as 'truth' | 'dare'
                        : isCustom
                            ? request.type.split('_')[1] as 'truth' | 'dare'
                            : 'truth';

                const tier = request.tier as TierId;
                const amount = Number(request.amount || 0);
                const fanName = request.fan_name || 'Anonymous';

                // 🔔 IMMEDIATE FEEDBACK: Sound + Toast
                playNotificationSound();

                if (isTip) {
                    // Show Tip Overlay (Separate Dialog)
                    setActiveTip({
                        id: request.id,
                        fanName,
                        amount,
                        message: request.content
                    });

                    // Auto-hide tip overlay after 7 seconds
                    setTimeout(() => {
                        setActiveTip(null);
                    }, 7000);
                } else {
                    // Standard Toast for others
                    toast.custom((t) => (
                        <div className="bg-gradient-to-r from-purple-900/90 to-pink-900/90 border border-pink-500/50 backdrop-blur-md rounded-xl p-4 shadow-[0_0_30px_rgba(236,72,153,0.3)] flex items-center gap-4 w-full max-w-md animate-in slide-in-from-top-full duration-500">
                            <div className={`p-3 rounded-full ${interactionType === 'truth' ? 'bg-cyan-500/20' : 'bg-pink-500/20'} border ${interactionType === 'truth' ? 'border-cyan-500/30' : 'border-pink-500/30'}`}>
                                {interactionType === 'truth' ? (
                                    <MessageCircle className="w-6 h-6 text-cyan-400" />
                                ) : (
                                    <Flame className="w-6 h-6 text-pink-500" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-white text-lg leading-none mb-1">
                                        New {tier?.toUpperCase() || ''} {interactionType.toUpperCase()}!
                                    </h4>
                                    <span className="text-green-400 font-bold bg-green-900/30 px-2 py-0.5 rounded text-xs">
                                        +${amount}
                                    </span>
                                </div>
                                <p className="text-pink-200 text-sm opacity-90">
                                    from <span className="font-bold text-white">{fanName}</span>
                                </p>
                            </div>
                        </div>
                    ), { duration: 6000, position: 'top-center' });
                }

                // Add to activity feed
                const activityItem: ActivityItem = {
                    id: request.id,
                    timestamp: new Date(request.created_at).getTime(),
                    fanName,
                    type: isCustom ? `custom_${interactionType}` as any : interactionType as any,
                    tier: isSystemPrompt ? tier : undefined,
                    amount,
                    message: isCustom ? request.content : undefined
                };

                setActivityFeed(prev => {
                    const updated = [activityItem, ...prev].slice(0, 20);
                    console.log('📋 Activity Feed Updated:', updated.length, 'items');
                    return updated;
                }); // Keep last 20

                // Update earnings
                setSessionEarnings(prev => {
                    const newEarnings = { ...prev };
                    newEarnings.total += amount;

                    if (isTip) {
                        newEarnings.tips += amount;
                    } else if (isCustom) {
                        newEarnings.custom += amount;
                    } else if (interactionType === 'truth') {
                        newEarnings.truths += amount;
                    } else if (interactionType === 'dare') {
                        newEarnings.dares += amount;
                    }

                    console.log('💵 Session Earnings Updated:', newEarnings);
                    return newEarnings;
                });

                // Update fan spending tracker
                setFanSpending(prev => {
                    const fanKey = request.fan_id || 'anonymous';
                    const existing = prev[fanKey] || { name: fanName, total: 0 };
                    const newTotal = existing.total + amount;

                    console.log(`💰 Fan spending updated: ${fanName} spent $${amount} (Total: $${newTotal})`);

                    return {
                        ...prev,
                        [fanKey]: {
                            name: fanName,
                            total: newTotal
                        }
                    };
                });

                // If prompt (System or Custom), and NOT a tip, add to reveal queue for "New Request" overlay
                if (request.content && !isTip) {
                    const revealItem: RevealItem = {
                        id: `reveal_${request.id}`,
                        fanId: request.fan_id,
                        fanName,
                        type: interactionType as 'truth' | 'dare',
                        tier: isSystemPrompt ? tier : (isCustom ? 'gold' : 'bronze'), // fallback tier color
                        question: request.content,
                        amount,
                        timestamp: new Date(request.created_at).getTime(),
                        requestId: request.id
                    };

                    console.log('✅ Adding to reveal queue:', revealItem);
                    setRevealQueue(prev => {
                        const newQueue = [...prev, revealItem];
                        console.log('📋 Reveal queue updated. Length:', newQueue.length);
                        return newQueue;
                    });
                } else if (!isTip) {
                    console.log('ℹ️ No content for request:', request);
                }
            })
            .subscribe((status) => {
                console.log('🔌 Realtime subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to room updates');
                    setRealtimeStatus('connected');
                    toast.success('Real-time connected!', { duration: 2000, position: 'bottom-right' });
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Channel error - real-time subscription failed');
                    setRealtimeStatus('error');
                    toast.error('Real-time connection failed', { duration: 5000, position: 'bottom-right' });
                } else if (status === 'TIMED_OUT') {
                    console.error('⏱️ Subscription timed out');
                    setRealtimeStatus('error');
                } else if (status === 'CLOSED') {
                    console.warn('🔒 Channel closed');
                    setRealtimeStatus('closed');
                }
            });

        // Listen for countdown_start broadcast events
        const broadcastChannel = supabase.channel(`room:${roomId}`)
            .on('broadcast', { event: 'countdown_start' }, (payload) => {
                console.log('⏱️ Received countdown_start broadcast:', payload);
                const data = payload.payload;
                setActiveCountdown({
                    requestId: data.requestId,
                    fanId: data.fanId,
                    fanName: data.fanName,
                    type: data.type,
                    tier: data.tier,
                    content: data.content,
                    amount: data.amount,
                    startedAt: data.startedAt
                });
                playNotificationSound();
            })
            .on('broadcast', { event: 'question_answered' }, (payload) => {
                console.log('💰 Question answered, earned:', payload.payload);
                const data = payload.payload;
                // Show earnings modal after 3-second delay
                setTimeout(() => {
                    setEarningsNotification({
                        amount: data.earnedAmount,
                        fanName: data.fanName,
                        type: data.type,
                        tier: data.tier
                    });
                    playMoneySound();
                    // Update session earnings
                    setSessionEarnings(prev => prev + (data.earnedAmount || 0));
                }, 3000);
            })
            .subscribe();

        console.log('🎯 Setting up real-time subscriptions for room:', roomId);

        return () => {
            console.log('🔌 Cleaning up real-time subscriptions');
            supabase.removeChannel(channel);
            supabase.removeChannel(broadcastChannel);
        };
    }, [roomId]);

    // 3. Presence Subscription - Track live viewers
    useEffect(() => {
        if (!roomId) return;

        const presenceChannel = supabase.channel(`presence:${roomId}`);

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                console.log('👥 Presence sync:', state);

                // Convert presence state to Fan array
                const viewers: Fan[] = Object.values(state).flatMap((presences: any) =>
                    presences.map((p: any) => ({
                        id: p.id || 'unknown',
                        name: p.name || 'Anonymous',
                        avatar: p.avatar || null,
                        paidEntry: true,
                        minutesInRoom: Math.floor((Date.now() - p.joinedAt) / 60000),
                        onCamera: false,
                        walletOk: true,
                        spendTotal: 0
                    }))
                );

                setFans(viewers);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('✅ Viewer joined:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('👋 Viewer left:', leftPresences);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, [roomId]);


    // NEW: Fetch Pending Requests on Mount (or Manual Refresh)
    const fetchPendingRequests = async () => {
        if (!roomId) return;
        try {
            console.log("Fetching pending requests for room:", roomId);
            const { data, error } = await supabase
                .from('truth_dare_requests')
                .select('*')
                .eq('room_id', roomId)
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                console.log("Found pending requests:", data);
                // process into revealItems
                const reveals: RevealItem[] = data.map(r => ({
                    id: `reveal_${r.id}`,
                    fanId: r.fan_id,
                    fanName: r.fan_name || 'Anonymous',
                    type: r.type.includes('truth') ? 'truth' : 'dare',
                    tier: r.tier as TierId,
                    question: r.content,
                    amount: r.amount,
                    timestamp: new Date(r.created_at).getTime(),
                    requestId: r.id
                }));

                // Merge with existing queue to avoid duplicates
                setRevealQueue(prev => {
                    const existingIds = new Set(prev.map(p => p.requestId));
                    const uniqueNew = reveals.filter(r => !existingIds.has(r.requestId));
                    if (uniqueNew.length > 0) {
                        toast.success(`Loaded ${uniqueNew.length} pending requests.`);
                        return [...prev, ...uniqueNew];
                    }
                    return prev;
                });
            } else {
                console.log("No pending requests found.");
                // toast("No pending requests.", { position: "bottom-right" }); // constant toast is annoying
            }
        } catch (e) {
            console.error("Error fetching pending requests:", e);
            toast.error("Failed to sync pending requests.");
        }
    };

    useEffect(() => {
        if (roomId) {
            fetchPendingRequests();
        }
    }, [roomId]);


    // Derived Logic (Same as before)
    const onCamFans = useMemo(() => fans.filter((f) => f.onCamera).slice(0, 10), [fans]);
    const topSpender = useMemo(() => {
        const spenders = Object.values(fanSpending);
        if (spenders.length === 0) return "—";
        const sorted = spenders.sort((a, b) => b.total - a.total);
        return sorted[0]?.name ?? "—";
    }, [fanSpending]);

    // Log top spender changes
    useEffect(() => {
        if (topSpender !== "—") {
            const topSpenderData = Object.values(fanSpending).sort((a, b) => b.total - a.total)[0];
            console.log(`👑 Top Spender (Dare King): ${topSpender} with $${topSpenderData?.total.toFixed(2)}`);
        }
    }, [topSpender, fanSpending]);

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

    // NEW: Process reveal queue with 10-second delay
    useEffect(() => {
        if (revealQueue.length > 0 && !activeReveal) {
            const next = revealQueue[0];
            const delay = 500; // Immediate (was 10s)

            console.log(`Queuing reveal for "${next.question}" in ${delay / 1000} seconds...`);

            const timer = setTimeout(() => {
                setActiveReveal(next);
                setRevealQueue(prev => prev.slice(1));
            }, delay);

            return () => clearTimeout(timer);
        }
    }, [revealQueue, activeReveal]);

    const replayRemaining = useMemo(() => {
        if (!replayUntil) return 0;
        return Math.max(0, Math.floor((replayUntil - Date.now()) / 1000));
    }, [replayUntil]);


    // ---------- Actions (API) ----------
    async function serveQueueItem(item: QueueItem) {
        if (!roomId) return;
        try {
            // 1. Determine prompt text
            let pText = "";
            if (item.type === "TIER_PURCHASE") {
                pText = `Perform a ${item.meta.tier} tier dare!`;
            } else if (item.type === "CUSTOM_TRUTH" || item.type === "CUSTOM_DARE") {
                pText = item.meta.text;
            } else {
                console.warn("Attempted to serve non-prompt item:", item);
                return; // Only serve actual prompts
            }

            // 2. Mark item as served in DB
            await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/serve`, {
                method: 'POST',
                body: JSON.stringify({ queueItemId: item.id })
            });

            // 3. Update local state
            setCurrentPrompt({
                id: item.id,
                label: pText,
                source: item.type.includes('CUSTOM') ? 'custom' : 'tier',
                tier: item.meta.tier,
                customType: item.type.includes('TRUTH') ? 'truth' : 'dare',
                purchaser: item.fanName,
                isDoubleDare: doubleDareArmed,
                startedAt: Date.now()
            });

            // 4. Broadcast Realtime Event & Update Game Table
            if (roomId) {
                // Update Game Table (Persistence for late joiners)
                await supabase.from('truth_dare_games')
                    .update({
                        current_round_data: {
                            id: item.id,
                            type: item.type.includes('TRUTH') ? 'truth' : 'dare',
                            text: pText,
                            fanName: item.fanName,
                            tier: item.meta.tier,
                            customType: item.type.includes('TRUTH') ? 'custom_truth' : 'custom_dare',
                            startedAt: Date.now()
                        }
                    })
                    .eq('room_id', roomId);

                // Broadcast Event (Instant Animation)
                // We'll use the existing channel or a new one. Let's use the 'room:ID' channel if possible, 
                // but since we might not have a dedicated channel ref here, let's send it via a new temporary channel call 
                // or assume the main listener will pick it up if we update the table.
                // BETTER: Explicit broadcast for animation sync.
                await supabase.channel(`room:${roomId}`)
                    .send({
                        type: 'broadcast',
                        event: 'game_update',
                        payload: {
                            type: 'reveal',
                            prompt: {
                                id: item.id,
                                type: item.type.includes('TRUTH') ? 'truth' : 'dare',
                                text: pText,
                                fanName: item.fanName,
                                tier: item.meta.tier
                            }
                        }
                    });
            }

            // 5. Trigger Local Overlay for Creator
            setOverlayPrompt({
                id: item.id,
                type: item.type.includes('TRUTH') ? 'truth' : 'dare',
                text: pText,
                fanName: item.fanName || 'Anonymous',
                tier: item.meta.tier
            });
            setShowOverlay(true);
            setTimeout(() => setShowOverlay(false), 6000); // Hide after 6s

            // Remove from queue
            setQueue(q => q.filter(x => x.id !== item.id));
            if (doubleDareArmed) setDoubleDareArmed(false);

        } catch (err) {
            console.error("Error serving item:", err);
            // toast.error("Failed to serve item");
        }
    }

    async function declineCurrentPrompt() {
        if (!roomId) return;
        await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/decline`, { method: 'POST' });
    }

    async function endPrompt() {
        setCurrentPrompt(null);
        setPromptElapsed(0);
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

    // Session Actions
    async function startSession() {
        if (!roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/session`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'START_SESSION',
                    title: sessionForm.title || "Live Truth or Dare",
                    description: sessionForm.description,
                    isPrivate: sessionForm.isPrivate,
                    price: Number(sessionForm.price)
                })
            });
            const data = await res.json();
            console.log("Start Session Response:", data);
            if (!res.ok) throw new Error(data.error);

            // Optimistic update
            setSessionActive(true);
            setIsInStudio(true); // Enter Studio Immediately
            setSessionInfo({
                title: sessionForm.title || "Live Truth or Dare",
                isPrivate: sessionForm.isPrivate,
                price: Number(sessionForm.price)
            });
            setShowStartModal(false);

        } catch (e: any) {
            console.error(e);
            alert("Failed to start session: " + e.message);
        }
    }

    async function endSession() {
        if (!roomId) return;
        // if (!confirm("End the current session?")) return; // Removed confirm, using modal
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/session`, {
                method: 'POST',
                body: JSON.stringify({ action: 'END_SESSION' })
            });
            if (res.ok) {
                setSessionActive(false);
                setIsInStudio(false); // Exit Studio
                setSessionInfo(null);
                setShowStartModal(false); // Return to Dashboard
                setShowExitConfirmation(false); // Close Modal
            }
        } catch (e) {
            console.error(e);
        }
    }

    // Navigation Intercept is handled by state above

    // Loading state if checking roomId - Moved to after hooks
    if (!roomId && isLive) {
        return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Room...</div>;
    }

    const handleBackNavigation = () => {
        if (sessionActive && (!history[0] || history[0].status === 'active')) {
            setShowExitConfirmation(true);
        } else {
            router.push('/creator/dashboard');
        }
    };

    // ... (rest of render)

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-pink-500/20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBackNavigation}
                        className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <BrandLogo showBadge={false} />
                </div>

                <div className="flex items-center gap-3 text-pink-200 text-sm">
                    <Crown className="w-4 h-4" /> Truth or Dare — Creator
                    <span className="hidden sm:inline text-[10px] text-gray-400">
                        {sessionActive ? `Live: ${sessionInfo?.title}` : "Inactive"}
                    </span>
                    <span className="px-2 py-[2px] rounded-full text-[10px] border border-pink-400/40 text-pink-200">
                        {me.name}{isHost ? " (Host)" : ""}
                    </span>
                    {/* Realtime Status Indicator */}
                    <span
                        className={`px-2 py-[2px] rounded-full text-[10px] border flex items-center gap-1 ${realtimeStatus === 'connected' ? 'border-green-500/40 text-green-300 bg-green-500/10' :
                            realtimeStatus === 'error' ? 'border-red-500/40 text-red-300 bg-red-500/10' :
                                realtimeStatus === 'closed' ? 'border-gray-500/40 text-gray-300 bg-gray-500/10' :
                                    'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'
                            }`}
                        title={`Realtime: ${realtimeStatus}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${realtimeStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                            realtimeStatus === 'error' ? 'bg-red-400' :
                                realtimeStatus === 'closed' ? 'bg-gray-400' :
                                    'bg-yellow-400 animate-pulse'
                            }`} />
                        {realtimeStatus === 'connected' ? 'LIVE' :
                            realtimeStatus === 'error' ? 'ERROR' :
                                realtimeStatus === 'closed' ? 'OFFLINE' :
                                    'CONNECTING...'}
                    </span>
                    {sessionActive && (
                        <div className="flex items-center gap-2 ml-4 border-l border-white/10 pl-4">
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/rooms/truth-or-dare?roomId=${roomId}`;
                                    navigator.clipboard.writeText(url);
                                    alert("Session link copied to clipboard: " + url);
                                }}
                                className="text-[10px] bg-blue-900/40 border border-blue-500/30 px-3 py-1 rounded hover:bg-blue-900/60 transition flex items-center gap-1 group"
                            >
                                <span className="group-hover:scale-110 transition-transform">🔗</span> Copy Link
                            </button>
                            {isHost && (
                                <button
                                    onClick={() => setShowExitConfirmation(true)}
                                    className="text-[10px] bg-red-900/40 border border-red-500/30 px-2 py-1 rounded hover:bg-red-900/60 transition"
                                >
                                    End Session
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Exit/End Confirmation Modal */}
            {showExitConfirmation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                    <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <Video className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">End Live Session?</h2>
                        <p className="text-gray-400 mb-8">
                            This will stop the stream for all viewers and close the session. Are you sure you want to exit?
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowExitConfirmation(false)}
                                className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={endSession}
                                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-900/20 transition"
                            >
                                End Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard View (History + Create/Resume Button) */}
            {!isInStudio && !showStartModal && (
                <div className="max-w-5xl mx-auto p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Truth or Dare Studio</h1>
                            <p className="text-gray-400">Manage your live interactive game sessions.</p>
                        </div>
                        {sessionActive ? (
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <div className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">Session Active</div>
                                    <div className="text-white font-bold">{sessionInfo?.title}</div>
                                </div>
                                <button
                                    onClick={() => setIsInStudio(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 animate-pulse"
                                >
                                    <Video className="w-5 h-5 fill-current" /> Resume Live Session
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowStartModal(true)}
                                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2"
                            >
                                <Play className="w-5 h-5 fill-current" /> Create New Session
                            </button>
                        )}
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="p-6 rounded-2xl bg-gray-900 border border-white/5">
                            <div className="text-gray-400 text-sm mb-1">Total Sessions</div>
                            <div className="text-3xl font-bold text-white">{history ? history.length : 0}</div>
                        </div>
                        <div className="p-6 rounded-2xl bg-gray-900 border border-white/5">
                            <div className="text-gray-400 text-sm mb-1">Latest Session</div>
                            <div className="text-3xl font-bold text-blue-400">
                                {history && history[0] ? formatCanadaDate(history[0].started_at || history[0].created_at) : "-"}
                            </div>
                        </div>
                    </div>

                    {/* Session History */}
                    <div className="rounded-2xl border border-white/10 bg-gray-950 overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-white">Previous Sessions</h3>
                        </div>
                        <div className="divide-y divide-white/5">
                            {history.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    No session history found. Start your first game!
                                </div>
                            ) : (
                                history.map((session) => (
                                    <div key={session.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition">
                                        <div>
                                            <div className="font-bold text-white mb-1">{session.session_title || "Untitled Session"}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-2">
                                                <span>{formatCanadaDate(session.started_at || session.created_at)}</span>
                                                <span>•</span>
                                                <span className={session.is_private ? "text-purple-400" : "text-green-400"}>
                                                    {session.is_private ? "Private" : "Public"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className={`text-xs font-bold px-2 py-1 rounded-full border ${session.status === 'active'
                                                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                                    : 'border-white/10 bg-white/5 text-gray-400'
                                                    }`}>
                                                    {session.status === 'active' ? 'LIVE' : 'ENDED'}
                                                </div>
                                            </div>
                                            {session.status === 'active' && (
                                                <button
                                                    onClick={() => setIsInStudio(true)}
                                                    className="p-2 rounded-full border border-green-500/30 text-green-400 hover:bg-green-500/10"
                                                    title="Resume Session"
                                                >
                                                    <Play className="w-4 h-4 fill-current" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Session Create Modal */}
            {!sessionActive && showStartModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
                    <div className="max-w-md w-full bg-gray-950 border border-green-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(34,197,94,0.1)] relative">
                        <button
                            onClick={() => setShowStartModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <Play className="w-8 h-8 text-green-400 ml-1" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Start New Session</h2>
                            <p className="text-gray-400 mt-2">Configure your live room details.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Session Title</label>
                                <input
                                    type="text"
                                    value={sessionForm.title}
                                    onChange={e => setSessionForm({ ...sessionForm, title: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-green-500/50 outline-none"
                                    placeholder="e.g. Friday Night Truths"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                                <textarea
                                    value={sessionForm.description}
                                    onChange={e => setSessionForm({ ...sessionForm, description: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-green-500/50 outline-none resize-none"
                                    rows={3}
                                    placeholder="Briefly describe what fans can expect..."
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Session Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setSessionForm({ ...sessionForm, isPrivate: false })}
                                        className={`p-3 rounded-xl border text-sm transition ${!sessionForm.isPrivate ? "border-green-500/50 bg-green-500/10 text-white" : "border-white/10 text-gray-400"}`}
                                    >
                                        Public
                                    </button>
                                    <button
                                        onClick={() => setSessionForm({ ...sessionForm, isPrivate: true })}
                                        className={`p-3 rounded-xl border text-sm transition ${sessionForm.isPrivate ? "border-purple-500/50 bg-purple-500/10 text-white" : "border-white/10 text-gray-400"}`}
                                    >
                                        Private
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Entry Price ($)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={10}
                                        readOnly
                                        disabled
                                        className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-gray-400 text-sm cursor-not-allowed opacity-70 outline-none"
                                    />
                                    <span className="absolute right-4 top-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Fixed</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Standard entry fee for all Truth or Dare sessions.
                                </p>
                            </div>

                            <button
                                onClick={startSession}
                                className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg shadow-lg shadow-green-900/20 transition mt-4"
                            >
                                Go Live
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Dashboard - Only Render if In Studio */}
            {isInStudio && (
                <main className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
                    {/* MAIN STAGE */}
                    <div className="lg:col-span-3 flex flex-col gap-4 relative">
                        {/* Creator Grid */}
                        <div className={`grid gap-4 ${creators.length === 1 ? 'grid-cols-1 aspect-video' : 'grid-cols-2 grid-rows-2'}`}>
                            {creators.map((c, i) => {
                                const isMe = c.id === me.id;
                                return (
                                    <div
                                        key={`creator-${i}`}
                                        className={`relative rounded-2xl border aspect-video flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-[1.02] ${creators.length === 1
                                            ? 'border-pink-500/60 bg-gradient-to-br from-gray-950 via-pink-950/10 to-gray-950 shadow-[0_0_40px_rgba(236,72,153,0.3),0_0_80px_rgba(236,72,153,0.15)] hover:shadow-[0_0_60px_rgba(236,72,153,0.4),0_0_100px_rgba(236,72,153,0.2)]'
                                            : 'border-pink-500/40 bg-gray-950/80 backdrop-blur-sm shadow-[0_0_20px_rgba(236,72,153,0.2)]'
                                            }`}
                                    >
                                        {isMe && roomId ? (
                                            isBroadcasting ? (
                                                <div className="w-full h-full">
                                                    <LiveStreamWrapper
                                                        role="host"
                                                        appId={APP_ID}
                                                        roomId={roomId}
                                                        uid={me.id}
                                                        hostId={me.id}
                                                        hostAvatarUrl={myAvatarUrl}
                                                        hostName={me.name}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-4 z-10 w-full h-full relative p-6">
                                                    {countdown !== null ? (
                                                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
                                                            <div className="text-8xl font-black italic bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-bounce">
                                                                {countdown === 0 ? "GO!" : countdown}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center animate-pulse border border-pink-500/20 shadow-[0_0_50px_rgba(236,72,153,0.5),0_0_100px_rgba(236,72,153,0.3)] backdrop-blur-sm">
                                                                <Video className="w-8 h-8 text-pink-400" />
                                                            </div>
                                                            <div className="text-center space-y-2">
                                                                <h3 className="text-xl font-bold text-white">Ready to Stream?</h3>
                                                                <p className="text-xs text-pink-300/80 max-w-[200px] mx-auto">
                                                                    You are about to go live to the public. Make sure your camera and mic are ready.
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={startCountdown}
                                                                className="mt-2 px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-pink-900/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
                                                            >
                                                                <Zap className="w-5 h-5 fill-current group-hover:text-yellow-300 transition-colors" />
                                                                Start Live Stream
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            <>
                                                <Video className="w-10 h-10 text-pink-400" />
                                                <span className="absolute bottom-2 left-2 text-xs text-pink-200">
                                                    {c.name}
                                                </span>
                                            </>
                                        )}

                                        {c.isHost && (
                                            <span className="absolute top-4 left-4 text-xs px-2 py-1 rounded-full border border-yellow-400/40 text-yellow-200 bg-black/60 backdrop-blur-md shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                                                Host
                                            </span>
                                        )}

                                        {/* Stop Stream Button (overlay when live) */}
                                        {isMe && isBroadcasting && (
                                            <button
                                                onClick={() => setIsBroadcasting(false)}
                                                className="absolute bottom-4 right-4 p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-md transition"
                                                title="Stop Streaming"
                                            >
                                                <Video className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Placeholder for Invite control (Future) */}
                            {creators.length < 4 && isHost && (
                                <div className="hidden">
                                    {/* Hidden for now: Invite UI logic would go here */}
                                </div>
                            )}
                        </div>

                        {/* Fan Camera Strip (opt-in only) */}
                        <div className="rounded-2xl border border-blue-500/30 bg-gray-950/60 backdrop-blur-md p-4 shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.25)]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-blue-200 text-sm flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Live Viewers
                                </div>
                                <div className="text-[10px] text-gray-400">{fans.length} watching</div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {fans.length === 0 ? (
                                    <div className="text-[11px] text-gray-500">No viewers yet. Share the room link to invite fans!</div>
                                ) : (
                                    fans.map((f) => (
                                        <div
                                            key={f.id}
                                            className="relative rounded-xl border border-blue-400/40 p-3 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-200 hover:scale-105 hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] min-w-[80px]"
                                        >
                                            {/* Avatar or Initials */}
                                            {f.avatar ? (
                                                <img
                                                    src={f.avatar}
                                                    alt={f.name}
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-400/50"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border-2 border-blue-400/50">
                                                    {f.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="mt-2 text-[10px] text-blue-200 truncate max-w-[70px]">{f.name}</span>
                                            {!f.walletOk && (
                                                <span className="absolute top-1 right-1 text-[8px] px-1 py-[1px] rounded border border-red-400/40 text-red-200">
                                                    Low $
                                                </span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>


                    </div>

                    {/* CONTROL PANEL */}
                    <aside className="rounded-2xl border border-pink-500/40 bg-gray-950/70 backdrop-blur-xl p-4 space-y-4 shadow-[0_0_50px_rgba(236,72,153,0.15)] lg:sticky lg:top-8 max-h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-pink-500/20 scrollbar-track-transparent">
                        {/* Host controls */}

                        {/* NEW: Earnings Dashboard */}
                        <div className="rounded-xl border border-green-500/40 bg-gradient-to-br from-green-950/30 to-emerald-950/30 backdrop-blur-md p-4 shadow-[0_0_40px_rgba(34,197,94,0.2)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(34,197,94,0.3)]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-green-200 text-sm flex items-center gap-2 font-bold">
                                    <TrendingUp className="w-4 h-4" /> Room Earnings
                                </div>
                                <div className="text-xs text-gray-400">This Session</div>
                            </div>

                            {/* Total Earnings */}
                            <div className="rounded-xl bg-black/60 backdrop-blur-sm border border-green-500/30 p-4 mb-3 shadow-[inset_0_0_30px_rgba(34,197,94,0.1)]">
                                <div className="text-xs text-green-400 uppercase tracking-wider mb-1">Total Earned</div>
                                <div className="text-3xl font-black text-white flex items-baseline gap-1">
                                    <span className="text-green-400">$</span>
                                    <span className="tabular-nums">{(sessionEarnings?.total ?? 0).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Breakdown */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Tips</span>
                                    <span className="text-white font-bold">${(sessionEarnings?.tips ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Truths</span>
                                    <span className="text-cyan-300 font-bold">${(sessionEarnings?.truths ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Dares</span>
                                    <span className="text-pink-300 font-bold">${(sessionEarnings?.dares ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Custom</span>
                                    <span className="text-purple-300 font-bold">${(sessionEarnings?.custom ?? 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* NEW: Live Activity Feed */}
                        <div className="rounded-xl border border-cyan-500/30 bg-black/60 backdrop-blur-md p-3 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-cyan-200 text-sm flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> Live Activity
                                </div>
                                <div className="text-[10px] text-gray-400">{activityFeed.length} recent</div>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {activityFeed.length === 0 ? (
                                    <div className="text-[11px] text-gray-500 text-center py-4">
                                        No activity yet. Waiting for fan interactions...
                                    </div>
                                ) : (
                                    activityFeed.map((activity) => {
                                        const tierColor = activity.tier === 'gold' ? 'text-yellow-400' :
                                            activity.tier === 'silver' ? 'text-cyan-400' :
                                                'text-amber-400';
                                        const typeColor = activity.type === 'truth' || activity.type === 'custom_truth' ? 'text-cyan-300' :
                                            activity.type === 'dare' || activity.type === 'custom_dare' ? 'text-pink-300' :
                                                'text-green-300';

                                        return (
                                            <div
                                                key={activity.id}
                                                className="rounded-lg border border-white/10 bg-gradient-to-r from-black/60 to-black/40 p-2.5 animate-in slide-in-from-right duration-300"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs">
                                                            <span className="text-white font-bold">{activity.fanName}</span>
                                                            {' '}
                                                            <span className="text-gray-400">bought</span>
                                                            {' '}
                                                            {activity.tier && (
                                                                <span className={`${tierColor} font-bold uppercase`}>
                                                                    {activity.tier}
                                                                </span>
                                                            )}
                                                            {' '}
                                                            <span className={`${typeColor} font-bold capitalize`}>
                                                                {activity.type.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        {activity.message && (
                                                            <div className="text-[10px] text-gray-400 mt-1 truncate">
                                                                "{activity.message}"
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-gray-500 mt-1">
                                                            {timeAgo(activity.timestamp)}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-bold text-green-400">
                                                        +${activity.amount}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Queue */}
                        <div className="rounded-xl border border-pink-500/30 bg-black/60 backdrop-blur-md p-3 shadow-[0_0_25px_rgba(236,72,153,0.15)]">
                            <div className="flex items-center justify-between">
                                <div className="text-pink-200 text-sm flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4" /> Incoming Queue
                                </div>
                                <div className="text-[10px] text-gray-400">{queue.length} items</div>
                            </div>

                            <div className="mt-3 space-y-2 max-h-[600px] overflow-y-auto pr-1">
                                {queue.map((q) => {
                                    const isPrompt =
                                        q.type === "TIER_PURCHASE" || q.type === "CUSTOM_TRUTH" || q.type === "CUSTOM_DARE";
                                    return (
                                        <div key={q.id} className="rounded-xl border border-pink-500/20 bg-black/50 backdrop-blur-sm p-2.5 shadow-[0_0_10px_rgba(236,72,153,0.1)] transition-all duration-200 hover:border-pink-500/40 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]">
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

                    </aside>
                </main >
            )
            }

            {/* NEW: Question Reveal Modal */}
            {
                activeReveal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in duration-700">
                        <div className="w-full max-w-2xl bg-gradient-to-br from-purple-950/50 to-pink-950/50 backdrop-blur-xl border-2 border-pink-500/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_0_100px_rgba(236,72,153,0.5),0_0_200px_rgba(236,72,153,0.3)] animate-in zoom-in-95 duration-700 relative overflow-hidden">
                            {/* Animated background glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 animate-pulse pointer-events-none" />

                            {/* Header */}
                            <div className="text-center mb-6 relative z-10">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/30 backdrop-blur-md border border-pink-500/50 mb-4 shadow-[0_0_30px_rgba(236,72,153,0.4)] animate-pulse">
                                    <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
                                    <span className="text-sm font-bold text-pink-200 uppercase tracking-wider">
                                        New {activeReveal.type} Request
                                    </span>
                                </div>

                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${activeReveal.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' :
                                        activeReveal.tier === 'silver' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                                            'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        }`}>
                                        {activeReveal.tier} Tier
                                    </span>
                                    <span className="text-2xl font-black text-green-400">
                                        +${activeReveal.amount}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-400">
                                    From <span className="text-white font-bold">{activeReveal.fanName}</span>
                                </div>
                            </div>

                            {/* Question */}
                            <div className="rounded-2xl bg-black/70 backdrop-blur-md border border-white/30 p-6 mb-6 shadow-[inset_0_0_50px_rgba(255,255,255,0.05)] relative z-10">
                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">The Question:</div>
                                <div className="text-xl sm:text-2xl font-bold text-white leading-relaxed text-center">
                                    "{activeReveal.question}"
                                </div>
                            </div>

                            {/* Custom Response (Optional) */}
                            <div className="mb-6 relative z-10">
                                <label className="block text-sm text-gray-300 mb-2">
                                    Your Response (Optional)
                                </label>
                                <textarea
                                    value={customResponse}
                                    onChange={(e) => setCustomResponse(e.target.value)}
                                    placeholder="Add a custom response or note about this question..."
                                    className="w-full h-24 px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                    This will be saved with the request for your records
                                </div>
                            </div>

                            {/* NEW: Pending Reveals Queue */}
                            <div className="rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-950/30 to-pink-950/30 backdrop-blur-md p-4 shadow-[0_0_40px_rgba(168,85,247,0.2)]">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-purple-200 text-sm flex items-center gap-2 font-bold">
                                        <Clock className="w-4 h-4" /> Pending Reveals
                                    </div>
                                    <div className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 font-bold">
                                        {revealQueue.length}
                                    </div>
                                </div>

                                {revealQueue.length === 0 ? (
                                    <div className="text-xs text-gray-500 text-center py-4">
                                        No pending reveals
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                                        {revealQueue.map((reveal, idx) => {
                                            const tierColor = reveal.tier === 'gold' ? 'text-yellow-400' :
                                                reveal.tier === 'silver' ? 'text-cyan-400' :
                                                    'text-amber-400';
                                            const typeColor = reveal.type === 'truth' ? 'text-cyan-300' : 'text-pink-300';

                                            return (
                                                <div
                                                    key={reveal.id}
                                                    className="rounded-lg border border-white/10 bg-gradient-to-r from-black/60 to-black/40 p-2.5"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-xs">
                                                                <span className="text-white font-bold">{reveal.fanName}</span>
                                                                {' '}
                                                                <span className={`${tierColor} font-bold uppercase`}>
                                                                    {reveal.tier}
                                                                </span>
                                                                {' '}
                                                                <span className={`${typeColor} font-bold capitalize`}>
                                                                    {reveal.type}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-1 truncate">
                                                                "{reveal.question}"
                                                            </div>
                                                        </div>
                                                        {idx === 0 && (
                                                            <div className="text-[10px] px-2 py-1 rounded-full bg-purple-500/30 text-purple-200 font-bold animate-pulse">
                                                                Next
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 relative z-10">
                                <button
                                    onClick={async () => {
                                        try {
                                            console.log('Declining question:', activeReveal);

                                            // Mark as declined in database
                                            if (activeReveal.requestId) {
                                                const { error } = await supabase
                                                    .from('truth_dare_requests')
                                                    .update({
                                                        status: 'declined',
                                                        declined_at: new Date().toISOString()
                                                    })
                                                    .eq('id', activeReveal.requestId);

                                                if (error) {
                                                    console.error('Error declining question:', error);
                                                } else {
                                                    console.log('Question declined successfully');
                                                }
                                            }

                                            // Remove from queue
                                            setRevealQueue(prev => prev.filter(r => r.id !== activeReveal.id));
                                            setActiveReveal(null);
                                            setCustomResponse("");
                                        } catch (error) {
                                            console.error('Failed to decline question:', error);
                                            setActiveReveal(null);
                                        }
                                    }}
                                    className="py-4 rounded-xl border-2 border-red-500/40 bg-red-950/20 hover:bg-red-950/40 text-red-200 font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group"
                                >
                                    <XCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                    Decline
                                </button>

                                <button
                                    onClick={async () => {
                                        try {
                                            console.log('Marking as answered:', activeReveal, 'Response:', customResponse);

                                            // Update database to mark as answered
                                            if (activeReveal.requestId) {
                                                const { error } = await supabase
                                                    .from('truth_dare_requests')
                                                    .update({
                                                        status: 'answered',
                                                        answered_at: new Date().toISOString(),
                                                        creator_response: customResponse || null,
                                                        revealed_at: new Date().toISOString()
                                                    })
                                                    .eq('id', activeReveal.requestId);

                                                if (error) {
                                                    console.error('Error marking as answered:', error);
                                                } else {
                                                    console.log('Question marked as answered successfully');
                                                }
                                            }

                                            // Broadcast to fans via realtime
                                            if (roomId) {
                                                const channel = supabase.channel(`room:${roomId}`);
                                                await channel.send({
                                                    type: 'broadcast',
                                                    event: 'question_revealed',
                                                    payload: {
                                                        requestId: activeReveal.requestId || activeReveal.id,
                                                        fanId: activeReveal.fanId,
                                                        type: activeReveal.type,
                                                        tier: activeReveal.tier,
                                                        question: activeReveal.question,
                                                        fanName: activeReveal.fanName,
                                                        creatorResponse: customResponse || null,
                                                        timestamp: new Date().toISOString()
                                                    }
                                                });
                                                console.log('Question broadcasted to fans with response');
                                            }

                                            // Remove from queue and close modal
                                            setRevealQueue(prev => prev.filter(r => r.id !== activeReveal.id));
                                            setActiveReveal(null);
                                            setCustomResponse("");
                                        } catch (error) {
                                            console.error('Failed to mark as answered:', error);
                                            setActiveReveal(null);
                                        }
                                    }}
                                    className="py-4 rounded-xl border-2 border-green-500/40 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/40 hover:to-emerald-600/40 text-green-200 font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group shadow-lg shadow-green-900/20"
                                >
                                    <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Mark as Answered
                                </button>
                            </div>

                            {/* Info */}
                            <div className="mt-4 text-center text-xs text-gray-500">
                                Click "Mark as Answered" after you've completed the truth/dare. The fan will be notified.
                            </div>
                        </div>
                    </div>
                )
            }

            {/* NEW: Cute Real-time Tip Alert Dialog */}
            {
                activeTip && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none p-4">
                        <div className="bg-black/80 backdrop-blur-xl border-2 border-green-500/50 rounded-[2rem] p-8 shadow-[0_0_100px_rgba(34,197,94,0.4)] animate-in zoom-in-50 fade-in duration-500 pointer-events-auto relative overflow-hidden max-w-sm w-full text-center">
                            {/* Confetti/Glow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-green-500/10 animate-pulse" />

                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(34,197,94,0.3)] animate-bounce">
                                    <TrendingUp className="w-10 h-10 text-green-400" />
                                </div>

                                <h2 className="text-3xl font-black text-white mb-1 uppercase tracking-wider drop-shadow-lg">
                                    New Tip!
                                </h2>
                                <p className="text-green-200 font-medium mb-6 text-lg">
                                    {activeTip.message || "Someone loves your vibes!"}
                                </p>

                                <div className="bg-green-900/40 border border-green-500/30 rounded-2xl p-4 w-full mb-4">
                                    <div className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-1">From</div>
                                    <div className="text-2xl font-bold text-white">{activeTip.fanName}</div>
                                </div>

                                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                                    ${activeTip.amount}
                                </div>
                            </div>

                            {/* Close Button (Optional if they want to dismiss it early) */}
                            <button
                                onClick={() => setActiveTip(null)}
                                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Private Session Join Requests */}
            {roomId && <RoomRequestManager roomId={roomId} />}

            {/* Creator Countdown Overlay */}
            <CreatorCountdown
                request={activeCountdown}
                roomId={roomId || ''}
                onComplete={(earnedAmount) => {
                    setActiveCountdown(null);
                    // Update session earnings immediately
                    if (earnedAmount > 0) {
                        setSessionEarnings(prev => ({
                            ...prev,
                            total: prev.total + earnedAmount
                        }));
                        // Show earnings notification after a brief delay
                        setTimeout(() => {
                            setEarningsNotification({
                                amount: earnedAmount,
                                fanName: activeCountdown?.fanName || 'Fan',
                                type: activeCountdown?.type || 'dare',
                                tier: activeCountdown?.tier
                            });
                        }, 500);
                    }
                }}
                onDismiss={() => setActiveCountdown(null)}
            />

            {/* Overlay */}
            <InteractionOverlay
                prompt={overlayPrompt}
                isVisible={showOverlay}
                onClose={() => setShowOverlay(false)}
            />

            {/* Earnings Notification Modal */}
            <EarningsModal
                notification={earningsNotification}
                onClose={() => setEarningsNotification(null)}
            />
        </div >
    );
}
