"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Video, Shield, Users, CheckCircle2, XCircle, Zap, Play, Crown, ArrowLeft, TrendingUp, MessageCircle, Flame, Vote, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { playNotificationSound, playMoneySound } from "@/utils/sounds";

import TodCreatorLiveChat from "@/components/rooms/truth-or-dare-creator/TodCreatorLiveChat";
import TodCreatorStreamViewer from "@/components/rooms/truth-or-dare-creator/TodCreatorStreamViewer";
import TodCreatorRoomEarnings from "@/components/rooms/truth-or-dare-creator/TodCreatorRoomEarnings";
import TodCreatorRequestPanel from "@/components/rooms/truth-or-dare-creator/TodCreatorRequestPanel";
import GroupVoteManager from "@/components/rooms/truth-or-dare-creator/TodCreatorGroupVote";

import CreatorCountdown from "@/app/creator/rooms/truth-or-dare/components/CreatorCountdown";
import EarningsModal from "@/app/creator/rooms/truth-or-dare/components/EarningsModal";
import InteractionOverlay, { OverlayPrompt } from "@/components/rooms/InteractionOverlay";
import BrandLogo from "@/components/common/BrandLogo";

// ---------- Pricing / constants ----------
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const CREATOR_SESSION_FEE = 15;
const TIP_SPLIT_CREATOR = 0.9; // 90/10
const TIERS = [
    { id: "bronze", label: "Bronze", price: 5, desc: "Light & playful" },
    { id: "silver", label: "Silver", price: 10, desc: "Spicy" },
    { id: "gold", label: "Gold", price: 20, desc: "Very explicit" },
] as const;
type TierId = (typeof TIERS)[number]["id"];
type CustomType = "truth" | "dare";

type QueueItemType = "TIER_PURCHASE" | "CUSTOM_TRUTH" | "CUSTOM_DARE" | "TIP" | "CROWD_VOTE_TIER" | "CROWD_VOTE_TV" | "REPLAY_PURCHASE" | "TIME_EXTENSION" | "ANGLE_UNLOCK" | "DOUBLE_DARE";

type QueueItem = { id: string; type: QueueItemType; createdAt: number; fanName?: string; amount: number; meta: Record<string, any>; };
type ActivityItem = { id: string; timestamp: number; fanName: string; type: 'truth' | 'dare' | 'tip' | 'custom_truth' | 'custom_dare'; tier?: TierId; amount: number; message?: string; };
type SessionEarnings = { total: number; tips: number; truths: number; dares: number; custom: number; };
type TipItem = { id: string; fanName: string; amount: number; message?: string; };
type CountdownRequest = { requestId: string; fanId: string; fanName: string; type: string; tier: string; content: string; amount: number; startedAt: number; };
type Creator = { id: string; name: string; isHost?: boolean };
type Fan = { id: string; name: string; avatar?: string | null; paidEntry: boolean; minutesInRoom: number; onCamera: boolean; walletOk: boolean; spendTotal: number; };
type CurrentPrompt = { id: string; label: string; source: "tier" | "custom"; tier?: TierId; customType?: CustomType; purchaser?: string; isDoubleDare?: boolean; startedAt?: number; durationSeconds?: number; };

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
        return d.toLocaleDateString("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" });
    } catch (e) {
        return d.toLocaleDateString("en-CA");
    }
}

