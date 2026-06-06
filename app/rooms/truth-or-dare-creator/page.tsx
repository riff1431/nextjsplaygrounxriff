"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Video, Shield, Users, CheckCircle2, XCircle, Zap, Play, Crown, ArrowLeft, TrendingUp, MessageCircle, Flame, Vote, Sparkles, Plus, Clock, Square, AlertTriangle, BarChart3 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import CreatorExitModal from "@/components/rooms/shared/CreatorExitModal";
import { useAuth } from "@/app/context/AuthContext";
import { playNotificationSound, playMoneySound } from "@/utils/sounds";

import TodCreatorLiveChat from "@/components/rooms/truth-or-dare-creator/TodCreatorLiveChat";
import TodCreatorStreamViewer from "@/components/rooms/truth-or-dare-creator/TodCreatorStreamViewer";
import TodCreatorRoomEarnings from "@/components/rooms/truth-or-dare-creator/TodCreatorRoomEarnings";
import TodCreatorRequestPanel from "@/components/rooms/truth-or-dare-creator/TodCreatorRequestPanel";
import GroupVoteManager from "@/components/rooms/truth-or-dare-creator/TodCreatorGroupVote";
import GroupCallCreatorModal from "@/components/rooms/truth-or-dare-creator/GroupCallCreatorModal";
import { useGroupCall } from "@/hooks/useGroupCall";

import CreatorCountdown from "@/app/creator/rooms/truth-or-dare/components/CreatorCountdown";
import EarningsModal from "@/app/creator/rooms/truth-or-dare/components/EarningsModal";
import InteractionOverlay, { OverlayPrompt } from "@/components/rooms/InteractionOverlay";
import BrandLogo from "@/components/common/BrandLogo";
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";
import TodInviteCreatorModal from "@/components/rooms/truth-or-dare-creator/TodInviteCreatorModal";
import dynamic from "next/dynamic";
import { cs } from "@/utils/currency";
const CollabRemoteStream = dynamic(() => import("@/components/rooms/truth-or-dare-creator/CollabRemoteStream"), { ssr: false });
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";
import { Video as VideoIcon, MessageCircle as MessageCircleIcon, Inbox as InboxIcon } from "lucide-react";
import RoomTourHelpButton from "@/components/rooms/shared/RoomTourHelpButton";
import { useGuidedTour } from "@/components/guided-tour/GuidedTourProvider";

const TOD_STUDIO_TABS: MobileStudioTab[] = [
    { id: "chat", label: "Chat", icon: <MessageCircleIcon className="w-5 h-5" /> },
    { id: "requests", label: "Requests", icon: <InboxIcon className="w-5 h-5" /> },
    { id: "voting", label: "Voting", icon: <Vote className="w-5 h-5" /> },
    { id: "summary", label: "Summary", icon: <BarChart3 className="w-5 h-5" /> },
];

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
type ActivityItem = { id: string; timestamp: number; fanName: string; type: 'truth' | 'dare' | 'tip' | 'reaction' | 'custom_truth' | 'custom_dare'; tier?: TierId; amount: number; message?: string; };
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

// Map reaction tier names to their emoji characters
function getReactionEmoji(name?: string): string {
    if (!name) return '💋';
    const map: Record<string, string> = { 'Kiss': '💋', 'Love': '❤️', 'Spicy': '🔥', 'Dark': '🖤' };
    // Try exact match first, then case-insensitive
    return map[name] || map[Object.keys(map).find(k => k.toLowerCase() === name.toLowerCase()) || ''] || '💋';
}