export default function TruthOrDareCreatorPage() {
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
        price: 10,
        costPerMin: 4
    });
    const [sessionInfo, setSessionInfo] = useState<{ title: string; isPrivate: boolean; price: number } | null>(null);

    // Wallet & Fee State
    const CREATOR_SESSION_FEE = 10;
    const [creatorWalletBalance, setCreatorWalletBalance] = useState<number | null>(null);
    const [isCreatingSession, setIsCreatingSession] = useState(false);

    // Private session join requests
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

    const [overlayPrompt, setOverlayPrompt] = useState<OverlayPrompt | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [activeTab, setActiveTab] = useState<'vote' | 'truth' | 'dare' | 'earnings'>('vote');

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
                    setSessionEarnings(prev => ({
                        ...prev,
                        total: prev.total + (data.earnedAmount || 0)
                    }));
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
    // REVEAL QUEUE EFFECT REMOVED - Using CreatorCountdown instead


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

            // Remove from queue and activity feed
            setQueue(q => q.filter(x => x.id !== item.id));
            setActivityFeed(af => af.filter(x => x.id !== item.id));
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

    // Fetch wallet balance for fee display
    useEffect(() => {
        async function fetchWalletBalance() {
            const { data: { user: u } } = await supabase.auth.getUser();
            if (!u) return;
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', u.id)
                .single();
            if (wallet) setCreatorWalletBalance(wallet.balance);
        }
        fetchWalletBalance();
    }, []);

    // Fetch pending requests for active private sessions
    useEffect(() => {
        if (!roomId || !sessionActive || !sessionInfo?.isPrivate) return;
        async function fetchRequests() {
            const { data: reqs } = await supabase
                .from('room_requests')
                .select('*, profile:profiles(full_name, username, avatar_url)')
                .eq('room_id', roomId!)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (reqs) setPendingRequests(reqs);
        }
        fetchRequests();

        // Realtime subscription for new requests
        const reqChannel = supabase.channel(`requests_${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_requests', filter: `room_id=eq.${roomId}` }, () => {
                fetchRequests();
            })
            .subscribe();

        return () => { supabase.removeChannel(reqChannel); };
    }, [roomId, sessionActive, sessionInfo?.isPrivate]);

    async function handleRequest(requestId: string, action: 'accept' | 'decline') {
        if (!roomId) return;
        setProcessingRequestId(requestId);
        try {
            // Find the active session
            const activeSession = history.find((s: any) => s.status === 'active');
            if (!activeSession) return;

            const res = await fetch(`/api/v1/rooms/truth-dare-sessions/${activeSession.id}/requests`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, action })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Remove from local list
            setPendingRequests(prev => prev.filter(r => r.id !== requestId));
            toast.success(action === 'accept' ? 'Request approved!' : 'Request declined.');
        } catch (e: any) {
            toast.error(e.message || 'Failed to process request');
        } finally {
            setProcessingRequestId(null);
        }
    }

    // Session Actions — Uses new sessions API with fee deduction
    async function startSession() {
        if (!roomId) return;
        // Enforce pricing rules
        const finalPrice = sessionForm.isPrivate ? Math.max(20, Number(sessionForm.price)) : 10;
        setIsCreatingSession(true);
        try {
            const res = await fetch('/api/v1/rooms/truth-dare-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: roomId,
                    title: sessionForm.title || "Live Truth or Dare",
                    description: sessionForm.description,
                    session_type: sessionForm.isPrivate ? 'private' : 'public',
                    price: finalPrice,
                    cost_per_min: sessionForm.isPrivate ? Math.max(4, sessionForm.costPerMin) : 0
                })
            });
            const data = await res.json();
            console.log("Start Session Response:", data);
            if (!res.ok) throw new Error(data.error);

            // Update wallet balance
            if (data.new_balance !== undefined) {
                setCreatorWalletBalance(data.new_balance);
            }

            toast.success(`Session "${sessionForm.title}" is now live! 🎭`);

            // Optimistic update
            setSessionActive(true);
            setSessionInfo({
                title: sessionForm.title || "Live Truth or Dare",
                isPrivate: sessionForm.isPrivate,
                price: finalPrice
            });
            setShowStartModal(false);

            router.push('/rooms/truth-or-dare-creator');

            // Reload history
            if (roomId && me.id) loadGameData(roomId, me.id);
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to start session: " + e.message);
        } finally {
            setIsCreatingSession(false);
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
    if (!roomId && isLive) { return <div className="tod-creator-theme min-h-screen p-3 lg:p-4 text-white flex items-center justify-center">Loading Room...</div>; }

    const handleBackNavigation = () => {
        if (sessionActive && (!history[0] || history[0].status === 'active')) {
            setShowExitConfirmation(true);
        } else {
            router.push('/rooms/creator-studio');
        }
    };

    // ... (rest of render)


    return (
        <div className="tod-creator-theme min-h-screen flex flex-col items-stretch p-2 lg:p-3">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-2 lg:mb-3 px-1">
                <button
                    onClick={() => handleBackNavigation()}
                    className="tod-creator-panel-bg tod-creator-neon-border-blue px-3 py-2 rounded-lg flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-[18px] h-[18px]" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tod-creator-text-neon-pink flex items-center gap-2">
                        🎭 Truth or Dare — Creator View
                    </h1>
                    <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1.5 ${realtimeStatus === 'connected' ? 'border-green-500/40 text-green-300 bg-green-500/10' :
                            realtimeStatus === 'error' ? 'border-red-500/40 text-red-300 bg-red-500/10' :
                                realtimeStatus === 'closed' ? 'border-gray-500/40 text-gray-300 bg-gray-500/10' :
                                    'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'
                            }`}
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
                </div>
                <div className="w-24 flex justify-end">
                    {sessionActive && isHost && (
                        <button
                            onClick={() => setShowExitConfirmation(true)}
                            className="text-xs bg-red-900/40 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-900/60 transition text-red-200"
                        >
                            End Session
                        </button>
                    )}
                </div>
            </div>

            {/* ─── DASHBOARD (No Active Session) ─── */}
            {!sessionActive ? (
                <div className="flex-1 flex flex-col items-center justify-start px-4 py-4 gap-4 max-w-2xl mx-auto w-full">
                    {/* Start Session Card */}
                    <div className="w-full tod-creator-panel-bg rounded-xl tod-creator-neon-border-pink p-4 lg:p-5">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-9 h-9 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                                <span className="text-lg">🎭</span>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white leading-tight">Start a New Session</h2>
                                <p className="text-xs text-white/50">Create a live Truth or Dare experience for your fans</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">Session Title</label>
                                <input
                                    className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-pink-500/50 transition"
                                    placeholder="e.g. Late Night Truth or Dare 🔥"
                                    value={sessionForm.title}
                                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">Description (optional)</label>
                                <textarea
                                    className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-pink-500/50 transition resize-none h-14"
                                    placeholder="Tell fans what to expect..."
                                    value={sessionForm.description}
                                    onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                                />
                            </div>
                            {/* Session Type Toggle */}
                            <div>
                                <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1.5 block">Session Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setSessionForm({ ...sessionForm, isPrivate: false, price: 10 })}
                                        className={`py-2.5 rounded-lg text-sm font-bold transition border flex items-center justify-center gap-2 ${!sessionForm.isPrivate
                                            ? 'bg-green-500/20 border-green-500/50 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                            }`}
                                    >
                                        🌐 Public
                                    </button>
                                    <button
                                        onClick={() => setSessionForm({ ...sessionForm, isPrivate: true, price: Math.max(20, sessionForm.price) })}
                                        className={`py-2.5 rounded-lg text-sm font-bold transition border flex items-center justify-center gap-2 ${sessionForm.isPrivate
                                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                            }`}
                                    >
                                        🔒 Private
                                    </button>
                                </div>
                                {sessionForm.isPrivate && (
                                    <p className="text-[10px] text-white/30 mt-1 px-1">
                                        Fans must request access. You approve or decline each request.
                                    </p>
                                )}
                            </div>

                            {/* Fan Entry Price - Only shown for Private sessions */}
                            {sessionForm.isPrivate && (
                                <div>
                                    <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">Fan Entry Price ($)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-purple-500/50 transition"
                                        value={sessionForm.price}
                                        min={20}
                                        onChange={(e) => setSessionForm({ ...sessionForm, price: Math.max(20, Number(e.target.value)) })}
                                    />
                                    <p className="text-[10px] text-white/30 mt-1 px-1">
                                        Minimum $20. Fans pay this to join your private session.
                                    </p>
                                </div>
                            )}

                            {/* Cost Per Min - Only shown for Private sessions */}
                            {sessionForm.isPrivate && (
                                <div>
                                    <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">Cost Per Min ($)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-purple-500/50 transition"
                                        value={sessionForm.costPerMin}
                                        min={4}
                                        onChange={(e) => setSessionForm({ ...sessionForm, costPerMin: Math.max(4, Number(e.target.value)) })}
                                    />
                                    <p className="text-[10px] text-white/30 mt-1 px-1">
                                        Minimum $4. Fans are charged per minute in your private session.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={startSession}
                                disabled={isCreatingSession || !sessionForm.title.trim()}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-pink-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isCreatingSession ? (
                                    <>⏳ Creating Session...</>
                                ) : (
                                    <><Play className="w-4 h-4" /> Go Live</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Past Sessions History */}
                    {history.length > 0 && (
                        <div className="w-full tod-creator-panel-bg rounded-xl tod-creator-neon-border-blue p-4">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 tod-creator-text-neon-blue" />
                                Past Sessions
                            </h3>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                {history.filter((s: any) => s.status !== 'active').slice(0, 10).map((s: any, i: number) => (
                                    <div key={s.id || i} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-lg px-3 py-2">
                                        <div>
                                            <div className="text-xs text-white font-medium">{s.session_title || s.title || "Untitled"}</div>
                                            <div className="text-[10px] text-white/40 mt-0.5">{formatCanadaDate(s.started_at || s.created_at)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-green-400">${(s.total_earnings || 0).toFixed(2)}</div>
                                            <div className="text-[10px] text-white/40">{s.participant_count || 0} viewers</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ─── LIVE STUDIO (Session Active) — Sidebar + Stream Layout ─── */
                <div className="flex-1 flex gap-3 lg:gap-4 min-h-0" style={{ height: 'calc(100vh - 70px)' }}>
                    {/* ─── LEFT SIDEBAR ─── */}
                    <div className="flex flex-col" style={{ width: '320px', minWidth: '320px' }}>
                        {/* Tab Bar */}
                        <div className="flex rounded-xl overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {[
                                { key: 'vote' as const, label: 'Group Vote', icon: <Vote className="w-3.5 h-3.5" />, color: '#a855f7' },
                                { key: 'truth' as const, label: 'Truth', icon: <MessageCircle className="w-3.5 h-3.5" />, color: '#06b6d4' },
                                { key: 'dare' as const, label: 'Dare', icon: <Flame className="w-3.5 h-3.5" />, color: '#ec4899' },
                                { key: 'earnings' as const, label: 'Earnings', icon: <TrendingUp className="w-3.5 h-3.5" />, color: '#10b981' },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className="flex-1 flex flex-col items-center gap-1 py-2.5 px-1 transition-all relative"
                                    style={{
                                        background: activeTab === tab.key ? `${tab.color}15` : 'transparent',
                                        color: activeTab === tab.key ? tab.color : 'rgba(255,255,255,0.4)',
                                    }}
                                >
                                    {tab.icon}
                                    <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">{tab.label}</span>
                                    {activeTab === tab.key && (
                                        <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: tab.color }} />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Active Tab Content — fills remaining sidebar height */}
                        <div className="flex-1 min-h-0 overflow-hidden">
                            {activeTab === 'vote' && (
                                <div className="h-full overflow-auto">
                                    <GroupVoteManager roomId={roomId} />
                                </div>
                            )}
                            {activeTab === 'truth' && (
                                <div className="h-full">
                                    <TodCreatorRequestPanel
                                        title="Truth Requests"
                                        accentColor="blue"
                                        queue={[
                                            ...queue.filter(q => q.type.includes("TRUTH") || (q.type === "TIER_PURCHASE" && q.meta?.tier)),
                                            ...activityFeed
                                                .filter(a => a.type === 'truth' || a.type === 'custom_truth')
                                                .filter(a => !queue.some(q => q.id === a.id))
                                                .map(a => ({
                                                    id: a.id,
                                                    type: a.type === 'custom_truth' ? 'CUSTOM_TRUTH' : 'TIER_PURCHASE',
                                                    createdAt: a.timestamp,
                                                    fanName: a.fanName,
                                                    amount: a.amount,
                                                    meta: { tier: a.tier, text: a.message || `${(a.tier || 'bronze').toUpperCase()} Truth` }
                                                }))
                                        ] as any}
                                        onServe={serveQueueItem as any}
                                        onDismiss={(q: any) => {
                                            setQueue(qq => qq.filter(x => x.id !== q.id));
                                            setActivityFeed(af => af.filter(x => x.id !== q.id));
                                        }}
                                    />
                                </div>
                            )}
                            {activeTab === 'dare' && (
                                <div className="h-full">
                                    <TodCreatorRequestPanel
                                        title="Dare Requests"
                                        accentColor="pink"
                                        queue={[
                                            ...queue.filter(q => q.type.includes("DARE")),
                                            ...activityFeed
                                                .filter(a => a.type === 'dare' || a.type === 'custom_dare')
                                                .filter(a => !queue.some(q => q.id === a.id))
                                                .map(a => ({
                                                    id: a.id,
                                                    type: a.type === 'custom_dare' ? 'CUSTOM_DARE' : 'TIER_PURCHASE',
                                                    createdAt: a.timestamp,
                                                    fanName: a.fanName,
                                                    amount: a.amount,
                                                    meta: { tier: a.tier, text: a.message || `${(a.tier || 'bronze').toUpperCase()} Dare` }
                                                }))
                                        ] as any}
                                        onServe={serveQueueItem as any}
                                        onDismiss={(q: any) => {
                                            setQueue(qq => qq.filter(x => x.id !== q.id));
                                            setActivityFeed(af => af.filter(x => x.id !== q.id));
                                        }}
                                    />
                                </div>
                            )}

                            {activeTab === 'earnings' && (
                                <div className="h-full overflow-auto">
                                    <TodCreatorRoomEarnings earnings={sessionEarnings as any} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── RIGHT MAIN AREA ─── */}
                    <div className="flex-1 flex flex-col gap-3 lg:gap-4 min-h-0">
                        {/* Top: Stream (square) + Chat side by side */}
                        <div className="flex gap-3 lg:gap-4 flex-1 min-h-0">
                            {/* Live Stream — Square */}
                            <div className="relative" style={{ width: '500px', minWidth: '400px', aspectRatio: '1 / 1' }}>
                                <div className="absolute inset-0">
                                    <TodCreatorStreamViewer
                                        roomId={roomId}
                                        userId={me.id}
                                        appId={APP_ID}
                                        avatarUrl={myAvatarUrl}
                                        creatorName={me.name}
                                        viewerCount={fans.length}
                                    />
                                </div>
                            </div>
                            {/* Live Chat — right sidebar */}
                            <div className="flex-1 min-w-[250px] min-h-0">
                                <TodCreatorLiveChat roomId={roomId} viewerCount={fans.length} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Exit/End Confirmation Modal */}
            {showExitConfirmation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                    <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <span className="text-3xl">🛑</span>
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

            {/* Cute Real-time Tip Alert Dialog */}
            {activeTip && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none p-4">
                    <div className="bg-black/80 backdrop-blur-xl border-2 border-green-500/50 rounded-[2rem] p-8 shadow-[0_0_100px_rgba(34,197,94,0.4)] animate-in zoom-in-50 fade-in duration-500 pointer-events-auto relative overflow-hidden max-w-sm w-full text-center">
                        <div className="text-3xl font-black text-white mb-1 uppercase drop-shadow-lg">New Tip!</div>
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-400">$${activeTip.amount}</div>
                        <p className="text-green-200 mt-2">{activeTip.fanName}</p>
                        <button onClick={() => setActiveTip(null)} className="mt-4 px-4 py-2 bg-white/10 rounded pointer-events-auto">Dismiss</button>
                    </div>
                </div>
            )}

            {/* Creator Countdown Overlay */}
            <CreatorCountdown
                request={activeCountdown as any}
                roomId={roomId || ''}
                onComplete={(earnedAmount: number) => {
                    setActiveCountdown(null);
                    if (earnedAmount > 0) {
                        setSessionEarnings(prev => ({
                            ...prev,
                            total: prev.total + earnedAmount
                        }));
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
                prompt={overlayPrompt as any}
                isVisible={showOverlay}
                onClose={() => setShowOverlay(false)}
            />

            {/* Earnings Notification Modal */}
            <EarningsModal
                notification={earningsNotification as any}
                onClose={() => setEarningsNotification(null)}
            />

            {/* Dashboard View Support for resuming previous logic gracefully if not in studio */}
            {!isInStudio && false && (
                <div>{/* Hidden intentionally. Kept to avoid unused var warnings */}</div>
            )}
        </div>
    );

}