function TruthOrDareCreatorContent() {
    const router = useRouter();
    const supabase = createClient();

    // State
    const [roomId, setRoomId] = useState<string | null>(null);
    const [me, setMe] = useState<Creator>({ id: "c1", name: "Creator", isHost: true });
    const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
    const isHost = !!me.isHost;
    const [isLive, setIsLive] = useState(true);
    const [hostCreatorId, setHostCreatorId] = useState<string | null>(null); // Host user ID (for collab creators to render host's remote stream)

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
    const [isSessionLive, setIsSessionLive] = useState(false); // false = pending (pre-live), true = live
    const [isGoingLive, setIsGoingLive] = useState(false);

    // End Session Confirmation Modal State
    const [pendingEndSession, setPendingEndSession] = useState<{ id: string; title: string } | null>(null);
    const [isEndingSession, setIsEndingSession] = useState(false);

    // Collab invite state
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [activeSessionStartedAt, setActiveSessionStartedAt] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [slotInvites, setSlotInvites] = useState<any[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [mobileStudioTab, setMobileStudioTab] = useState("chat");
    const [chatUnread, setChatUnread] = useState(0);
    const [requestsUnread, setRequestsUnread] = useState(0);
    const [summaryUnread, setSummaryUnread] = useState(false);

    const { activeTour, currentStep } = useGuidedTour();

    useEffect(() => {
        if (activeTour === "truth_or_dare_creator") {
            if (currentStep === 2) setMobileStudioTab("summary");
            else if (currentStep === 3) setMobileStudioTab("voting");
            else if (currentStep === 4) setMobileStudioTab("requests");
            else if (currentStep === 5) setMobileStudioTab("chat");
        }
    }, [activeTour, currentStep]);

    const activeTabRef = useRef(mobileStudioTab);
    useEffect(() => {
        activeTabRef.current = mobileStudioTab;
        if (mobileStudioTab === "chat") {
            setChatUnread(0);
        }
        if (mobileStudioTab === "requests") {
            setRequestsUnread(0);
        }
        if (mobileStudioTab === "summary") {
            setSummaryUnread(false);
        }
    }, [mobileStudioTab]);

    useEffect(() => {
        if (!roomId) return;

        const fetchInitialCounts = async () => {
            let q = supabase
                .from("truth_dare_queue")
                .select("id", { count: "exact", head: true })
                .eq("room_id", roomId)
                .eq("is_served", false);
            if (activeSessionId) q = q.eq("session_id", activeSessionId);
            const { count } = await q;
            if (count !== null) {
                setRequestsUnread(activeTabRef.current === "requests" ? 0 : count);
            }
        };
        fetchInitialCounts();

        const channel = supabase
            .channel(`unread-badges-tod-${roomId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
                (payload) => {
                    const newMsg = payload.new as any;
                    if (activeSessionId && newMsg.session_id !== activeSessionId) return;
                    if (activeTabRef.current !== "chat") {
                        setChatUnread((prev) => prev + 1);
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "truth_dare_requests", filter: `room_id=eq.${roomId}` },
                async () => {
                    if (activeTabRef.current !== "summary") {
                        setSummaryUnread(true);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, activeSessionId]);

    const mappedTabs = TOD_STUDIO_TABS.map(tab => {
        if (tab.id === "chat") return { ...tab, badge: chatUnread };
        if (tab.id === "requests") return { ...tab, badge: requestsUnread };
        if (tab.id === "summary") return { ...tab, badge: summaryUnread };
        return tab;
    });
    // Agora remote users from the host's CreatorStream — used to render collab streams in invite slots
    const [agoraRemoteUsers, setAgoraRemoteUsers] = useState<any[]>([]);
    const handleRemoteUsersChange = useCallback((users: any[]) => {
        setAgoraRemoteUsers(users);
    }, []);

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

    const [dbSettings, setDbSettings] = useState<any>(null);
    const [sessionForm, setSessionForm] = useState({
        title: "",
        description: "",
        isPrivate: false,
        price: 10,
        costPerMin: 4
    });
    const [sessionInfo, setSessionInfo] = useState<{ title: string; isPrivate: boolean; price: number } | null>(null);

    // Fetch dynamic room settings from DB
    useEffect(() => {
        async function fetchSettings() {
            try {
                const { data, error } = await supabase
                    .from("room_settings")
                    .select("*")
                    .eq("room_type", "truth-or-dare")
                    .single();
                if (data && !error) {
                    setDbSettings(data);
                    
                    const isPrivateDefault = data.public_sessions_enabled === false && data.private_sessions_enabled !== false;
                    
                    setSessionForm(prev => ({
                        ...prev,
                        isPrivate: isPrivateDefault,
                        price: isPrivateDefault ? (data.min_private_entry_fee ?? 20) : (data.public_entry_fee ?? 10),
                        costPerMin: data.min_private_cost_per_min ?? 4,
                    }));
                }
            } catch (err) {
                console.error("Fetch truth-or-dare room settings error:", err);
            }
        }
        fetchSettings();
    }, [supabase]);

    // Wallet & Fee State
    const CREATOR_SESSION_FEE = 10;
    const [creatorWalletBalance, setCreatorWalletBalance] = useState<number | null>(null);
    const [isCreatingSession, setIsCreatingSession] = useState(false);

    // Private session join requests
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

    const [overlayPrompt, setOverlayPrompt] = useState<OverlayPrompt | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);

    // Group Call State
    const groupCall = useGroupCall(roomId, me?.id || null, "creator");

    // 1. Initialize Room ID & Load Data
    const searchParams = useSearchParams();
    const collabSessionId = searchParams?.get("collabSessionId");
    const collabInviteId = searchParams?.get("inviteId");

    useEffect(() => {
        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setIsGameLoading(false);
                    return;
                }

                setMe({ id: user.id, name: user.user_metadata?.full_name || "Creator", isHost: !collabSessionId }); // Collab creators are not hosts

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

                // ── COLLAB MODE: If collabSessionId is present, load via API (bypasses RLS) ──
                if (collabSessionId) {
                    try {
                        console.log('[Collab] Joining session:', collabSessionId, 'inviteId:', collabInviteId);
                        const collabRes = await fetch(`/api/v1/rooms/truth-dare-sessions/${collabSessionId}/collab-join`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ inviteId: collabInviteId || undefined }),
                        });
                        const collabData = await collabRes.json();
                        console.log('[Collab] Response:', collabRes.status, collabData);

                        if (!collabRes.ok || !collabData.success) {
                            const errMsg = collabData.error || 'Session not found or has ended.';
                            console.error('[Collab] Join failed:', errMsg);
                            toast.error(errMsg);
                            setIsGameLoading(false);
                            return;
                        }

                        const collabSession = collabData.session;

                        // Track the host creator ID for rendering their remote stream
                        setHostCreatorId(collabSession.creator_id);

                        // Use the session's room
                        setRoomId(collabSession.room_id);
                        setActiveSessionId(collabSession.id);
                        setActiveSessionStartedAt(collabSession.started_at || collabSession.created_at || new Date().toISOString());
                        setSessionActive(true);
                        setIsInStudio(true);
                        setIsSessionLive(collabSession.status === 'active');
                        setIsBroadcasting(collabSession.status === 'active');
                        setSessionInfo({
                            title: collabSession.title || 'Truth or Dare Collab',
                            isPrivate: collabSession.is_private || false,
                            price: collabSession.price || 0,
                        });
                        loadGameData(collabSession.room_id, user.id, true); // skipDashboardReset for collab
                        toast.success(`Welcome to the collab session! 🎭 (${collabData.invite?.split_pct || 0}% split)`);
                    } catch (e) {
                        console.error('Collab join failed:', e);
                        toast.error('Failed to join collab session.');
                        setIsGameLoading(false);
                    }
                    return;
                }

                // ── NORMAL HOST MODE ──
                // Find first room hosted by user of this specific type
                const { data: room, error: roomError } = await supabase
                    .from('rooms')
                    .select('id')
                    .eq('host_id', user.id)
                    .eq('type', 'truth-or-dare')
                    .limit(1)
                    .maybeSingle();

                if (roomError) {
                    console.error("Error fetching room:", roomError);
                }

                let targetRoomId = room?.id;

                if (!targetRoomId) {
                    // Auto-create room for demo if missing
                    const { data: newRoom, error: createError } = await supabase
                        .from('rooms')
                        .insert([{ host_id: user.id, title: "Truth or Dare Room", status: "live", type: "truth-or-dare" }])
                        .select()
                        .single();
                    if (createError) {
                        console.error("Error creating room:", createError);
                    }
                    targetRoomId = newRoom?.id;
                }

                if (targetRoomId) {
                    setRoomId(targetRoomId);
                    loadGameData(targetRoomId, user.id);
                } else {
                    // Failed to find or create room — exit loading state
                    setIsGameLoading(false);
                }
            } catch (err) {
                console.error("Init failed:", err);
                setIsGameLoading(false);
            }
        }
        init();
    }, [collabSessionId, collabInviteId]);

    async function loadGameData(rid: string, currentUserId: string, skipDashboardReset: boolean = false) {
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

                let hasActiveSession = false;
                if (g.status === 'active' || g.status === 'pending') {
                    hasActiveSession = true;
                    setSessionInfo({
                        title: g.session_title || "Truth or Dare Session",
                        isPrivate: g.is_private || false,
                        price: g.unlock_price || 0
                    });

                    // Find active session ID via API (bypasses RLS)
                    try {
                        const sessRes = await fetch(`/api/v1/rooms/${rid}/truth-or-dare/session`);
                        const sessData = await sessRes.json();
                        const activeSession = sessData.history?.find((s: any) => s.status === 'active' || s.status === 'pending');
                        if (activeSession) {
                            setActiveSessionId(activeSession.id);
                            setActiveSessionStartedAt(activeSession.started_at || activeSession.created_at || new Date().toISOString());
                            
                            // Auto-resume active session on page refresh/load
                            setSessionActive(true);
                            setIsSessionLive(activeSession.status === 'active');
                            setIsBroadcasting(activeSession.status === 'active');
                            setIsInStudio(true);
                        } else {
                            setActiveSessionId(null);
                            setActiveSessionStartedAt(null);
                            hasActiveSession = false;
                        }
                    } catch (e) {
                        console.error('Failed to fetch active session:', e);
                        hasActiveSession = false;
                    }
                } else {
                    setActiveSessionId(null);
                    setActiveSessionStartedAt(null);
                }
                // For normal host mode, always show dashboard first on page load unless auto-resuming.
                // For collab mode (skipDashboardReset=true), keep the studio active.
                if (!skipDashboardReset && !hasActiveSession) {
                    setSessionActive(false);
                    setIsInStudio(false);
                    setShowStartModal(false);
                }
            }

            // Fetch Queue
            const qRes = await fetch(`/api/v1/rooms/${rid}/truth-or-dare/queue`);
            const qData = await qRes.json();
            if (qData.queue) {
                // Map DB queue to local type if needed, or assume match
                const mappedQueue = qData.queue.map((i: any) => ({
                    ...i,
                    createdAt: new Date(i.created_at).getTime(),
                    fanName: i.fan_name
                }));
                setQueue(mappedQueue);
                setRequestsUnread(activeTabRef.current === "requests" ? 0 : mappedQueue.length);
            }

            // Creators populated dynamically from API (room_participants)
            if (data.creators && data.creators.length > 0) {
                setCreators(data.creators);
            } else {
                // Fallback gracefully to current user if DB sync hasn't occurred yet
                setCreators([{ id: currentUserId, name: "Creator", isHost: true }]);
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
                if (activeSessionId && newItem.session_id && newItem.session_id !== activeSessionId) return;
                setQueue(prev => [{
                    id: newItem.id,
                    type: newItem.type,
                    createdAt: new Date(newItem.created_at).getTime(),
                    fanName: newItem.fan_name,
                    amount: newItem.amount,
                    meta: newItem.meta
                }, ...prev]);
                if (activeTabRef.current !== "requests") {
                    setRequestsUnread(prev => prev + 1);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_queue', filter: `room_id=eq.${roomId}` }, (payload) => {
                const updated = payload.new as any;
                if (updated.is_served) {
                    setQueue(prev => prev.filter(q => q.id !== updated.id));
                    if (activeTabRef.current !== "requests") {
                        setRequestsUnread(prev => Math.max(0, prev - 1));
                    }
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

                // ── SESSION GUARD: Only process requests from the current session ──
                // Skip requests that belong to a different session or if there's no active session
                if (!activeSessionId) {
                    console.log('⏩ Skipping request: no active session.');
                    return;
                }
                if (request.session_id && request.session_id !== activeSessionId) {
                    console.log('⏩ Skipping request from different session:', request.id, 'session:', request.session_id);
                    return;
                }

                // Determine type and tier
                const isSystemPrompt = request.type?.startsWith('system_');
                const isCustom = request.type?.startsWith('custom_');
                const isGroupVote = request.type?.startsWith('group_vote_');
                const isTip = request.type === 'tip';
                const isReaction = request.type === 'reaction';

                const interactionType = isTip
                    ? 'tip'
                    : isReaction
                        ? 'reaction'
                    : isGroupVote
                        ? request.type.split('_')[2] as 'truth' | 'dare'
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

                if (isTip || isReaction) {
                    // Show Tip/Reaction Overlay (Separate Dialog)
                    setActiveTip({
                        id: request.id,
                        fanName,
                        amount,
                        message: isReaction ? `Sent a ${request.tier} reaction!` : request.content
                    });

                    // Auto-hide tip overlay after 7 seconds
                    setTimeout(() => {
                        setActiveTip(null);
                    }, 7000);
                } else if (isGroupVote) {
                    toast.custom((t) => (
                        <div className="bg-gradient-to-r from-purple-900/90 to-blue-900/90 border border-blue-500/50 backdrop-blur-md rounded-xl p-4 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center gap-4 w-full max-w-md animate-in slide-in-from-top-full duration-500">
                            <div className="p-3 rounded-full bg-blue-500/20 border border-blue-500/30">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-white text-lg leading-none mb-1">
                                        Group Vote for {interactionType.toUpperCase()}!
                                    </h4>
                                    <span className="text-green-400 font-bold bg-green-900/30 px-2 py-0.5 rounded text-xs">
                                        +${amount}
                                    </span>
                                </div>
                                <p className="text-blue-200 text-sm opacity-90">
                                    from <span className="font-bold text-white">{fanName}</span>
                                </p>
                            </div>
                        </div>
                    ), { duration: 6000, position: 'top-center' });
                } else {
                    // Standard Toast for truth/dare requests
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
                    type: isReaction ? 'reaction' : isTip ? 'tip' : isGroupVote ? `group_vote_${interactionType}` as any : isCustom ? `custom_${interactionType}` as any : interactionType as any,
                    tier: isSystemPrompt ? tier : (isReaction ? (request.tier as TierId) : undefined),
                    amount,
                    message: isReaction ? `${request.tier} reaction` : isGroupVote ? `Voted for Group ${interactionType === 'truth' ? 'Truth' : 'Dare'}` : isCustom ? request.content : undefined
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

                    if (isTip || isReaction) {
                        newEarnings.tips += amount; // Reactions also count as tips for earnings
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

                    console.log(`💰 Fan spending updated: ${fanName} spent ${cs()}${amount} (Total: ${cs()}${newTotal})`);

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
                    toast.success('Real-time connected!', { duration: 2000 });
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Channel error - real-time subscription failed');
                    setRealtimeStatus('error');
                    toast.error('Real-time connection failed', { duration: 5000 });
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
                if (!activeSessionId) {
                    console.log('⏩ Skipping countdown_start broadcast: no active session.');
                    return;
                }
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
                if (!activeSessionId) {
                    console.log('⏩ Skipping question_answered broadcast: no active session.');
                    return;
                }
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
    }, [roomId, activeSessionId]);

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
            console.log(`👑 Top Spender (Dare King): ${topSpender} with ${cs()}${topSpenderData?.total.toFixed(2)}`);
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

            // 2. Mark item as served in DB (this now also processes deferred payment)
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/serve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queueItemId: item.id })
            });

            const data = await res.json();

            if (!res.ok) {
                // Payment or processing failed — show error, keep item in queue
                toast.error(data.error || "Failed to complete this request");
                return;
            }

            // 3. Update local state (only after successful API call)
            const promptId = data.game?.current_prompt?.id || item.id;
            const updatedPrompt = data.game?.current_prompt || {
                id: item.id,
                label: pText,
                source: item.type.includes('CUSTOM') ? 'custom' : 'tier',
                tier: item.meta.tier,
                customType: item.type.includes('TRUTH') ? 'truth' : 'dare',
                purchaser: item.fanName,
                isDoubleDare: doubleDareArmed,
                startedAt: Date.now()
            };
            setCurrentPrompt(updatedPrompt);

            // 4. Broadcast Realtime Event
            if (roomId) {
                await supabase.channel(`room:${roomId}`)
                    .send({
                        type: 'broadcast',
                        event: 'game_update',
                        payload: {
                            type: 'reveal',
                            prompt: {
                                id: promptId,
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
                id: promptId,
                type: item.type.includes('TRUTH') ? 'truth' : 'dare',
                text: pText,
                fanName: item.fanName || 'Anonymous',
                tier: item.meta.tier
            });
            setShowOverlay(true);
            setTimeout(() => setShowOverlay(false), 6000); // Hide after 6s

            // Remove from queue and activity feed
            setQueue(q => q.filter(x => x.id !== item.id && x.meta?.request_id !== item.id && x.id !== item.meta?.request_id));
            setActivityFeed(af => af.filter(x => x.id !== item.id && x.id !== item.meta?.request_id));
            if (doubleDareArmed) setDoubleDareArmed(false);

        } catch (err) {
            console.error("Error serving item:", err);
            toast.error("Failed to complete request. Please try again.");
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
            // First find the active session for this room
            const { data: activeSession } = await supabase
                .from('truth_dare_sessions')
                .select('id')
                .eq('room_id', roomId!)
                .eq('status', 'active')
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!activeSession) return;

            const { data: reqs } = await supabase
                .from('room_join_requests')
                .select('*, profile:profiles(full_name, username, avatar_url)')
                .eq('session_id', activeSession.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (reqs) setPendingRequests(reqs);
        }
        fetchRequests();

        // Realtime subscription for new requests
        const reqChannel = supabase.channel(`requests_${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_join_requests' }, () => {
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
        const minPrivateFee = dbSettings ? Number(dbSettings.min_private_entry_fee) : 20;
        const publicFee = dbSettings ? Number(dbSettings.public_entry_fee) : 10;
        const finalPrice = sessionForm.isPrivate ? Math.max(minPrivateFee, Number(sessionForm.price)) : publicFee;
        setIsCreatingSession(true);

        // ── OPTIMISTIC UPDATE: Enter studio immediately so creator feels instant response ──
        const optimisticTitle = sessionForm.title || "Live Truth or Dare";
        const optimisticTimestamp = new Date().toISOString();

        // Reset all session-scoped data for clean slate
        setQueue([]);
        setActivityFeed([]);
        setSessionEarnings({ total: 0, tips: 0, truths: 0, dares: 0, custom: 0 });
        setFanSpending({});
        setCurrentPrompt(null);
        setPromptElapsed(0);
        setActiveCountdown(null);
        setActiveTip(null);
        setEarningsNotification(null);
        setPendingRequests([]);
        setVotesTier({ bronze: 0, silver: 0, gold: 0 });
        setVotesTV({ truth: 0, dare: 0 });
        setDoubleDareArmed(false);
        setReplayUntil(null);
        setSlotInvites([]);

        // Show studio immediately (optimistic)
        setSessionActive(true);
        setIsInStudio(true);
        setIsSessionLive(false);
        setIsBroadcasting(false);
        setSessionInfo({
            title: optimisticTitle,
            isPrivate: sessionForm.isPrivate,
            price: finalPrice
        });
        setActiveSessionStartedAt(optimisticTimestamp);
        setShowStartModal(false);

        try {
            const minCostPerMin = dbSettings ? Number(dbSettings.min_private_cost_per_min) : 4;
            const res = await fetch('/api/v1/rooms/truth-dare-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: roomId,
                    title: optimisticTitle,
                    description: sessionForm.description,
                    session_type: sessionForm.isPrivate ? 'private' : 'public',
                    price: finalPrice,
                    cost_per_min: sessionForm.isPrivate ? Math.max(minCostPerMin, sessionForm.costPerMin) : 0
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Confirm session ID once API responds (non-blocking for UI)
            if (data.new_balance !== undefined) setCreatorWalletBalance(data.new_balance);
            if (data.session?.id) setActiveSessionId(data.session.id);
            const serverTimestamp = data.session?.started_at || data.session?.created_at || optimisticTimestamp;
            setActiveSessionStartedAt(serverTimestamp);

            toast.success(`Session "${optimisticTitle}" created! Click Go Live to start. 🎭`);
        } catch (e: any) {
            console.error(e);
            // Rollback optimistic state
            setSessionActive(false);
            setIsInStudio(false);
            setSessionInfo(null);
            setActiveSessionStartedAt(null);
            toast.error("Failed to start session: " + e.message);
        } finally {
            setIsCreatingSession(false);
        }
    }

    // Go Live — transitions pending session to active
    async function goLive() {
        if (!roomId || isGoingLive) return;
        setIsGoingLive(true);

        // ── OPTIMISTIC UPDATE: Flip to live instantly so creator sees immediate response ──
        setIsSessionLive(true);
        setIsBroadcasting(true);

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'GO_LIVE' })
            });
            if (res.ok) {
                toast.success('You are now LIVE! 🔴');
            } else {
                const data = await res.json();
                // Rollback on failure
                setIsSessionLive(false);
                setIsBroadcasting(false);
                toast.error(data.error || 'Failed to go live');
            }
        } catch (e) {
            console.error('Failed to go live:', e);
            // Rollback on failure
            setIsSessionLive(false);
            setIsBroadcasting(false);
            toast.error('Failed to go live');
        } finally {
            setIsGoingLive(false);
        }
    }

    async function endSession() {
        if (!roomId) return;

        // ── OPTIMISTIC UPDATE: Exit studio immediately ──
        setSessionActive(false);
        setIsInStudio(false);
        setIsSessionLive(false);
        setIsBroadcasting(false);
        setSessionInfo(null);
        setShowStartModal(false);
        setShowExitConfirmation(false);
        const prevSessionId = activeSessionId;
        const prevSessionStartedAt = activeSessionStartedAt;
        setActiveSessionId(null);
        setActiveSessionStartedAt(null);
        setSlotInvites([]);
        setActiveCountdown(null);
        setActiveTip(null);
        setEarningsNotification(null);
        setOverlayPrompt(null);
        setShowOverlay(false);

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'END_SESSION' })
            });
            if (!res.ok) {
                console.error('End session API error — UI already updated optimistically');
            }
        } catch (e) {
            console.error('endSession fetch failed:', e);
            // Non-fatal — UI is already reset
        }
    }

    // Fetch invites for active session + realtime subscription + polling fallback
    useEffect(() => {
        if (!activeSessionId) { setSlotInvites([]); return; }
        async function fetchInvites() {
            try {
                const res = await fetch(`/api/v1/rooms/truth-dare-sessions/${activeSessionId}/invite-creator`);
                const data = await res.json();
                if (data.invites) {
                    console.log('[ToD] Invites loaded:', data.invites.length, data.invites.map((i: any) => ({ id: i.id, status: i.status, invited_creator_id: i.invited_creator_id })));
                    setSlotInvites(data.invites);
                } else if (data.error) {
                    console.error('[ToD] Invite fetch API error:', data.error);
                }
            } catch (e) { console.error('Failed to fetch invites:', e); }
        }
        fetchInvites();

        // Realtime subscription (may not fire if RLS blocks postgres_changes)
        const inviteChannel = supabase.channel(`invites_${activeSessionId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'creator_invite_splits', filter: `session_id=eq.${activeSessionId}` }, () => {
                fetchInvites();
            })
            .subscribe();

        // Polling fallback — refresh every 8 seconds to catch accepted invites
        const pollInterval = setInterval(fetchInvites, 8000);

        return () => {
            supabase.removeChannel(inviteChannel);
            clearInterval(pollInterval);
        };
    }, [activeSessionId]);

    // Navigation Intercept is handled by state above

    // Loading state if checking roomId - Moved to after hooks
    if (!roomId && isGameLoading) { return <div className="tod-creator-theme min-h-screen p-3 lg:p-4 text-white flex items-center justify-center">Loading Room...</div>; }

    const handleBackNavigation = () => {
        if (sessionActive && isInStudio) {
            // In live studio → show exit confirmation modal (minimize or end)
            setShowExitConfirmation(true);
        } else {
            // On dashboard → go back to Creator Studio
            router.push('/rooms/creator-studio');
        }
    };

    // ... (rest of render)


    return (
        <div className="tod-creator-theme h-[100dvh] lg:h-screen w-screen flex flex-col items-stretch p-2 lg:p-3 relative overflow-hidden">
            {/* Background Image */}
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
                style={{ backgroundImage: "url('/images/truth-or-dare-custom-bg.jpg')" }}
            />
            <div className="fixed inset-0 bg-black/60 pointer-events-none z-0" />
            {/* Content */}
            <div className="relative z-10 flex flex-col items-stretch flex-1 min-h-0">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-2 lg:mb-3 px-1 gap-2">
                <button
                    onClick={() => handleBackNavigation()}
                    className="tod-creator-panel-bg tod-creator-neon-border-blue px-2.5 py-2 rounded-lg flex items-center gap-1.5 text-white/80 hover:text-white transition-colors shrink-0"
                >
                    <ChevronLeft className="w-[18px] h-[18px]" />
                    <span className="text-sm font-medium hidden sm:inline">Back</span>
                </button>
                <div className="flex items-center gap-2 min-w-0">
                    <h1 className="text-sm sm:text-base lg:text-xl font-bold tod-creator-text-neon-pink flex items-center gap-1.5 truncate">
                        🎭 
                        <span className={isInStudio ? "hidden sm:inline" : "hidden xs:inline"}>Truth or Dare</span>
                        {!isInStudio && <span className="xs:hidden">ToD</span>}
                        <span className="hidden sm:inline">— Creator View</span>
                    </h1>
                    <span
                        className={`px-2 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border flex items-center gap-1 shrink-0 ${
                            isInStudio ? 'hidden sm:flex' : 'flex'
                        } ${realtimeStatus === 'connected' ? 'border-green-500/40 text-green-300 bg-green-500/10' :
                            realtimeStatus === 'error' ? 'border-red-500/40 text-red-300 bg-red-500/10' :
                                realtimeStatus === 'closed' ? 'border-gray-500/40 text-gray-300 bg-gray-500/10' :
                                    'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'
                            }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${realtimeStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                            realtimeStatus === 'error' ? 'bg-red-400' :
                                realtimeStatus === 'closed' ? 'bg-gray-400' :
                                    'bg-yellow-400 animate-pulse'
                            }`} />
                        {realtimeStatus === 'connected' ? 'LIVE' :
                            realtimeStatus === 'error' ? 'ERR' :
                                realtimeStatus === 'closed' ? 'OFF' :
                                    '...'}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {sessionActive && isInStudio && (
                        <RoomTourHelpButton tourType="truth_or_dare_creator" accentHsl="330, 80%, 55%" />
                    )}
                    {sessionActive && isInStudio && isSessionLive && (
                        <div data-tour="tod-go-live-button">
                        <SessionLiveControls
                            sessionId={activeSessionId || ""}
                            accentHsl="330, 80%, 55%"
                            timerDataTour="tod-room-timer"
                            initialLiveStartedAt={sessionActive ? new Date().toISOString() : null}
                            customGoLive={async () => {
                                if (!sessionActive) {
                                    setShowStartModal(true);
                                    return null;
                                }
                                // Optimistic: flip UI immediately
                                const liveTimestamp = new Date().toISOString();
                                setIsSessionLive(true);
                                startCountdown();
                                // Fire API in background — don't await before returning
                                fetch(`/api/v1/rooms/${roomId}/truth-or-dare/session`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'GO_LIVE' })
                                }).then(res => {
                                    if (!res.ok) {
                                        res.json().then(data => toast.error(data.error || 'Failed to go live'));
                                        setIsSessionLive(false);
                                        setIsBroadcasting(false);
                                    } else {
                                        toast.success('You are now LIVE! 🔴');
                                    }
                                }).catch(e => {
                                    console.error('Failed to go live:', e);
                                    setIsSessionLive(false);
                                    setIsBroadcasting(false);
                                });
                                return liveTimestamp;
                            }}
                            customEnd={isHost ? async () => {
                                setShowExitConfirmation(true);
                            } : undefined}
                            onEnd={() => {}}
                            hideEnd={!isHost}
                        />
                        </div>
                    )}
                </div>
            </div>

            {/* ─── DASHBOARD (No Active Session) ─── */}
            {!sessionActive ? (
                <div className="flex-1 flex flex-col items-center justify-start px-2 sm:px-4 py-2 sm:py-4 gap-3 sm:gap-4 max-w-2xl mx-auto w-full overflow-y-auto relative z-20">
                    {/* Start Session Card */}
                    <div className="w-full tod-creator-panel-bg rounded-xl tod-creator-neon-border-pink p-4 lg:p-5 relative z-20">
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
                                    className="w-full bg-white/5 rounded-lg px-3 py-3 sm:py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-pink-500/50 transition relative z-20"
                                    placeholder="e.g. Late Night Truth or Dare 🔥"
                                    value={sessionForm.title}
                                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">Description (optional)</label>
                                <textarea
                                    className="w-full bg-white/5 rounded-lg px-3 py-3 sm:py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-pink-500/50 transition resize-none h-14 relative z-20"
                                    placeholder="Tell fans what to expect..."
                                    value={sessionForm.description}
                                    onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                                />
                            </div>
                            {/* Session Type Toggle */}
                            <div>
                                <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1.5 block">Session Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(dbSettings === null || dbSettings.public_sessions_enabled !== false) && (
                                        <button
                                            onClick={() => setSessionForm({ ...sessionForm, isPrivate: false, price: dbSettings ? Number(dbSettings.public_entry_fee) : 10 })}
                                            className={`py-2.5 rounded-lg text-sm font-bold transition border flex items-center justify-center gap-2 ${!sessionForm.isPrivate
                                                ? 'bg-green-500/20 border-green-500/50 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            🌐 Public
                                        </button>
                                    )}
                                    {(dbSettings === null || dbSettings.private_sessions_enabled !== false) && (
                                        <button
                                            onClick={() => {
                                                const minPrivateFee = dbSettings ? Number(dbSettings.min_private_entry_fee) : 20;
                                                setSessionForm({ ...sessionForm, isPrivate: true, price: Math.max(minPrivateFee, sessionForm.price) });
                                            }}
                                            className={`py-2.5 rounded-lg text-sm font-bold transition border flex items-center justify-center gap-2 ${sessionForm.isPrivate
                                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            🔒 Private
                                        </button>
                                    )}
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
                                    <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">Fan Entry Price ({cs()})</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-purple-500/50 transition"
                                        value={sessionForm.price}
                                        min={dbSettings ? Number(dbSettings.min_private_entry_fee) : 20}
                                        onChange={(e) => {
                                            const minFee = dbSettings ? Number(dbSettings.min_private_entry_fee) : 20;
                                            setSessionForm({ ...sessionForm, price: Math.max(minFee, Number(e.target.value)) });
                                        }}
                                    />
                                    <p className="text-[10px] text-white/30 mt-1 px-1">
                                        Minimum {cs()}{dbSettings ? Number(dbSettings.min_private_entry_fee) : 20}. Fans pay this to join your private session.
                                    </p>
                                </div>
                            )}

                            {/* Cost Per Min - Only shown for Private sessions */}
                            {sessionForm.isPrivate && (
                                <div>
                                    <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">Cost Per Min ({cs()})</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-purple-500/50 transition"
                                        value={sessionForm.costPerMin}
                                        min={dbSettings ? Number(dbSettings.min_private_cost_per_min) : 4}
                                        onChange={(e) => {
                                            const minCost = dbSettings ? Number(dbSettings.min_private_cost_per_min) : 4;
                                            setSessionForm({ ...sessionForm, costPerMin: Math.max(minCost, Number(e.target.value)) });
                                        }}
                                    />
                                    <p className="text-[10px] text-white/30 mt-1 px-1">
                                        Minimum {cs()}{dbSettings ? Number(dbSettings.min_private_cost_per_min) : 4}. Fans are charged per minute in your private session.
                                    </p>
                                </div>
                            )}

                            {/* Block new session if one is already active */}
                            {history.some((s: any) => s.status === 'active' || s.status === 'pending') && (
                                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <span className="text-amber-300 text-[11px]">⚠️ You have an active session running. End it below before starting a new one.</span>
                                </div>
                            )}
                            <button
                                onClick={startSession}
                                disabled={isCreatingSession || !sessionForm.title.trim() || history.some((s: any) => s.status === 'active' || s.status === 'pending')}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-pink-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isCreatingSession ? (
                                    <>⏳ Creating Session...</>
                                ) : (
                                    <><Play className="w-4 h-4" /> Create Session</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ─── Session History ─── */}
                    {history.length > 0 && (() => {
                        const activeSessions = history.filter((s: any) => s.status === 'active' || s.status === 'pending');
                        const pastSessions = history.filter((s: any) => s.status !== 'active' && s.status !== 'pending').slice(0, 10);

                        return (
                            <div className="w-full space-y-4">
                                {/* Active / Ongoing Sessions */}
                                {activeSessions.length > 0 && (
                                    <div className="w-full tod-creator-panel-bg rounded-xl p-4" style={{ border: '1px solid rgba(250,204,21,0.35)', boxShadow: '0 0 20px rgba(250,204,21,0.08)' }}>
                                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
                                            </span>
                                            <span className="text-yellow-300">Ongoing Sessions</span>
                                            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300">
                                                {activeSessions.length} Active
                                            </span>
                                        </h3>
                                        <div className="space-y-2">
                                            {activeSessions.map((s: any, i: number) => (
                                                <div key={s.id || i} className="bg-black/40 border border-yellow-500/20 rounded-xl p-3 hover:border-yellow-500/40 transition-all">
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm text-white font-semibold truncate">{s.session_title || s.title || "Untitled Session"}</span>
                                                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                                                    s.status === 'active'
                                                                        ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                                                                        : 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                                                                }`}>
                                                                    {s.status === 'active' ? '● LIVE' : '○ PENDING'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[10px] text-white/40">
                                                                <span>{s.is_private ? '🔒 Private' : '🌐 Public'}</span>
                                                                <span>Started {formatCanadaDate(s.started_at || s.created_at)}</span>
                                                                {s.participant_count > 0 && <span>👥 {s.participant_count} viewers</span>}
                                                            </div>
                                                            {s.description && (
                                                                <p className="text-[11px] text-white/30 mt-1 line-clamp-1">{s.description}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-sm font-bold text-green-400">{cs()}{(s.total_earnings || 0).toFixed(2)}</div>
                                                            <div className="text-[10px] text-white/40">earned</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                                        <button
                                                            onClick={() => {
                                                                // Rejoin: set session active state and enter studio
                                                                // ── CLEAN SLATE: Reset all session-scoped data on rejoin ──
                                                                setQueue([]);
                                                                setActivityFeed([]);
                                                                setSessionEarnings({ total: 0, tips: 0, truths: 0, dares: 0, custom: 0 });
                                                                setFanSpending({});
                                                                setCurrentPrompt(null);
                                                                setPromptElapsed(0);
                                                                setActiveCountdown(null);
                                                                setActiveTip(null);
                                                                setEarningsNotification(null);
                                                                setPendingRequests([]);
                                                                setVotesTier({ bronze: 0, silver: 0, gold: 0 });
                                                                setVotesTV({ truth: 0, dare: 0 });
                                                                setDoubleDareArmed(false);
                                                                setReplayUntil(null);

                                                                setSessionActive(true);
                                                                setIsSessionLive(s.status === 'active'); // Show Go Live overlay if still pending
                                                                setIsBroadcasting(s.status === 'active');
                                                                setSessionInfo({
                                                                    title: s.session_title || s.title || "Truth or Dare Session",
                                                                    isPrivate: s.is_private || false,
                                                                    price: s.price || 0
                                                                });
                                                                setActiveSessionId(s.id);
                                                                setActiveSessionStartedAt(s.started_at || s.created_at || new Date().toISOString());
                                                                setIsInStudio(true);
                                                                setShowStartModal(false);

                                                                // Re-fetch session earnings from API for this specific session
                                                                if (roomId) {
                                                                    fetch(`/api/v1/rooms/${roomId}/truth-or-dare/session`)
                                                                        .then(r => r.json())
                                                                        .then(data => {
                                                                            if (data.currentEarnings) {
                                                                                setSessionEarnings(prev => ({ ...prev, ...data.currentEarnings }));
                                                                            }
                                                                        })
                                                                        .catch(e => console.error('Failed to fetch session earnings on rejoin:', e));
                                                                }
                                                            }}
                                                            className="flex-1 min-w-[120px] py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-green-900/20"
                                                        >
                                                            <Play className="w-3.5 h-3.5" /> Rejoin Session
                                                        </button>
                                                        <button
                                                            onClick={() => setPendingEndSession({ id: s.id, title: s.session_title || s.title || 'Untitled' })}
                                                            className="py-2.5 px-4 rounded-lg bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                                        >
                                                            <Square className="w-3 h-3" /> End
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Past Completed Sessions */}
                                {pastSessions.length > 0 && (
                                    <div className="w-full tod-creator-panel-bg rounded-xl tod-creator-neon-border-blue p-4">
                                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 tod-creator-text-neon-blue" />
                                            Past Sessions
                                            <span className="ml-auto text-[10px] text-white/30">{pastSessions.length} sessions</span>
                                        </h3>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                            {pastSessions.map((s: any, i: number) => (
                                                <div key={s.id || i} className="flex items-center justify-between gap-2 bg-black/30 border border-white/5 rounded-lg px-3 py-2 hover:border-white/10 transition">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs text-white font-medium truncate">{s.session_title || s.title || "Untitled"}</div>
                                                        <div className="text-[10px] text-white/40 mt-0.5 flex flex-wrap items-center gap-2">
                                                            <span>{formatCanadaDate(s.started_at || s.created_at)}</span>
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">{s.is_private ? '🔒 Private' : '🌐 Public'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-xs font-bold text-green-400">{cs()}{(s.total_earnings || 0).toFixed(2)}</div>
                                                        <div className="text-[10px] text-white/40">{s.participant_count || 0} viewers</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            ) : (
                /* ─── LIVE STUDIO — Wireframe Layout ─── */
                <div className="flex-1 flex flex-col gap-2 lg:gap-3 min-h-0 relative overflow-hidden">

                    {/* ═══ GO LIVE OVERLAY (Pre-Live State) ═══ */}
                    {!isSessionLive && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md rounded-xl overflow-y-auto pb-20 lg:pb-0">
                            <div className="flex flex-col items-center gap-6 max-w-md text-center px-6">
                                {/* Pulsing ring */}
                                <div className="relative">
                                    <div className="absolute inset-0 w-28 h-28 rounded-full border-2 border-pink-500/40 animate-ping" />
                                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-600/20 to-purple-600/20 border-2 border-pink-500/50 flex items-center justify-center" style={{ boxShadow: '0 0 60px hsla(330, 100%, 60%, 0.3)' }}>
                                        <span className="text-4xl">🎭</span>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2" style={{ textShadow: '0 0 20px hsla(330, 100%, 65%, 0.5)' }}>
                                        Ready to Go Live?
                                    </h2>
                                    <p className="text-sm text-white/50 leading-relaxed">
                                        Your session <span className="text-pink-300 font-semibold">"{sessionInfo?.title}"</span> has been created.
                                        When you go live, fans will be able to see and join your session.
                                    </p>
                                </div>

                                {/* Go Live Button */}
                                <button
                                    onClick={goLive}
                                    disabled={isGoingLive}
                                    className="group relative px-12 py-4 rounded-2xl text-white font-black text-lg uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-3"
                                    style={{
                                        background: 'linear-gradient(135deg, hsl(340, 90%, 50%), hsl(300, 80%, 50%))',
                                        boxShadow: '0 0 40px hsla(330, 100%, 60%, 0.4), 0 8px 30px rgba(0,0,0,0.5)',
                                    }}
                                >
                                    {isGoingLive ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            Going Live...
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                                            Go Live
                                        </>
                                    )}
                                    {/* Glow effect */}
                                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ boxShadow: '0 0 60px hsla(330, 100%, 60%, 0.6)' }} />
                                </button>

                                <p className="text-[11px] text-white/30 mt-1">
                                    💡 Tip: Check your camera and setup before going live
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Desktop View */}
                    <div className="hidden lg:grid grid-cols-[1fr_400px_400px] gap-3 h-full w-full min-h-0">
                        {/* LEFT SECTION: Video Grid + Bottom Row — always visible */}
                        <div className="flex flex-col gap-2 lg:gap-3 w-full h-full min-h-0">
                            {/* 2x2 Video Grid */}
                            <div className="w-full grid grid-cols-2 grid-rows-2 gap-1 rounded-xl overflow-hidden flex-1" style={{ border: '1px solid rgba(255,255,255,0.08)', minHeight: '240px' }} data-tour="tod-live-stream">
                                {/* Vid 1 — Main Stream (Host shows own cam, Collab shows host's remote stream) */}
                                <div className="relative overflow-hidden">
                                    <div className="absolute inset-0">
                                        {isHost ? (
                                            <TodCreatorStreamViewer
                                                roomId={roomId}
                                                userId={me.id}
                                                appId={APP_ID}
                                                avatarUrl={myAvatarUrl}
                                                creatorName={me.name}
                                                viewerCount={fans.length}
                                                onRemoteUsersChange={handleRemoteUsersChange}
                                                isPaused={!!groupCall.callState && groupCall.callState.status === 'active'}
                                                isGrid={true}
                                            />
                                        ) : (
                                            /* Collab creator: show host's remote stream in Slot 1 */
                                            <TodCreatorStreamViewer
                                                roomId={roomId}
                                                userId={me.id}
                                                appId={APP_ID}
                                                avatarUrl={null}
                                                creatorName="Host"
                                                viewerCount={fans.length}
                                                remoteHostId={hostCreatorId}
                                                isGrid={true}
                                            />
                                        )}
                                    </div>
                                </div>
                                {/* Vid Slots 2-4 — Clickable Invite Slots */}
                                {/* Vid Slot 2: For collab creator, show own camera stream */}
                                {!isHost && (
                                    <div className="relative overflow-hidden" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="absolute inset-0">
                                            <TodCreatorStreamViewer
                                                roomId={roomId}
                                                userId={me.id}
                                                appId={APP_ID}
                                                avatarUrl={myAvatarUrl}
                                                creatorName={me.name}
                                                viewerCount={0}
                                                isCollabSelf={true}
                                                isGrid={true}
                                            />
                                        </div>
                                    </div>
                                )}
                                {/* Vid Slots 2-4 (Host) or 3-4 (Collab) — Invite Slots */}
                                {(isHost ? [0, 1, 2] : [0, 1]).map((slotIdx) => {
                                    const invite = slotInvites[slotIdx];
                                    const isAcceptedWithStream = invite?.status === 'accepted' && invite?.invited_creator_id;
                                    const gridSlotIdx = isHost ? slotIdx : slotIdx + 1; // offset for collab (slot 2 is own cam)
                                    const borderStyle = gridSlotIdx === 0
                                        ? { borderLeft: '1px solid rgba(255,255,255,0.06)' }
                                        : gridSlotIdx === 1
                                        ? { borderTop: '1px solid rgba(255,255,255,0.06)' }
                                        : { borderTop: '1px solid rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.06)' };
                                    return (
                                        <div
                                            key={`slot-${slotIdx}`}
                                            className="relative flex items-center justify-center transition-all group"
                                            style={{
                                                background: isAcceptedWithStream ? 'rgba(0,0,0,0.6)' : invite?.status === 'accepted' ? 'rgba(34,197,94,0.08)' : invite?.status === 'pending' ? 'rgba(236,72,153,0.06)' : 'rgba(0,0,0,0.4)',
                                                ...borderStyle,
                                                cursor: invite && invite.status !== 'declined' ? 'default' : 'pointer',
                                            }}
                                            onClick={() => { if (!invite || invite.status === 'declined') setShowInviteModal(true); }}
                                            data-tour={slotIdx === 0 ? "tod-invite-creators" : undefined}
                                        >
                                            {isAcceptedWithStream && isHost ? (() => {
                                                /* Host view: Show accepted collab creator's REMOTE Agora stream.
                                                   Match the invite to a remote Agora user. Remote users who are
                                                   publishers (collab creators) appear in agoraRemoteUsers. We use
                                                   slotIdx to pick the correct one (first accepted invite → first remote user). */
                                                const collabRemoteUser = agoraRemoteUsers[slotIdx] || null;
                                                return (
                                                    <div className="absolute inset-0">
                                                        <CollabRemoteStream
                                                            user={collabRemoteUser}
                                                            avatarUrl={invite.invited?.avatar_url}
                                                            creatorName={invite.invited?.full_name || invite.invited?.username || 'Collab'}
                                                        />
                                                    </div>
                                                );
                                            })() : invite && invite.status !== 'declined' ? (
                                                /* Invited creator display (pending or accepted without stream) */
                                                <div className="text-center">
                                                    <div className={`w-12 h-12 rounded-full mx-auto mb-1.5 overflow-hidden border-2 ${
                                                        invite.status === 'accepted' ? 'border-green-500/50' : 'border-pink-500/30 animate-pulse'
                                                    }`}>
                                                        {invite.invited?.avatar_url ? (
                                                            <img src={invite.invited.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center text-white/70 text-sm font-bold">
                                                                {(invite.invited?.full_name || invite.invited?.username || '?')[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-white/60 font-medium block truncate max-w-[80px] mx-auto">
                                                        {invite.invited?.full_name || invite.invited?.username || 'Creator'}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase mt-0.5 px-1.5 py-0.5 rounded-full ${
                                                        invite.status === 'accepted'
                                                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                                            : 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/25'
                                                    }`}>
                                                        {invite.status === 'accepted' ? (
                                                            <><CheckCircle2 className="w-2.5 h-2.5" /> Joined</>
                                                        ) : (
                                                            <><Clock className="w-2.5 h-2.5" /> Pending</>
                                                        )}
                                                    </span>
                                                    <span className="text-[9px] text-pink-400/60 block mt-0.5">{invite.invited_split_pct}% split</span>
                                                </div>
                                            ) : (
                                                /* Empty invite slot */
                                                <div className="text-center">
                                                    <div
                                                        className="w-12 h-12 rounded-full mx-auto mb-1.5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                                                        style={{
                                                            background: 'rgba(236,72,153,0.08)',
                                                            border: '2px dashed rgba(236,72,153,0.25)',
                                                        }}
                                                    >
                                                        <Plus className="w-5 h-5 text-pink-400/50 group-hover:text-pink-400 transition" />
                                                    </div>
                                                    <span className="text-[10px] text-white/25 font-medium group-hover:text-pink-300/60 transition">Invite Creator</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Bottom Row: Summary (Earnings) | Group (Voting) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3" style={{ minHeight: '160px' }}>
                                {/* Summary / Earnings */}
                                <div className="min-h-0 overflow-auto" data-tour="tod-room-earnings">
                                    <TodCreatorRoomEarnings earnings={sessionEarnings as any} />
                                </div>
                                {/* Group Voting */}
                                <div className="min-h-0 overflow-auto" data-tour="tod-group-vote">
                                    <GroupVoteManager 
                                        roomId={roomId} 
                                        onStartCall={(type) => groupCall.initiateCall(type)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* COL: Incoming Requests (full height) */}
                        <div className="flex flex-col min-h-0" data-tour="tod-incoming-requests">
                            <TodCreatorRequestPanel
                                title="Incoming Requests"
                                accentColor="pink"
                                queue={[
                                    ...queue.filter(q => q.type.includes("DARE") || q.type.includes("TRUTH") || (q.type === "TIER_PURCHASE" && q.meta?.tier)),
                                    ...activityFeed
                                        .filter(a => a.type === 'dare' || a.type === 'custom_dare' || a.type === 'truth' || a.type === 'custom_truth')
                                        .filter(a => !queue.some(q => q.id === a.id || q.meta?.request_id === a.id))
                                        .map(a => ({
                                            id: a.id,
                                            type: a.type.includes('custom') ? a.type.toUpperCase() : 'TIER_PURCHASE',
                                            createdAt: a.timestamp,
                                            fanName: a.fanName,
                                            amount: a.amount,
                                            meta: { tier: a.tier, text: a.message || `${(a.tier || 'bronze').toUpperCase()} Request`, originalType: a.type }
                                        }))
                                ] as any}
                                onServe={serveQueueItem as any}
                                onDismiss={async (q: any) => {
                                    try {
                                        const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/dismiss`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ queueItemId: q.id })
                                        });
                                        if (!res.ok) {
                                            const data = await res.json();
                                            toast.error(data.error || "Failed to dismiss");
                                            return;
                                        }
                                        setQueue(qq => qq.filter(x => x.id !== q.id && x.meta?.request_id !== q.id && x.id !== q.meta?.request_id));
                                        setActivityFeed(af => af.filter(x => x.id !== q.id && x.id !== q.meta?.request_id));
                                    } catch (err) {
                                        console.error("Dismiss error:", err);
                                        toast.error("Failed to dismiss request");
                                    }
                                }}
                            />
                        </div>

                        {/* COL: Live Chat (full height) */}
                        <div className="flex flex-col min-h-0" data-tour="tod-live-chat">
                            <TodCreatorLiveChat 
                                roomId={roomId} 
                                sessionStartedAt={activeSessionStartedAt}
                                sessionId={activeSessionId}
                                viewerCount={fans.length} 
                                activityItems={activityFeed
                                    .filter(a => a.type === 'tip' || a.type === 'reaction')
                                    .map(a => ({
                                        id: a.id,
                                        fanName: a.fanName,
                                        amount: a.amount,
                                        type: a.type as 'tip' | 'reaction',
                                        emoji: a.type === 'reaction' ? getReactionEmoji(a.tier || a.message) : undefined,
                                        message: a.message,
                                        timestamp: a.timestamp
                                    }))
                                }
                            />
                        </div>
                    </div>

                    {/* Mobile View */}
                    <div className="lg:hidden flex flex-col gap-3 pt-2 pb-20 flex-1 min-h-0 overflow-hidden">
                        {/* Video stage fixed on top */}
                        <div className="w-full shrink-0">
                            <div
                                className="relative rounded-xl overflow-hidden aspect-video mx-auto max-w-[600px]"
                                style={{
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: '0 0 30px rgba(236, 72, 153, 0.25), 0 0 60px rgba(236, 72, 153, 0.1)',
                                }}
                            >
                                {/* 2x2 Video Grid */}
                                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 rounded-xl overflow-hidden">
                                    {/* Vid 1 — Main Stream */}
                                    <div className="relative overflow-hidden">
                                        <div className="absolute inset-0">
                                            {isHost ? (
                                                <TodCreatorStreamViewer
                                                    roomId={roomId}
                                                    userId={me.id}
                                                    appId={APP_ID}
                                                    avatarUrl={myAvatarUrl}
                                                    creatorName={me.name}
                                                    viewerCount={fans.length}
                                                    onRemoteUsersChange={handleRemoteUsersChange}
                                                    isPaused={!!groupCall.callState && groupCall.callState.status === 'active'}
                                                    isGrid={true}
                                                />
                                            ) : (
                                                <TodCreatorStreamViewer
                                                    roomId={roomId}
                                                    userId={me.id}
                                                    appId={APP_ID}
                                                    avatarUrl={null}
                                                    creatorName="Host"
                                                    viewerCount={fans.length}
                                                    remoteHostId={hostCreatorId}
                                                    isGrid={true}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    {/* Vid Slot 2: Collab self-view */}
                                    {!isHost && (
                                        <div className="relative overflow-hidden" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div className="absolute inset-0">
                                                <TodCreatorStreamViewer
                                                    roomId={roomId}
                                                    userId={me.id}
                                                    appId={APP_ID}
                                                    avatarUrl={myAvatarUrl}
                                                    creatorName={me.name}
                                                    viewerCount={0}
                                                    isCollabSelf={true}
                                                    isGrid={true}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {/* Vid Slots 2-4 (Host) or 3-4 (Collab) — Invite Slots */}
                                    {(isHost ? [0, 1, 2] : [0, 1]).map((slotIdx) => {
                                        const invite = slotInvites[slotIdx];
                                        const isAcceptedWithStream = invite?.status === 'accepted' && invite?.invited_creator_id;
                                        const gridSlotIdx = isHost ? slotIdx : slotIdx + 1;
                                        const borderStyle = gridSlotIdx === 0
                                            ? { borderLeft: '1px solid rgba(255,255,255,0.06)' }
                                            : gridSlotIdx === 1
                                            ? { borderTop: '1px solid rgba(255,255,255,0.06)' }
                                            : { borderTop: '1px solid rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.06)' };
                                        return (
                                            <div
                                                key={`slot-mobile-${slotIdx}`}
                                                className="relative flex items-center justify-center transition-all group"
                                                style={{
                                                    background: isAcceptedWithStream ? 'rgba(0,0,0,0.6)' : invite?.status === 'accepted' ? 'rgba(34,197,94,0.08)' : invite?.status === 'pending' ? 'rgba(236,72,153,0.06)' : 'rgba(0,0,0,0.4)',
                                                    ...borderStyle,
                                                    cursor: invite && invite.status !== 'declined' ? 'default' : 'pointer',
                                                }}
                                                onClick={() => { if (!invite || invite.status === 'declined') setShowInviteModal(true); }}
                                            >
                                                {isAcceptedWithStream && isHost ? (() => {
                                                    const collabRemoteUser = agoraRemoteUsers[slotIdx] || null;
                                                    return (
                                                        <div className="absolute inset-0">
                                                            <CollabRemoteStream
                                                                user={collabRemoteUser}
                                                                avatarUrl={invite.invited?.avatar_url}
                                                                creatorName={invite.invited?.full_name || invite.invited?.username || 'Collab'}
                                                            />
                                                        </div>
                                                    );
                                                })() : invite && invite.status !== 'declined' ? (
                                                    <div className="flex flex-col items-center justify-center text-center p-2 w-full">
                                                        <div className={`w-12 h-12 rounded-full mb-1.5 overflow-hidden border-2 ${
                                                            invite.status === 'accepted' ? 'border-green-500/50' : 'border-pink-500/30 animate-pulse'
                                                        }`}>
                                                            {invite.invited?.avatar_url ? (
                                                                <img src={invite.invited.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center text-white/70 text-sm font-bold">
                                                                    {(invite.invited?.full_name || invite.invited?.username || '?')[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-white/60 font-medium block truncate max-w-[80px] leading-tight">
                                                            {invite.invited?.full_name || invite.invited?.username || 'Creator'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-center p-2 w-full">
                                                        <div
                                                            className="w-12 h-12 rounded-full mb-1.5 flex items-center justify-center transition-all hover:scale-105"
                                                            style={{
                                                                background: 'rgba(236,72,153,0.08)',
                                                                border: '2px dashed rgba(236,72,153,0.25)',
                                                            }}
                                                        >
                                                            <Plus className="w-5 h-5 text-pink-400/50" />
                                                        </div>
                                                        <span className="text-[10px] text-white/25 font-medium leading-tight">Invite</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Tab Content below stream */}
                        {mobileStudioTab === "requests" && (
                            <div className="w-full flex-1 min-h-0" data-tour="tod-incoming-requests">
                                <TodCreatorRequestPanel
                                    title="Incoming Requests"
                                    accentColor="pink"
                                    queue={[
                                        ...queue.filter(q => q.type.includes("DARE") || q.type.includes("TRUTH") || (q.type === "TIER_PURCHASE" && q.meta?.tier)),
                                        ...activityFeed
                                            .filter(a => a.type === 'dare' || a.type === 'custom_dare' || a.type === 'truth' || a.type === 'custom_truth')
                                            .filter(a => !queue.some(q => q.id === a.id || q.meta?.request_id === a.id))
                                            .map(a => ({
                                                id: a.id,
                                                type: a.type.includes('custom') ? a.type.toUpperCase() : 'TIER_PURCHASE',
                                                createdAt: a.timestamp,
                                                fanName: a.fanName,
                                                amount: a.amount,
                                                meta: { tier: a.tier, text: a.message || `${(a.tier || 'bronze').toUpperCase()} Request`, originalType: a.type }
                                            }))
                                    ] as any}
                                    onServe={serveQueueItem as any}
                                    onDismiss={async (q: any) => {
                                        try {
                                            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/dismiss`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ queueItemId: q.id })
                                            });
                                            if (!res.ok) {
                                                const data = await res.json();
                                                toast.error(data.error || "Failed to dismiss");
                                                return;
                                            }
                                            setQueue(qq => qq.filter(x => x.id !== q.id && x.meta?.request_id !== q.id && x.id !== q.meta?.request_id));
                                            setActivityFeed(af => af.filter(x => x.id !== q.id && x.id !== q.meta?.request_id));
                                        } catch (err) {
                                            console.error("Dismiss error:", err);
                                            toast.error("Failed to dismiss request");
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {mobileStudioTab === "chat" && (
                            <div className="w-full flex-1 min-h-0" data-tour="tod-live-chat">
                                <TodCreatorLiveChat 
                                    roomId={roomId} 
                                    sessionStartedAt={activeSessionStartedAt}
                                    sessionId={activeSessionId}
                                    viewerCount={fans.length} 
                                    activityItems={activityFeed
                                        .filter(a => a.type === 'tip' || a.type === 'reaction')
                                        .map(a => ({
                                            id: a.id,
                                            fanName: a.fanName,
                                            amount: a.amount,
                                            type: a.type as 'tip' | 'reaction',
                                            emoji: a.type === 'reaction' ? getReactionEmoji(a.tier || a.message) : undefined,
                                            message: a.message,
                                            timestamp: a.timestamp
                                        }))
                                    }
                                />
                            </div>
                        )}

                        {mobileStudioTab === "voting" && (
                            <div className="w-full flex-1 min-h-0 overflow-y-auto pb-4 flex flex-col gap-3">
                                <div className="min-h-0 shrink-0" data-tour="tod-group-vote">
                                    <GroupVoteManager 
                                        roomId={roomId} 
                                        onStartCall={(type) => groupCall.initiateCall(type)}
                                    />
                                </div>
                            </div>
                        )}

                        {mobileStudioTab === "summary" && (
                            <div className="w-full flex-1 min-h-0 overflow-y-auto pb-4 flex flex-col gap-3">
                                <div className="min-h-0 shrink-0" data-tour="tod-room-earnings">
                                    <TodCreatorRoomEarnings earnings={sessionEarnings as any} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mobile Tab Bar for Studio — only show when session is live */}
                    {isSessionLive && (
                        <MobileStudioTabs
                            tabs={mappedTabs}
                            activeTab={mobileStudioTab}
                            onTabChange={setMobileStudioTab}
                            accentHsl="330, 80%, 55%"
                        />
                    )}
                </div>
            )}

            {/* Exit/End Confirmation Modal */}
            <CreatorExitModal
                isOpen={showExitConfirmation}
                onClose={() => setShowExitConfirmation(false)}
                onEndSession={async () => { await endSession(); }}
                onMinimizeSession={() => {
                    setShowExitConfirmation(false);
                    setSessionActive(false);
                    setIsInStudio(false);
                }}
                roomName="Truth or Dare"
                accentHsl="330, 80%, 55%"
            />

            {/* Cute Real-time Tip/Reaction Alert Dialog */}
            {sessionActive && isInStudio && activeTip && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none p-4">
                    <div className={`bg-black/80 backdrop-blur-xl border-2 ${activeTip.message?.includes('reaction') ? 'border-purple-500/50 shadow-[0_0_100px_rgba(168,85,247,0.4)]' : 'border-green-500/50 shadow-[0_0_100px_rgba(34,197,94,0.4)]'} rounded-[2rem] p-8 animate-in zoom-in-50 fade-in duration-500 pointer-events-auto relative overflow-hidden max-w-sm w-full text-center`}>
                        <div className="text-3xl font-black text-white mb-1 uppercase drop-shadow-lg">
                            {activeTip.message?.includes('reaction') ? 'New Reaction!' : 'New Tip!'}
                        </div>
                        <div className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${activeTip.message?.includes('reaction') ? 'from-purple-400 via-pink-300 to-purple-400' : 'from-green-400 via-emerald-300 to-green-400'}`}>{cs()}{activeTip.amount}</div>
                        <p className={`${activeTip.message?.includes('reaction') ? 'text-purple-200' : 'text-green-200'} mt-2`}>{activeTip.fanName}</p>
                        {activeTip.message && (
                            <p className="text-white/50 text-sm mt-1">{activeTip.message}</p>
                        )}
                        <button onClick={() => setActiveTip(null)} className="mt-4 px-4 py-2 bg-white/10 rounded pointer-events-auto">Dismiss</button>
                    </div>
                </div>
            )}

            {/* Creator Countdown Overlay */}
            {sessionActive && isInStudio && (
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
            )}

            {/* Overlay */}
            {sessionActive && isInStudio && (
                <InteractionOverlay
                    prompt={overlayPrompt as any}
                    isVisible={showOverlay}
                    onClose={() => setShowOverlay(false)}
                />
            )}

            {/* Earnings Notification Modal */}
            {sessionActive && isInStudio && (
                <EarningsModal
                    notification={earningsNotification as any}
                    onClose={() => setEarningsNotification(null)}
                />
            )}

            {/* Group Call Creator Modal */}
            {groupCall.callState && (
                <GroupCallCreatorModal
                    callState={groupCall.callState}
                    userId={me.id}
                    creatorName={`${me.name || "Creator"} (You)`}
                    onEndCall={groupCall.endCall}
                    onDismiss={groupCall.dismiss}
                />
            )}

            {/* Dashboard View Support for resuming previous logic gracefully if not in studio */}
            {!isInStudio && false && (
                <div>{/* Hidden intentionally. Kept to avoid unused var warnings */}</div>
            )}

            {/* Invite Creator Modal */}
            <TodInviteCreatorModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                sessionId={activeSessionId}
                roomId={roomId}
                onInviteSent={() => {
                    // Refetch invites
                    if (activeSessionId) {
                        fetch(`/api/v1/rooms/truth-dare-sessions/${activeSessionId}/invite-creator`)
                            .then(r => r.json())
                            .then(d => { if (d.invites) setSlotInvites(d.invites); });
                    }
                }}
            />
            {/* ─── End Session Confirmation Modal ─── */}
            {pendingEndSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => { if (!isEndingSession) setPendingEndSession(null); }}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    {/* Modal */}
                    <div
                        className="relative w-[90%] max-w-md rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(145deg, rgba(20,10,30,0.97), rgba(40,10,20,0.97))',
                            border: '1px solid rgba(255,60,60,0.3)',
                            boxShadow: '0 0 40px rgba(255,40,40,0.15), 0 0 80px rgba(255,0,80,0.08), inset 0 1px 0 rgba(255,255,255,0.05)'
                        }}
                    >
                        {/* Top glow line */}
                        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-red-500 to-transparent" />

                        <div className="p-6">
                            {/* Icon */}
                            <div className="flex justify-center mb-4">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-red-500/20 to-pink-600/20 border border-red-500/30 flex items-center justify-center">
                                        <AlertTriangle className="w-7 h-7 text-red-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-center text-lg font-bold text-white mb-1">End Session</h3>
                            <p className="text-center text-sm text-white/40 mb-5">This action cannot be undone</p>

                            {/* Session Info */}
                            <div className="mb-5 p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                    <span className="text-sm text-white font-semibold truncate">{pendingEndSession.title}</span>
                                </div>
                                <p className="text-[11px] text-white/30 mt-1.5 pl-4">All viewers will be disconnected and the session will be marked as ended.</p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPendingEndSession(null)}
                                    disabled={isEndingSession}
                                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        setIsEndingSession(true);
                                        try {
                                            const res = await fetch(`/api/v1/rooms/truth-dare-sessions/${pendingEndSession.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ status: 'ended' })
                                            });
                                            if (res.ok) {
                                                setHistory(prev => prev.map(h => h.id === pendingEndSession.id ? { ...h, status: 'ended', ended_at: new Date().toISOString() } : h));
                                                if (activeSessionId === pendingEndSession.id) {
                                                    setSessionActive(false);
                                                    setIsInStudio(false);
                                                    setSessionInfo(null);
                                                    setActiveSessionId(null);
                                                    setActiveSessionStartedAt(null);
                                                    setActiveCountdown(null);
                                                    setActiveTip(null);
                                                    setEarningsNotification(null);
                                                    setOverlayPrompt(null);
                                                    setShowOverlay(false);
                                                }
                                                toast.success(`Session "${pendingEndSession.title}" ended`);
                                            } else {
                                                const errData = await res.json();
                                                toast.error(errData.error || 'Failed to end session');
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            toast.error('Failed to end session');
                                        } finally {
                                            setIsEndingSession(false);
                                            setPendingEndSession(null);
                                        }
                                    }}
                                    disabled={isEndingSession}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-red-900/30"
                                >
                                    {isEndingSession ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Ending...</>
                                    ) : (
                                        <><Square className="w-3.5 h-3.5" /> End Session</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Bottom glow line */}
                        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
                    </div>
                </div>
            )}
        </div>{/* end content wrapper */}
        </div>
    );

}

export default function TruthOrDareCreatorPage() {
    return (
        <Suspense fallback={<div className="tod-creator-theme min-h-screen p-3 lg:p-4 text-white flex items-center justify-center">Loading...</div>}>
            <TruthOrDareCreatorContent />
        </Suspense>
    );
}
