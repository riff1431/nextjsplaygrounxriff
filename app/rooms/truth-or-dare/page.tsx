"use client";

import { toast } from "sonner";
import React, { useEffect, useMemo, useState, useRef, useCallback, Suspense } from "react";

import {
    Search,
    Crown,
    Video,
    Users,
    DollarSign,
    Star,
    Zap,
    Timer,
    Trophy, // Added Trophy
    Eye,
    Crown as CrownIcon,
    MessageCircle,
    CreditCard,
    ArrowLeft,
    Lock,
    Play,
    X,
    TrendingUp,
    Flame, // Added Flame icon
    Send, // Added Send icon for tips
    UserPlus, // Added for Invite button
    Wallet, // Added Wallet
    Bell,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Vote,
    Coins,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import BrandLogo from "@/components/common/BrandLogo";
import RoomRequestManager from "@/components/rooms/RoomRequestManager"; // New Component
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";
import InteractionOverlay, { OverlayPrompt } from "@/components/rooms/InteractionOverlay";
import { playNotificationSound, playSuccessSound, playErrorSound, playMoneySound } from "@/utils/sounds"; // Added playNotificationSound, playMoneySound
import GroupVotePanel from "@/components/rooms/GroupVotePanel"; // Added GroupVotePanel
import WalletPill from "@/components/common/WalletPill";
import InviteModal from "@/components/rooms/InviteModal";
import InvitationPopup from "@/components/rooms/InvitationPopup";
import GroupCallFanModal from "@/components/rooms/truth-or-dare/GroupCallFanModal";
import { useGroupCall } from "@/hooks/useGroupCall";
import EmojiPicker from "@/components/common/EmojiPicker";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";

// import AgoraProvider, { createAgoraClient } from "@/components/providers/AgoraProvider"; // Removed
// import FanStream from "@/components/rooms/FanStream"; // Removed

import dynamic from 'next/dynamic';
import { cs } from "@/utils/currency";
import BillingOverlay from "@/components/rooms/shared/BillingOverlay";
import RoomTourHelpButton from "@/components/rooms/shared/RoomTourHelpButton";
import { useGuidedTour } from "@/components/guided-tour/GuidedTourProvider";
const LiveStreamWrapper = dynamic<any>(() => import('@/components/rooms/LiveStreamWrapper'), { ssr: false });
const QuestionCountdown = dynamic<any>(() => import('./components/QuestionCountdown'), { ssr: false });
const FanAnswerModal = dynamic<any>(() => import('./components/FanAnswerModal'), { ssr: false });
const FanViewersList = dynamic<any>(() => import('./components/FanViewersList'), { ssr: false });
const BottleSpinner = dynamic<any>(() => import('./components/BottleSpinner').then(mod => mod.BottleSpinner), { ssr: false });
const ProfileCard = dynamic<any>(() => import('./components/ProfileCard').then(mod => mod.ProfileCard), { ssr: false });

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

/**
 * PlayGroundX — Truth or Dare Room (Fan View)
 * Entry: €10
 * 4 Creators, 10 Fans max on camera.
 */

const DEFAULT_TIERS = [
    { id: "bronze", label: "Bronze", price: 5, desc: "Light & playful" },
    { id: "silver", label: "Silver", price: 10, desc: "Spicy" },
    { id: "gold", label: "Gold", price: 20, desc: "Very explicit" },
] as const;


type TierId = "bronze" | "silver" | "gold";

type Votes = { truth: number; dare: number };

const CROWD_TIER_FEES: Record<TierId, number> = {
    bronze: 5,
    silver: 10,
    gold: 15,
};

const CROWD_TV_FEES = { truth: 5, dare: 10 } as const;
const ENTRY_FEE = 10;
const TIP_AMOUNTS = [5, 10, 25, 50] as const;

const TOD_FAN_TABS: MobileStudioTab[] = [
    { id: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
    { id: "play", label: "Play", icon: <Play className="w-5 h-5" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-5 h-5" /> },
    { id: "voting", label: "Voting", icon: <Vote className="w-5 h-5" /> },
    { id: "info", label: "Info", icon: <Users className="w-5 h-5" /> },
];

function TruthOrDareContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();
    const roomId = searchParams.get("roomId");
    const sessionId = searchParams.get("sessionId");

    // Dynamic Pricing State
    const [truthTiers, setTruthTiers] = useState<{ id: TierId; label: string; price: number; desc: string }[]>([...DEFAULT_TIERS]);
    const [dareTiers, setDareTiers] = useState<{ id: TierId; label: string; price: number; desc: string }[]>([...DEFAULT_TIERS]);

    // Fetch Pricing
    useEffect(() => {
        async function loadPricing() {
            const { data } = await supabase.from('admin_settings').select('value').eq('key', 'global_pricing').single();
            if (data?.value) {
                const config = data.value;

                setTruthTiers(prev => prev.map(t => ({
                    ...t,
                    price: Number(config[`system_truth_${t.id}`] ?? t.price)
                })));

                setDareTiers(prev => prev.map(t => ({
                    ...t,
                    price: Number(config[`system_dare_${t.id}`] ?? t.price)
                })));
            }
        }
        loadPricing();
    }, [supabase]);

    // ... existing onBack ...
    const onBack = () => {
        router.push("/home");
    };

    // Session State
    const [loading, setLoading] = useState(true);
    const [sessionStatus, setSessionStatus] = useState<'active' | 'ended' | 'pending' | 'loading'>('loading');
    const [access, setAccess] = useState<'granted' | 'locked'>('locked'); // Default locked for security
    const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
    const [sessionInfo, setSessionInfo] = useState<{ title: string; desc: string; price: number; isPrivate: boolean } | null>(null);
    const [hostId, setHostId] = useState<string | null>(null);
    const [hostAvatarUrl, setHostAvatarUrl] = useState<string | null>(null);
    const [hostName, setHostName] = useState<string>('Creator');
    const [userId, setUserId] = useState<string | null>(null);
    const [unlocking, setUnlocking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [mobileTab, setMobileTab] = useState("chat");
    const [chatUnread, setChatUnread] = useState(0);
    const [playUnread, setPlayUnread] = useState(0);

    const { activeTour, currentStep } = useGuidedTour();

    useEffect(() => {
        if (activeTour === "truth_or_dare_fan") {
            if (currentStep === 1) setMobileTab("play");
            else if (currentStep === 2) setMobileTab("info");
            else if (currentStep === 3) setMobileTab("play");
            else if (currentStep === 4) setMobileTab("voting");
            else if (currentStep === 5) setMobileTab("chat");
            else if (currentStep === 6) setMobileTab("play");
            else if (currentStep === 7) setMobileTab("play");
            else if (currentStep === 8) setMobileTab("play");
        }
    }, [activeTour, currentStep]);

    const activeTabRef = useRef(mobileTab);
    useEffect(() => {
        activeTabRef.current = mobileTab;
        if (mobileTab === "chat") setChatUnread(0);
        if (mobileTab === "play") setPlayUnread(0);
        if (mobileTab === "notifications") setUnseenCount(0);
    }, [mobileTab]);

    const [userName, setUserName] = useState<string>('Anonymous');
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [currentSessionStartedAt, setCurrentSessionStartedAt] = useState<string | null>(null);
    const [collabCreators, setCollabCreators] = useState<any[]>([]);
    const [accessRefreshTrigger, setAccessRefreshTrigger] = useState(0);

    // Group Call State
    const groupCall = useGroupCall(roomId, userId, "fan");

    // Dismiss stale group call invitations when session changes
    useEffect(() => {
        if (activeSessionId && groupCall.callState) {
            groupCall.dismiss();
        }
    }, [activeSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reactive toast: fires when hook transitions to 'invited' (avoids stale closure)
    // This replaces the old inline handler inside gameChannel that had a null userId bug.
    const prevCallStatus = useRef<string | null>(null);
    useEffect(() => {
        const status = groupCall.callState?.status ?? null;
        const prevStatus = prevCallStatus.current;
        prevCallStatus.current = status;

        // Only show toast on fresh invitation (not on re-renders)
        if (status === "invited" && prevStatus !== "invited") {
            const callType = groupCall.callState?.type || "truth";
            const toastId = toast.custom((t) => (
                <div className="bg-[#1a1a2e]/95 border border-cyan-500/30 backdrop-blur-xl rounded-2xl p-4 shadow-2xl flex items-center gap-4 w-full max-w-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center animate-pulse">
                        <Video className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-sm">Group Call Unlocked!</h4>
                        <p className="text-xs text-white/60 truncate">Join the {callType} video session now.</p>
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => {
                                    groupCall.acceptCall();
                                    toast.dismiss(t);
                                }}
                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded-lg transition-all"
                            >
                                Join Call
                            </button>
                            <button
                                onClick={() => {
                                    groupCall.declineCall();
                                    toast.dismiss(t);
                                }}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold rounded-lg transition-all"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            ), { duration: 15000 });

            // Add to Incoming Panel
            const callId = groupCall.callState?.callId || "";
            const virtualItem = {
                id: `group-call-${callId}`,
                type: "group_call",
                status: "calling",
                content: `Group ${callType.toUpperCase()} Call`,
                amount: 0,
                created_at: new Date().toISOString()
            };
            setIncomingItems(prev => [virtualItem, ...prev].slice(0, 20));
            setUnseenCount(prev => prev + 1);

            return () => { toast.dismiss(toastId as any); };
        }
    }, [groupCall.callState?.status]);

    // Chat State
    const [chatMessages, setChatMessages] = useState<{ id: string; room_id: string; user_id: string; username: string; message: string; created_at: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatSending, setChatSending] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    const scrollChatToBottom = useCallback(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, []);

    // Modal States
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: string;
        tier?: string | null;
        content?: string;
        price: number;
    } | null>(null);

    const [resultModal, setResultModal] = useState<{
        isOpen: boolean;
        success: boolean;
        message: string;
        type?: string;
        content?: string;
    } | null>(null);

    const [overlayPrompt, setOverlayPrompt] = useState<OverlayPrompt | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdownRequest, setCountdownRequest] = useState<any>(null);
    const [answerNotification, setAnswerNotification] = useState<{
        fanName: string;
        type: string;
        tier?: string;
        content?: string;
        creatorResponse?: string;
    } | null>(null);

    // Moved Hooks from bottom to fix "Rendered fewer hooks" error
    const [selectedTier, setSelectedTier] = useState<TierId | null>(null);
    const [customType, setCustomType] = useState<"truth" | "dare" | null>(null);
    const [customText, setCustomText] = useState("");
    const [lastAction, setLastAction] = useState<string | null>(null);

    const [votes, setVotes] = useState<Votes>({ truth: 0, dare: 0 });
    const [replayAvailable, setReplayAvailable] = useState(false);

    // Top spenders state
    const [topDareKing, setTopDareKing] = useState<{ name: string; avatar: string | null; total: number } | null>(null);
    const [topTruthKing, setTopTruthKing] = useState<{ name: string; avatar: string | null; total: number } | null>(null);

    const [fanCount, setFanCount] = useState(0);

    // Incoming activity state
    const [showIncomingPanel, setShowIncomingPanel] = useState(false);
    const [incomingItems, setIncomingItems] = useState<any[]>([]);
    const [unseenCount, setUnseenCount] = useState(0);

    // Load Session Data — uses server-side API to bypass RLS
    useEffect(() => {
        if (!roomId) return;

        async function checkAccess() {
            try {
                // 1. Call the server-side check-access API (bypasses RLS via admin client)
                const params = new URLSearchParams({ roomId });
                if (sessionId) params.set("sessionId", sessionId);

                const res = await fetch(`/api/v1/rooms/truth-dare-sessions/check-access?${params.toString()}`);
                const data = await res.json();

                if (!res.ok) {
                    console.error("Check access API error:", data.error);
                    setSessionStatus('ended');
                    setLoading(false);
                    return;
                }

                // 2. Apply session status
                const { sessionStatus: status, access: accessResult, sessionInfo: info, hostId: hId, hostProfile, requestStatus: reqStatus, sessionId: resolvedSessionId, sessionStartedAt: sessStartedAt, collabCreators: collabs } = data;

                // Store active session info for chat scoping
                if (resolvedSessionId) {
                    setActiveSessionId(resolvedSessionId);
                } else {
                    setActiveSessionId(null);
                }
                if (sessStartedAt) {
                    setCurrentSessionStartedAt(sessStartedAt);
                } else {
                    setCurrentSessionStartedAt(null);
                }
                if (collabs) setCollabCreators(collabs);

                setSessionStatus(status as any);
                if (status === 'ended') {
                    setActiveSessionId(null);
                    setCurrentSessionStartedAt(null);
                    setLoading(false);
                    return;
                }

                // 3. Set host info
                if (hId) setHostId(hId);
                if (info) {
                    setSessionInfo({
                        title: info.title || "Truth or Dare",
                        desc: info.desc,
                        price: Number(info.price || 0),
                        isPrivate: info.isPrivate || false,
                    });
                }
                if (hostProfile) {
                    setHostAvatarUrl(hostProfile.avatar_url);
                    setHostName(hostProfile.full_name || hostProfile.username || 'Creator');
                }

                // 4. Get current user info (for profile/presence — profiles table has public read)
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserId(user.id);

                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, username, avatar_url')
                        .eq('id', user.id)
                        .single();

                    if (profile) {
                        setUserName(profile.full_name || profile.username || user.email?.split('@')[0] || 'Anonymous');
                        setUserAvatar(profile.avatar_url);
                    }
                }

                // 5. Set access and request status from API response
                setAccess(accessResult as any);
                if (reqStatus) {
                    setRequestStatus(reqStatus as any);
                } else if (!info?.isPrivate) {
                    setRequestStatus('approved');
                }

                console.log(`Access check result: status=${status}, access=${accessResult}, requestStatus=${reqStatus}`);

            } catch (e) {
                console.error("checkAccess failed", e);
                setSessionStatus('ended');
            } finally {
                setLoading(false);
            }
        }
        checkAccess();
    }, [roomId, supabase, accessRefreshTrigger]);

    // Session Status Gating — check truth_dare_sessions for pending (pre-live) state
    useEffect(() => {
        if (!sessionId) return;

        const fetchSessionStatus = async () => {
            const { data } = await supabase.from('truth_dare_sessions').select('status, started_at').eq('id', sessionId).single();
            if (data) {
                if (data.status === 'ended') setSessionStatus('ended');
                else if (data.status === 'pending') setSessionStatus('pending');
                else setSessionStatus('active');
            }
        };
        fetchSessionStatus();

        const sessionGateChannel = supabase.channel(`session-gate-${sessionId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
                const newData = payload.new;
                if (newData.status === 'ended') setSessionStatus('ended');
                else if (newData.status === 'pending') setSessionStatus('pending');
                else setSessionStatus('active');
            })
            .subscribe();

        return () => { supabase.removeChannel(sessionGateChannel); };
    }, [sessionId, supabase]);

    // Realtime Status Updates
    useEffect(() => {
        if (!roomId) return;

        const gameStatusChannel = supabase.channel(`room_status_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_games', filter: `room_id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData.status === 'ended') {
                    setSessionStatus('ended');
                    setActiveSessionId(null);
                    setCurrentSessionStartedAt(null);
                } else {
                    setSessionStatus(newData.status as any);
                    setAccessRefreshTrigger(prev => prev + 1);
                }
            })
            .subscribe();

        const roomRequestChannel = supabase.channel(`room_join_requests_${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'room_join_requests' },
                (payload) => {
                    const newRecord = payload.new as any;
                    // If my request was updated
                    if (userId && newRecord.user_id === userId) { // Changed fan_id to user_id based on schema
                        if (newRecord.status === 'approved') {
                            setRequestStatus('approved');
                            // toast.success("Host approved your request! Proceeding to payment..."); // Removed toast as it's not imported
                        } else if (newRecord.status === 'rejected') {
                            setRequestStatus('rejected');
                            // toast.error("Host declined your request."); // Removed toast
                        }
                    }
                }
            )
            .subscribe();

        // Reveal Listener (Game Updates)
        const gameChannel = supabase.channel(`room:${roomId}`)
            .on('broadcast', { event: 'game_update' }, (payload) => {
                if (payload.payload?.type === 'reveal') {
                    const p = payload.payload.prompt;
                    setOverlayPrompt(p);
                    setShowOverlay(true);
                    setTimeout(() => setShowOverlay(false), 6000); // Hide after 6s
                }
                if (activeTabRef.current !== "play") {
                    setPlayUnread(prev => prev + 1);
                }
            })
            .on('broadcast', { event: 'countdown_start' }, (payload) => {
                // Only show countdown for truth/dare requests, not tips/reactions
                const pType = payload.payload?.type;
                if (payload.payload?.fanId === userId && pType !== 'tip' && pType !== 'reaction') {
                    console.log('⏱️ Countdown started for my request:', payload.payload);
                    // The showCountdown state is already triggered in processPayment
                    // This is a backup sync mechanism
                    setCountdownRequest({
                        id: payload.payload.requestId,
                        type: payload.payload.type,
                        tier: payload.payload.tier,
                        content: payload.payload.content,
                        amount: payload.payload.amount,
                        created_at: new Date(payload.payload.startedAt).toISOString(),
                        fan_id: payload.payload.fanId,
                        fan_name: payload.payload.fanName
                    });
                    setShowCountdown(true);
                }
                if (activeTabRef.current !== "play") {
                    setPlayUnread(prev => prev + 1);
                }
            })
            .on('broadcast', { event: 'request_status' }, (payload) => {
                // Check if this status update is for the current user
                if (payload.payload?.userId === userId) {
                    console.log('📢 Request status update:', payload.payload);
                    const status = payload.payload.status;
                    if (status === 'approved') {
                        setRequestStatus('approved');
                        playSuccessSound();
                    } else if (status === 'rejected') {
                        setRequestStatus('rejected');
                        playErrorSound();
                    }
                }
                if (activeTabRef.current !== "play") {
                    setPlayUnread(prev => prev + 1);
                }
            })
            .on('broadcast', { event: 'tip_event' }, (payload) => {
                const tipData = payload.payload;
                if (tipData && tipData.userId !== userId) {
                    // Show toast for other fans' tips
                    toast(`🎉 ${tipData.userName} tipped ${cs()}${tipData.amount}!`, {
                        duration: 4000,
                        position: 'top-center',
                        style: { background: '#1a1a2e', border: '1px solid rgba(236,72,153,0.4)', color: '#f9a8d4' }
                    });
                    playMoneySound();
                }
            })
            .on('broadcast', { event: 'question_revealed' }, (payload) => {
                // Check if this answer is for the current user's request
                console.log('📢 Question revealed event received:', payload.payload);
                const data = payload.payload;

                console.log(`[Debug Answer] FanID in payload: ${data.fanId} | Current UserID: ${userId}`);
                if (data.fanId && data.fanId !== userId) {
                    console.log(`[Debug Answer] Mismatch: ignoring event for other fan.`);
                }

                // Only show modal to the fan who made this specific request
                if (data.fanId && data.fanId === userId) {

                    // Show a toast first? Or just delay? User said "show... after 5 seconds".
                    // Let's delay everything.
                    setTimeout(() => {
                        setAnswerNotification({
                            fanName: data.fanName,
                            type: data.type,
                            tier: data.tier,
                            content: data.question,
                            creatorResponse: data.creatorResponse
                        });
                        // Play sound when revealed
                        playSuccessSound();
                        toast.success("Your request was answered!", {
                            duration: 5000,
                            position: "top-center"
                        });
                    }, 5000);
                }
            })
            .on('broadcast', { event: 'session_ended' }, (payload) => {
                console.log('🔴 Session ended broadcast received:', payload);
                setSessionStatus('ended');
                toast('Session has ended', {
                    duration: 5000,
                    position: 'top-center',
                    style: { background: '#1a1a2e', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }
                });
            })
            .subscribe();
            // NOTE: group_call_started is handled by the useGroupCall hook
            // (via its own dedicated channel) + a reactive useEffect above.
            // The old inline handler here had a stale userId=null closure bug.

        // Presence tracking - announce this user's presence to the room
        // Only track if we have valid user data
        let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

        if (userId && userName) {
            presenceChannel = supabase.channel(`presence:${roomId}`, {
                config: { presence: { key: userId } }
            });

            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = presenceChannel?.presenceState();
                    if (state) {
                        setFanCount(Object.keys(state).length);
                    }
                    console.log('📡 Fan presence synced');
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await presenceChannel?.track({
                            id: userId,
                            name: userName,
                            avatar: userAvatar || null,
                            joinedAt: Date.now()
                        });
                        console.log('📡 Tracking presence for:', userName);
                    }
                });
        }

        // Live Chat — fetch existing + subscribe to new messages (session-scoped by timestamp)
        // Clear previous session's messages immediately
        setChatMessages([]);

        // Use session start time if available, otherwise use current time as cutoff
        // This ensures old session messages never leak through, while still allowing
        // new messages to appear even before check-access returns sessionStartedAt
        const sessionStartedAt = currentSessionStartedAt || new Date().toISOString();

        const fetchChatMessages = async () => {
            const baseQuery = () => supabase
                .from('chat_messages')
                .select('id, room_id, user_id, username, message, created_at')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })
                .limit(100);

            let data: any[] | null = null;
            let error: any = null;

            // Session-scoped filtering: prefer session_id, fall back to timestamp
            if (activeSessionId) {
                ({ data, error } = await baseQuery().eq('session_id', activeSessionId));
                // If session_id column doesn't exist, fallback to timestamp
                if (error && error.message?.includes('session_id')) {
                    ({ data, error } = await baseQuery().gte('created_at', sessionStartedAt));
                }
            } else {
                ({ data, error } = await baseQuery().gte('created_at', sessionStartedAt));
            }

            if (data && !error) {
                setChatMessages(data);
            }
            setTimeout(scrollChatToBottom, 150);
        };
        fetchChatMessages();

        const chatChannel = supabase
            .channel(`fan-chat-${roomId}-${sessionId || 'nosession'}-${sessionStartedAt}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    const newMsg = payload.new as any;
                    // Only add messages from the current session
                    if (activeSessionId && newMsg.session_id && newMsg.session_id !== activeSessionId) return;
                    if (!activeSessionId && newMsg.created_at && newMsg.created_at < sessionStartedAt) return;
                    setChatMessages((prev) => [...prev, newMsg]);
                    setTimeout(scrollChatToBottom, 100);
                    if (activeTabRef.current !== "chat") {
                        setChatUnread((prev) => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(gameStatusChannel);
            supabase.removeChannel(roomRequestChannel);
            supabase.removeChannel(gameChannel);
            supabase.removeChannel(chatChannel);
            if (presenceChannel) {
                supabase.removeChannel(presenceChannel);
            }
        };
    }, [roomId, sessionId, activeSessionId, userId, userName, userAvatar, supabase, scrollChatToBottom, currentSessionStartedAt]);

    // Calculate and subscribe to Top Spenders (Truth King / Dare King)
    useEffect(() => {
        if (!roomId) return;

        const calculateTopSpenders = async () => {
            try {
                const targetSessionId = sessionId || activeSessionId;
                if (!targetSessionId) {
                    // No active session — reset to clean slate
                    setTopDareKing(null);
                    setTopTruthKing(null);
                    return;
                }

                // Get the active session's started_at to scope requests
                let sessionStartedAt: string | null = currentSessionStartedAt;
                if (!sessionStartedAt) {
                    const { data: sess } = await supabase
                        .from('truth_dare_sessions')
                        .select('started_at, created_at')
                        .eq('id', targetSessionId)
                        .single();
                    sessionStartedAt = sess?.started_at || sess?.created_at || null;
                }

                // Fetch requests for this room, scoped to the current session
                const baseReqQuery = () => supabase
                    .from('truth_dare_requests')
                    .select('fan_id, fan_name, type, amount')
                    .eq('room_id', roomId);

                let requests: any[] | null = null;
                let error: any = null;

                // Session-scoped query
                ({ data: requests, error } = await baseReqQuery().eq('session_id', targetSessionId));
                // If session_id column doesn't exist, fallback to timestamp
                if (error && error.message?.includes('session_id')) {
                    if (sessionStartedAt) {
                        ({ data: requests, error } = await baseReqQuery().gte('created_at', sessionStartedAt));
                    } else {
                        ({ data: requests, error } = await baseReqQuery());
                    }
                }

                if (error || !requests || requests.length === 0) {
                    // No requests yet — reset to clean slate
                    setTopDareKing(null);
                    setTopTruthKing(null);
                    return;
                }

                // Calculate spending by fan for dares vs truths
                const dareSpending: Record<string, { name: string; total: number }> = {};
                const truthSpending: Record<string, { name: string; total: number }> = {};

                requests.forEach((req) => {
                    const amount = Number(req.amount) || 0;

                    if (req.type === 'system_dare' || req.type === 'custom_dare') {
                        if (!dareSpending[req.fan_id]) {
                            dareSpending[req.fan_id] = { name: req.fan_name, total: 0 };
                        }
                        dareSpending[req.fan_id].total += amount;
                    } else if (req.type === 'system_truth' || req.type === 'custom_truth') {
                        if (!truthSpending[req.fan_id]) {
                            truthSpending[req.fan_id] = { name: req.fan_name, total: 0 };
                        }
                        truthSpending[req.fan_id].total += amount;
                    }
                });

                // Find top dare spender
                let topDare: { id: string; name: string; total: number } | null = null;
                for (const [id, data] of Object.entries(dareSpending)) {
                    if (!topDare || data.total > topDare.total) {
                        topDare = { id, name: data.name, total: data.total };
                    }
                }

                // Find top truth spender
                let topTruth: { id: string; name: string; total: number } | null = null;
                for (const [id, data] of Object.entries(truthSpending)) {
                    if (!topTruth || data.total > topTruth.total) {
                        topTruth = { id, name: data.name, total: data.total };
                    }
                }

                // Fetch avatars for top spenders
                const fetchAvatar = async (fanId: string): Promise<string | null> => {
                    const { data } = await supabase
                        .from('profiles')
                        .select('avatar_url')
                        .eq('id', fanId)
                        .single();
                    return data?.avatar_url || null;
                };

                if (topDare) {
                    const avatar = await fetchAvatar(topDare.id);
                    setTopDareKing({ name: topDare.name, avatar, total: topDare.total });
                } else {
                    setTopDareKing(null);
                }

                if (topTruth) {
                    const avatar = await fetchAvatar(topTruth.id);
                    setTopTruthKing({ name: topTruth.name, avatar, total: topTruth.total });
                } else {
                    setTopTruthKing(null);
                }

            } catch (err) {
                console.error('Error calculating top spenders:', err);
            }
        };

        // Initial calculation
        calculateTopSpenders();

        // Subscribe to real-time updates for recalculation
        const topSpenderChannel = supabase.channel(`top_spenders_${roomId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'truth_dare_requests', filter: `room_id=eq.${roomId}` },
                () => {
                    // Recalculate on any change
                    calculateTopSpenders();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(topSpenderChannel);
        };
    }, [roomId, sessionId, activeSessionId, currentSessionStartedAt, supabase]);

    /* ── Incoming activity tracking ─── */
    useEffect(() => {
        if (!roomId || !userId) return;
        const fetchIncoming = async () => {
            const baseQuery = () => supabase
                .from("truth_dare_requests")
                .select("*")
                .eq("room_id", roomId)
                .eq("fan_id", userId)
                .order("created_at", { ascending: false })
                .limit(20);

            let data: any[] | null = null;
            let error: any = null;

            // Session-scoped: prefer session_id, fall back to no filter
            if (activeSessionId) {
                ({ data, error } = await baseQuery().eq("session_id", activeSessionId));
                // If session_id column doesn't exist, fallback to unfiltered
                if (error && error.message?.includes('session_id')) {
                    ({ data } = await baseQuery());
                }
            } else {
                ({ data } = await baseQuery());
            }
            if (data) setIncomingItems(data);
        };
        fetchIncoming();

        const channel = supabase
            .channel(`fan-incoming-${roomId}-${userId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "truth_dare_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const item = payload.new as any;
                if (item.fan_id !== userId) return;
                setIncomingItems(prev => [item, ...prev].slice(0, 20));
                if (!showIncomingPanel) setUnseenCount(prev => prev + 1);
                if (activeTabRef.current !== "play") {
                    setPlayUnread(prev => prev + 1);
                }
            })
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "truth_dare_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const updated = payload.new as any;
                if (updated.fan_id !== userId) return;
                setIncomingItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
                if (activeTabRef.current !== "play") {
                    setPlayUnread(prev => prev + 1);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, activeSessionId, userId, supabase, showIncomingPanel]);

    const toggleIncomingPanel = () => {
        setShowIncomingPanel(prev => !prev);
        if (!showIncomingPanel) setUnseenCount(0);
    };

    const incomingTypeEmoji = (type: string) => {
        switch (type) {
            case "system_truth":
            case "custom_truth": return "💭";
            case "system_dare":
            case "custom_dare": return "🔥";
            case "tip": return "💰";
            case "reaction": return "✨";
            case "group_call": return "📞";
            default: return "⚡";
        }
    };

    const incomingStatusColor = (status: string) => {
        switch (status) {
            case "completed":
            case "answered": return { bg: "hsla(140,60%,20%,0.3)", border: "hsla(140,70%,45%,0.4)", text: "hsl(140,70%,55%)" };
            case "rejected":
            case "declined": return { bg: "hsla(0,60%,20%,0.3)", border: "hsla(0,70%,55%,0.4)", text: "hsl(0,70%,60%)" };
            case "pending": return { bg: "hsla(42,60%,20%,0.3)", border: "hsla(42,90%,55%,0.4)", text: "hsl(42,90%,55%)" };
            case "calling": return { bg: "hsla(180,60%,20%,0.3)", border: "hsla(180,90%,55%,0.4)", text: "hsl(180,90%,55%)" };
            default: return { bg: "hsla(280,40%,20%,0.2)", border: "hsla(280,60%,45%,0.25)", text: "hsl(280,20%,65%)" };
        }
    };

    const formatTimeAgo = (dateStr?: string) => {
        if (!dateStr) return "";
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    // Chat send handler
    const handleChatSend = async (overrideMessage?: string) => {
        const messageToSend = (overrideMessage !== undefined ? overrideMessage : chatInput).trim();
        if (!messageToSend || !roomId || !userId || chatSending) return;
        setChatSending(true);

        const chatPayload: Record<string, any> = {
            room_id: roomId,
            user_id: userId,
            username: userName,
            message: messageToSend,
            session_id: activeSessionId || null,
        };
        let { error } = await supabase.from('chat_messages').insert(chatPayload);
        // If session_id column doesn't exist yet, retry without it
        if (error && error.message?.includes('session_id')) {
            delete chatPayload.session_id;
            ({ error } = await supabase.from('chat_messages').insert(chatPayload));
        }

        if (error) {
            toast.error('Failed to send message');
        } else {
            if (overrideMessage === undefined) {
                setChatInput('');
            }
        }
        setChatSending(false);
    };

    const formatChatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    async function sendJoinRequest() {
        if (!roomId || !userId) return;
        setUnlocking(true);
        try {
            // Look up the active or pending session for this room
            const { data: activeSession } = await supabase
                .from('truth_dare_sessions')
                .select('id')
                .eq('room_id', roomId)
                .in('status', ['active', 'pending'])
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!activeSession) throw new Error('No active session found');

            const { error } = await supabase
                .from('room_join_requests')
                .insert({ session_id: activeSession.id, user_id: userId, status: 'pending' });

            if (error) throw error;
            setRequestStatus('pending');
            toast.success("Request sent! Waiting for host approval.");
        } catch (e) {
            console.error("Request failed", e);
            toast.error("Failed to send request.");
        } finally {
            setUnlocking(false);
        }
    }

    async function unlockSession() {
        if (!roomId || !sessionInfo) return;
        setUnlocking(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/entry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: sessionInfo.price })
            });
            const data = await res.json();

            if (res.ok) {
                setAccess('granted');
            } else {
                toast.error(data.error || "Failed to unlock");
            }
        } catch (e) {
            toast.error("Payment failed");
        } finally {
            setUnlocking(false);
        }
    }

    const truthWins = votes.truth >= votes.dare; // Simple check

    function openConfirmation(type: string, tier: string | null = null, content: string = "", price: number = 0) {
        setConfirmModal({ isOpen: true, type, tier, content, price });
    }

    async function processPayment() {
        if (!roomId || !confirmModal || isSubmitting) return;
        setIsSubmitting(true);
        setLastAction("Processing transaction...");

        try {
            // Route to correct API based on type
            let endpoint = `/api/v1/rooms/${roomId}/truth-or-dare/interact`;
            let body: any = {
                type: confirmModal.type,
                tier: confirmModal.tier,
                content: confirmModal.content,
                amount: confirmModal.price,
                session_id: activeSessionId || undefined
            };

            if (confirmModal.type === 'crowd_vote') {
                endpoint = `/api/v1/rooms/${roomId}/truth-or-dare/vote`;
                body = { choice: confirmModal.tier || 'truth', amount: confirmModal.price };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                setLastAction("Request sent successfully!");
                setConfirmModal(null);

                const isTruthDareRequest = ['system_truth', 'system_dare', 'custom_truth', 'custom_dare'].includes(confirmModal.type);
                
                if (isTruthDareRequest && data.request) {
                    // Only show countdown for truth/dare requests, suppress the result modal
                    setCountdownRequest(data.request);
                    setShowCountdown(true);
                } else if (confirmModal.type === 'reaction' || confirmModal.type === 'tip') {
                    // Just show a success toast for reactions and tips and don't open the result modal
                    toast.success(confirmModal.type === 'reaction' ? "Reaction sent!" : "Tip sent successfully!");
                } else {
                    // Show standard result modal for other interaction types
                    setResultModal({
                        isOpen: true,
                        success: true,
                        message: data.message || "Your request was sent successfully!",
                        type: confirmModal.type,
                        content: data.request?.content
                    });
                }

                setCustomText("");
                setCustomType(null);
                setSelectedTier(null);

                // Broadcast tip event so all fans see it
                if (confirmModal.type === 'tip' || confirmModal.type === 'reaction') {
                    playMoneySound();
                    const tipChannel = supabase.channel(`room:${roomId}`);
                    tipChannel.send({
                        type: 'broadcast',
                        event: 'tip_event',
                        payload: {
                            userId,
                            userName,
                            amount: confirmModal.price,
                            type: confirmModal.type,
                            emoji: confirmModal.tier || '💰',
                        },
                    }).catch(() => { });
                }

                // Broadcast countdown_start event ONLY for truth/dare requests
                if (isTruthDareRequest && data.request) {
                    const reqChannel = supabase.channel(`room:${roomId}`);
                    reqChannel.send({
                        type: 'broadcast',
                        event: 'countdown_start',
                        payload: {
                            requestId: data.request.id,
                            fanId: userId,
                            fanName: userName,
                            type: confirmModal.type,
                            tier: confirmModal.tier,
                            content: data.request.content,
                            amount: data.request.amount,
                            startedAt: Date.now()
                        }
                    });
                }
            } else {
                setLastAction(`Error: ${data.error || "Failed to send"}`);
                if (confirmModal.type === 'reaction' || confirmModal.type === 'tip') {
                    toast.error(data.error || `Failed to send ${confirmModal.type}`);
                } else {
                    setResultModal({
                        isOpen: true,
                        success: false,
                        message: data.error || "Failed to send your request."
                    });
                }
            }
        } catch (e) {
            setLastAction("Network error. Please try again.");
            if (confirmModal?.type === 'reaction' || confirmModal?.type === 'tip') {
                toast.error("Network error. Please try again.");
            } else {
                setResultModal({
                    isOpen: true,
                    success: false,
                    message: "Network error. Please try again."
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    }


    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-pink-500">Checking access...</div>;

    if (sessionStatus === 'pending') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white relative">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(270,50%,8%), hsl(280,40%,5%))' }} />
                <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 via-transparent to-purple-500/5" />
                
                <button onClick={onBack} className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all z-20">
                    <ArrowLeft size={18} />
                </button>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin mb-8" style={{ boxShadow: '0 0 30px hsla(320, 100%, 65%, 0.4)' }} />
                    <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-[0.2em] mb-3 text-center px-4" style={{ textShadow: '0 0 20px hsla(320, 100%, 65%, 0.5)' }}>
                        Waiting for Creator
                    </h1>
                    <p className="text-white/60 text-sm font-medium tracking-wide">
                        The Truth or Dare session will begin shortly.
                    </p>
                </div>
            </div>
        );
    }

    if (sessionStatus === 'ended' && roomId) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white relative">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(270,50%,5%), hsl(280,30%,3%))' }} />
                <div className="absolute inset-0 bg-black/60" />
                
                <div className="relative z-10 flex flex-col items-center bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-md">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 border border-white/10">
                        <span className="text-2xl">🎭</span>
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-3" style={{ textShadow: '0 0 15px rgba(255,255,255,0.2)' }}>
                        Session Ended
                    </h1>
                    <p className="text-white/50 text-sm font-medium mb-8">
                        This Truth or Dare session has concluded.
                    </p>
                    <button onClick={onBack} className="px-8 py-3 rounded-xl text-white font-bold tracking-widest uppercase hover:brightness-110 transition-all text-sm" style={{ background: 'linear-gradient(135deg, hsl(320, 100%, 55%), hsl(280, 80%, 60%))', boxShadow: '0 0 20px hsla(320, 100%, 65%, 0.3)' }}>
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }
    const mappedTabs = TOD_FAN_TABS.map(tab => {
        if (tab.id === "chat") return { ...tab, badge: chatUnread };
        if (tab.id === "play") return { ...tab, badge: playUnread };
        if (tab.id === "notifications") return { ...tab, badge: unseenCount };
        return tab;
    });

    return (
        <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
            {/* Host Tools: Request Manager (Private Rooms) */}
            {userId && hostId && userId === hostId && sessionInfo?.isPrivate && (
                <RoomRequestManager roomId={roomId!} />
            )}

            {/* Header - Minimal Style matching screenshot */}
            <div className="relative z-50 pt-2 pb-1.5 px-3 sm:px-4 lg:px-6 flex items-center justify-between shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-md">
                <div className="pointer-events-auto flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={onBack}
                        className="p-1.5 sm:p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-md active:scale-95 shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    
                    {/* Glowing Script Logo - Desktop Only */}
                    <div 
                        onClick={() => router.push("/home")}
                        className="hidden md:flex font-black text-sm sm:text-lg tracking-tight items-center mr-2 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <span className="text-pink-500 italic" style={{ textShadow: '0 0 8px rgba(236,72,153,0.7)' }}>Play</span>
                        <span className="text-white">Ground</span>
                        <span className="text-cyan-400 font-extrabold italic" style={{ textShadow: '0 0 8px rgba(34,211,238,0.7)' }}>X</span>
                    </div>

                    <div className="hidden md:block w-px h-6 bg-white/10 mx-1" />

                    {/* Dynamic Host Profile Badge */}
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-pink-500/50 shadow-[0_0_8px_rgba(236,72,153,0.4)] bg-black/40 flex items-center justify-center">
                                {hostAvatarUrl ? (
                                    <img src={hostAvatarUrl} alt={hostName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-pink-400">{hostName.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full shadow-[0_0_4px_rgba(34,197,94,0.8)] animate-pulse" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="font-black text-sm sm:text-base text-white truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none">
                                    {hostName}
                                </span>
                                <span className="px-1.5 py-0.5 text-[9px] font-black tracking-widest text-[#ff2a6d] border border-[#ff2a6d]/40 rounded bg-[#ff2a6d]/10 animate-pulse uppercase leading-none shadow-[0_0_6px_rgba(255,42,109,0.3)] shrink-0">
                                    LIVE
                                </span>
                            </div>
                            {sessionInfo && (
                                <span className="text-[10px] sm:text-xs text-white/50 truncate max-w-[100px] xs:max-w-[150px] sm:max-w-none font-medium leading-none mt-0.5">
                                    {sessionInfo.title}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {/* Invite + Wallet */}
                <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-3">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="p-1.5 sm:p-2 rounded-full border border-pink-500/30 bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 transition-all hover:scale-105 active:scale-95 backdrop-blur-md flex items-center gap-1 px-2 sm:px-3 text-[10px] sm:text-xs font-bold"
                        title="Invite Friends"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Invite</span>
                    </button>

                    {/* Incoming Activity Menu */}
                    <div className="relative">
                        <button
                            onClick={toggleIncomingPanel}
                            className={`p-1.5 sm:p-2 rounded-full border transition-all hover:scale-105 active:scale-95 backdrop-blur-md flex items-center gap-1 px-2 sm:px-3 text-[10px] sm:text-xs font-bold ${
                                showIncomingPanel 
                                ? "border-purple-400 bg-purple-500/30 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                                : "border-purple-500/30 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300"
                            }`}
                        >
                            <Bell className={`w-3.5 h-3.5 ${unseenCount > 0 ? "animate-bounce" : ""}`} />
                            <span className="hidden xs:inline">Incoming</span>
                            {unseenCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-purple-500 text-white text-[8px] font-black px-0.5 shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                                    {unseenCount}
                                </span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showIncomingPanel && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-3 w-72 sm:w-80 bg-[#16161e]/95 border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl z-[60]"
                                >
                                    {/* Panel Header */}
                                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                <Bell className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white">My Activity</h3>
                                                <p className="text-[10px] text-white/40 uppercase tracking-wider">Latest Requests</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setShowIncomingPanel(false)}
                                            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Panel Body */}
                                    <div className="max-h-[360px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                                        {incomingItems.length === 0 ? (
                                            <div className="py-12 px-4 text-center">
                                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                                    <Zap className="w-6 h-6 text-white/10" />
                                                </div>
                                                <p className="text-sm text-white/40">No recent activity</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                {incomingItems.map((item) => {
                                                    const emoji = incomingTypeEmoji(item.type);
                                                    const sc = incomingStatusColor(item.status);
                                                    const isAnswered = item.status === 'answered' || item.status === 'completed' || !!item.creator_response;
                                                    return (
                                                        <div 
                                                            key={item.id}
                                                            className={`flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group ${
                                                                isAnswered ? 'cursor-pointer hover:scale-[1.01] hover:brightness-110 active:scale-[0.99]' : ''
                                                            }`}
                                                            style={{ 
                                                                background: `linear-gradient(90deg, ${sc.bg}, transparent)`,
                                                                border: `1px solid ${sc.border}`
                                                            }}
                                                            onClick={() => {
                                                                if (isAnswered) {
                                                                    setAnswerNotification({
                                                                        fanName: item.fan_name || "You",
                                                                        type: item.type,
                                                                        tier: item.tier || "bronze",
                                                                        content: item.content,
                                                                        creatorResponse: item.creator_response || ""
                                                                    });
                                                                    setShowIncomingPanel(false);
                                                                }
                                                            }}
                                                        >
                                                            <span className="text-xl group-hover:scale-110 transition-transform">{emoji}</span>
                                                            <div className="flex-1 min-w-0">
                                                                 <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                    <span className="text-xs font-bold text-white truncate">
                                                                        {item.content || (item.type.includes('truth') ? 'Truth' : item.type.includes('dare') ? 'Dare' : 'Request')}
                                                                    </span>
                                                                    <span className="text-[10px] font-black text-purple-400">{cs()}{item.amount}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span 
                                                                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border"
                                                                        style={{ 
                                                                            borderColor: sc.border,
                                                                            color: sc.text,
                                                                            background: `${sc.border}10`
                                                                        }}
                                                                    >
                                                                        {item.status}
                                                                    </span>
                                                                    <span className="text-[9px] text-white/30 flex items-center gap-1">
                                                                        <Clock className="w-2.5 h-2.5" />
                                                                        {formatTimeAgo(item.created_at)}
                                                                    </span>
                                                                </div>
                                                                {isAnswered && (
                                                                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded-md w-max">
                                                                        <span>💬</span>
                                                                        <span className="animate-pulse">Tap to view response</span>
                                                                    </div>
                                                                )}
                                                                {item.type === "group_call" && item.status === "calling" && (
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            groupCall.acceptCall();
                                                                            setShowIncomingPanel(false);
                                                                        }}
                                                                        className="mt-2 w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                                                                    >
                                                                        <Video className="w-3.5 h-3.5" />
                                                                        Accept Call
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Panel Footer */}
                                    <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                                        <p className="text-[9px] text-white/30 uppercase tracking-widest">Powered by PlaygroundX</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <RoomTourHelpButton tourType="truth_or_dare_fan" accentHsl="260, 80%, 55%" />
                    <WalletPill compact={true} />
                </div>
            </div>

            {/* Paywall Overlay */}
            {
                access === 'locked' && sessionInfo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                        <div className="max-w-xs w-full bg-gray-900 border border-purple-500/30 rounded-2xl p-5 text-center shadow-[0_0_100px_rgba(168,85,247,0.2)]">
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                                <Lock className="w-6 h-6 text-purple-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white mb-1.5">{sessionInfo.title}</h2>
                            <p className="text-sm text-gray-400 mb-5">{sessionInfo.desc || "This is a private VIP session. Unlock to enter and participate."}</p>

                            <div className="p-3 rounded-xl bg-black/40 border border-white/10 mb-5">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Entry Fee</div>
                                <div className="text-2xl font-bold text-purple-300">{cs()}{sessionInfo.price}</div>
                            </div>

                            <button
                                onClick={
                                    sessionInfo.isPrivate && requestStatus !== 'approved'
                                        ? sendJoinRequest
                                        : unlockSession
                                }
                                disabled={unlocking || (sessionInfo.isPrivate && requestStatus === 'pending') || (sessionInfo.isPrivate && requestStatus === 'rejected')}
                                className={`w-full py-3 rounded-xl font-bold text-base shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${sessionInfo.isPrivate && requestStatus !== 'approved'
                                    ? "bg-blue-600 hover:bg-blue-500 shadow-blue-900/40 text-white"
                                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/40"
                                    }`}
                            >
                                {unlocking ? (
                                    "Processing..."
                                ) : sessionInfo.isPrivate && requestStatus === 'pending' ? (
                                    <>Request Pending...</>
                                ) : sessionInfo.isPrivate && requestStatus === 'rejected' ? (
                                    <>Request Declined</>
                                ) : sessionInfo.isPrivate && requestStatus !== 'approved' ? (
                                    <>Request to Join</>
                                ) : (
                                    <>Unlock Access <Play className="w-5 h-5 fill-current" /></>
                                )}
                            </button>

                            <button
                                onClick={() => router.push('/account/wallet')}
                                className="w-full mt-2 py-3 rounded-xl font-bold text-base border-2 border-purple-500/40 bg-background/50 backdrop-blur shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:bg-purple-500/10 hover:border-purple-500/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex items-center justify-center gap-2 text-purple-300"
                            >
                                <Wallet className="w-5 h-5" /> Wallet
                            </button>

                            <p className="mt-4 text-xs text-gray-600">
                                {sessionInfo.isPrivate && requestStatus !== 'approved'
                                    ? "Host must approve your request before payment."
                                    : "Secure payment via PlaygroundX Wallet"
                                }
                            </p>
                        </div>
                    </div>
                )
            }


            <div
                className="absolute inset-0 bg-[#0a0a0c] bg-cover bg-center bg-fixed transition-opacity duration-1000"
                style={{
                    backgroundImage: "linear-gradient(to bottom, rgba(10, 10, 12, 0.4), rgba(10, 10, 12, 0.2)), url('/images/truth-or-dare-custom-bg.jpg')"
                }}
            />

            {/* Desktop Layout - visible only on lg screens */}
            <main className="hidden lg:block relative z-10 flex-1 min-h-0 p-1.5 sm:p-2 lg:px-3 lg:py-2 w-full h-full overflow-hidden">
                <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 h-full">
                    {/* Left: Stream + Prompts */}
                    <div className="flex flex-col gap-2 lg:gap-3 flex-1 lg:flex-[2] min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <div
                            className="relative rounded-2xl lg:rounded-3xl border border-white/10 aspect-video flex items-center justify-center bg-gray-950/40 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md"
                            data-tour="tod-fan-live-stream"
                        >
                            {roomId ? (
                                <LiveStreamWrapper
                                    role="fan"
                                    appId={APP_ID}
                                    roomId={roomId}
                                    uid={userId || 0}
                                    hostId={hostId || 0}
                                    hostAvatarUrl={hostAvatarUrl}
                                    hostName={hostName}
                                    collabCreators={collabCreators}
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center animate-pulse">
                                        <div className="w-8 h-8 rounded-full bg-white/5" />
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Waiting for host...</span>
                                </div>
                            )}
                        </div>

                        {/* Prompt Section - 3 columns as in screenshot */}
                        <div className="glass-panel p-2.5 sm:p-3 lg:p-4 border-white/10 bg-white/5">

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                                {/* Col 1: System Dares (now on left) */}
                                <div className="space-y-4" data-tour="tod-fan-system-dares">
                                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest pb-2 px-2 bg-red-500/5 rounded-t-lg" style={{ textShadow: '0 0 10px rgba(239,68,68,0.6), 0 0 30px rgba(239,68,68,0.3)' }}>System Dares</h4>
                                    <div className="space-y-3">
                                        {dareTiers.map((t) => (
                                            <button
                                                key={`dare-${t.id}`}
                                                disabled={isSubmitting}
                                                onClick={() => openConfirmation('system_dare', t.id, "", t.price)}
                                                className="w-full flex items-center justify-between group"
                                            >
                                                <div className="text-left flex items-center gap-2">
                                                    <span className="text-[13px] font-black text-red-300 bg-red-500/10 px-2 py-0.5 rounded group-hover:bg-red-500/20 transition-colors uppercase tracking-tight" style={{ textShadow: '0 0 8px rgba(239,68,68,0.7), 0 0 20px rgba(239,68,68,0.4)' }}>{t.label}</span>
                                                    <div>
                                                        <p className="text-[11px] text-gray-500 leading-none mt-0.5">{t.desc}</p>
                                                    </div>
                                                </div>
                                                <span className="text-base font-bold text-white">{cs()}{t.price}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Col 2: System Truths (now on right) */}
                                <div className="space-y-4" data-tour="tod-fan-system-truths">
                                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest pb-2 px-2 bg-blue-500/5 rounded-t-lg" style={{ textShadow: '0 0 10px rgba(59,130,246,0.6), 0 0 30px rgba(59,130,246,0.3)' }}>System Truths</h4>
                                    <div className="space-y-3">
                                        {truthTiers.map((t) => (
                                            <button
                                                key={`truth-${t.id}`}
                                                disabled={isSubmitting}
                                                onClick={() => openConfirmation('system_truth', t.id, "", t.price)}
                                                className="w-full flex items-center justify-between group"
                                            >
                                                <div className="text-left flex items-center gap-2">
                                                    <span className="text-[13px] font-black text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded group-hover:bg-blue-500/20 transition-colors uppercase tracking-tight" style={{ textShadow: '0 0 8px rgba(59,130,246,0.7), 0 0 20px rgba(59,130,246,0.4)' }}>{t.label}</span>
                                                    <div>
                                                        <p className="text-[11px] text-gray-500 leading-none mt-0.5">{t.desc}</p>
                                                    </div>
                                                </div>
                                                <span className="text-base font-bold text-white">{cs()}{t.price}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Col 3: Custom Requests */}
                                <div className="space-y-4 col-span-2 sm:col-span-1" data-tour="tod-fan-custom-requests">
                                    <h4 className="text-[11px] font-bold text-purple-400 uppercase tracking-widest pb-2 px-2 bg-purple-500/5 rounded-t-lg" style={{ textShadow: '0 0 10px rgba(168,85,247,0.6), 0 0 30px rgba(168,85,247,0.3)' }}>Custom Requests</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCustomType("truth")}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${customType === "truth" ? "bg-blue-600/50 shadow-[0_0_20px_rgba(59,130,246,0.5)] text-white scale-105" : "bg-blue-900/10 text-blue-400/70 hover:bg-blue-500/10"}`}
                                        >
                                            Custom Truth ({cs()}25)
                                        </button>
                                        <button
                                            onClick={() => setCustomType("dare")}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${customType === "dare" ? "bg-red-600/50 shadow-[0_0_20px_rgba(239,68,68,0.5)] text-white scale-105" : "bg-red-900/10 text-red-400/70 hover:bg-red-500/10"}`}
                                        >
                                            Custom Dare ({cs()}35)
                                        </button>
                                    </div>
                                    <textarea
                                        value={customText}
                                        onChange={(e) => setCustomText(e.target.value)}
                                        placeholder="Write your custom Truth/Dare here..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-gray-600 outline-none resize-none h-20 focus:border-white/20 transition-all"
                                    />
                                    <button
                                        onClick={() => openConfirmation(`custom_${customType}`, null, customText, customType === 'truth' ? 25 : 35)}
                                        className="w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        <span>Pay & Submit</span>
                                    </button>

                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Kings + Actions + Spinner */}
                    <div className="flex flex-col gap-2 lg:gap-3 w-full lg:w-[280px] xl:w-[320px] min-h-0 overflow-y-auto shrink-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {/* Profiles */}
                        <div className="flex gap-3" data-tour="tod-fan-top-fans">
                            <ProfileCard
                                name={topDareKing?.name || "Be first!"}
                                title="Dare King"
                                avatar={topDareKing?.avatar}
                                color="red"
                                amount={topDareKing?.total}
                            />
                            <ProfileCard
                                name={topTruthKing?.name || "Be first!"}
                                title="Truth King"
                                avatar={topTruthKing?.avatar}
                                color="blue"
                                amount={topTruthKing?.total}
                            />
                        </div>

                        {/* Action Buttons */}
                        {/* Action Buttons row - strictly matching icons in screenshot */}
                        {/* Reaction Bar */}
                        <div className="glass-panel p-2.5 sm:p-3 lg:p-4 flex justify-between gap-1.5 sm:gap-2 border-white/10 bg-black/20" data-tour="tod-fan-gifts">
                            {[
                                { name: "Kiss", emoji: "💋", price: 10 },
                                { name: "Love", emoji: "❤️", price: 20 },
                                { name: "Spicy", emoji: "🔥", price: 30 },
                                { name: "Dark", emoji: "🖤", price: 40 },
                            ].map((r) => (
                                <button
                                    key={r.name}
                                    onClick={() => openConfirmation('reaction', r.name, "", r.price)}
                                    className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 transition-all group shadow-[0_0_12px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105"
                                >
                                    <span className="text-xl group-hover:scale-125 transition-transform">{r.emoji}</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] uppercase font-bold tracking-tighter text-purple-200">{r.name}</span>
                                        <span className="text-[8px] font-bold text-white/50">{cs()}{r.price}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Tip Creator Section */}
                        <div className="glass-panel p-2.5 sm:p-3 lg:p-4 border-white/10 bg-black/20" data-tour="tod-fan-tip-creator">
                            <div className="flex items-center gap-2 mb-3">
                                <Send className="w-4 h-4 text-green-400" />
                                <h3 className="text-sm font-semibold text-white tracking-wide">Tip Creator</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {TIP_AMOUNTS.map((amount) => (
                                    <button
                                        key={`tip-${amount}`}
                                        disabled={isSubmitting}
                                        onClick={() => openConfirmation('tip', `${cs()}${amount}`, `Tip ${cs()}${amount}`, amount)}
                                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/40 transition-all group hover:scale-105 shadow-[0_0_8px_rgba(34,197,94,0.15)] hover:shadow-[0_0_16px_rgba(34,197,94,0.3)]"
                                    >
                                        <span className="text-lg group-hover:scale-110 transition-transform">💰</span>
                                        <span className="text-[10px] font-bold text-green-300">{cs()}{amount}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-gray-500 text-center mt-2">Show your appreciation — tips go directly to the creator</p>
                        </div>

                        {/* Group Voting Section — wired with GroupVotePanel */}
                        {roomId && (
                            <div data-tour="tod-fan-vote-goals">
                                <GroupVotePanel
                                    roomId={roomId}
                                    currentUserId={userId || undefined}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right: Dedicated Chat Column */}
                    <div className="flex flex-col w-full lg:w-[280px] xl:w-[340px] 2xl:w-[380px] min-h-0 shrink-0 lg:h-full overflow-hidden" data-tour="tod-fan-live-chat">
                        <div className="glass-panel border-white/10 bg-white/5 flex flex-col flex-1 min-h-0 overflow-hidden">
                            {/* Chat Header */}
                            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <div className="w-1 h-3 bg-pink-500 rounded-full" />
                                    Live Chat Room
                                </h3>
                                <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">{fanCount} online</span>
                                </div>
                            </div>

                            {/* Live Chat Messages Area */}
                            <div
                                ref={chatScrollRef}
                                className="p-4 flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                            >
                                {chatMessages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-white/30 text-xs tracking-wider uppercase">No messages yet — say hello!</p>
                                    </div>
                                ) : (
                                    chatMessages.map((m) => {
                                        const isMe = m.user_id === userId;
                                        return (
                                            <div key={m.id} className="flex items-start gap-2.5 group">
                                                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white border ${isMe ? 'bg-pink-600/30 border-pink-400' : 'bg-purple-600/30 border-purple-400'}`}>
                                                    {m.username?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className={`font-bold text-[11px] ${isMe ? 'text-pink-400' : 'text-amber-400'}`}>
                                                            {m.username || 'Anonymous'}
                                                        </span>
                                                        {m.user_id && <UserBadgeDisplay userId={m.user_id} />}
                                                        <span className="text-[9px] text-white/25 ml-auto shrink-0">
                                                            {formatChatTime(m.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-white/80 mt-0.5 break-words leading-snug">
                                                        {m.message}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Message Input */}
                            <div className="p-4 bg-white/5 border-t border-white/10">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder={userId ? "Type your message..." : "Sign in to chat"}
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleChatSend();
                                            }
                                        }}
                                        disabled={!userId || !roomId}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 pl-4 pr-3 text-xs text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-all outline-none disabled:opacity-40"
                                    />
                                    <EmojiPicker
                                        onEmojiSelect={(emoji) => setChatInput(prev => prev + emoji)}
                                        accentColor="hsl(320, 100%, 65%)"
                                        position="top"
                                    />
                                    <button
                                        onClick={() => handleChatSend()}
                                        disabled={!chatInput.trim() || !userId || chatSending}
                                        className="p-2 rounded-lg bg-pink-600/20 hover:bg-pink-600/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Flame className={`w-4 h-4 ${chatSending ? 'animate-pulse text-pink-300' : 'text-pink-400'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Redesigned Layout (Screens < lg) */}
            <main className="lg:hidden relative z-10 flex-1 min-h-0 px-3 pb-20 pt-2 w-full overflow-hidden flex flex-col gap-3">
                {/* 1. Video Stream — fixed aspect-video at top */}
                <div className="w-full shrink-0 aspect-video max-w-[600px] mx-auto rounded-xl overflow-hidden border border-white/10 bg-gray-950/40 shadow-lg relative">
                    {roomId ? (
                        <LiveStreamWrapper
                            role="fan"
                            appId={APP_ID}
                            roomId={roomId}
                            uid={userId || 0}
                            hostId={hostId || 0}
                            hostAvatarUrl={hostAvatarUrl}
                            hostName={hostName}
                            collabCreators={collabCreators}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 h-full justify-center">
                            <Video className="w-5 h-5 text-white/20 animate-pulse" />
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Waiting for host...</span>
                        </div>
                    )}
                    
                    {/* Live + Viewer Count Overlay */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                        <span className="px-1.5 py-0.5 bg-[#ff2a6d] text-white text-[7px] font-black uppercase tracking-wider rounded animate-pulse shadow-[0_0_8px_rgba(255,42,109,0.5)]">
                            LIVE
                        </span>
                        <span className="px-1.5 py-0.5 bg-black/60 border border-white/10 text-white/80 text-[7px] font-bold rounded flex items-center gap-0.5 backdrop-blur-sm">
                            <Eye className="w-2.5 h-2.5 text-white/70" />
                            {fanCount > 0 ? fanCount : 1}
                        </span>
                    </div>
                </div>
                
                {/* 2. Reactions & Tip Creator Row — fixed below video */}
                <div className="flex gap-2 shrink-0">
                    {/* Reactions (60%) */}
                    <div className="flex-[6] bg-[#140b1b]/50 border border-purple-500/10 rounded-2xl p-2.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(168,85,247,0.05)]" data-tour="tod-fan-gifts">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Flame className="w-3 h-3 text-purple-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-wider">Reactions</h3>
                        </div>
                        <div className="flex justify-between gap-1">
                            {[
                                { name: "Kiss", emoji: "💋", price: 10 },
                                { name: "Love", emoji: "❤️", price: 20 },
                                { name: "Spicy", emoji: "🔥", price: 30 },
                                { name: "Dark", emoji: "🖤", price: 40 },
                            ].map((r) => (
                                <button
                                    key={`reaction-mobile-${r.name}`}
                                    onClick={() => openConfirmation('reaction', r.name, "", r.price)}
                                    className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/15 transition-all group active:scale-95 shadow-[0_2px_8px_rgba(168,85,247,0.1)]"
                                >
                                    <span className="text-lg group-hover:scale-120 transition-transform">{r.emoji}</span>
                                    <div className="flex flex-col items-center leading-none mt-1">
                                        <span className="text-[10px] uppercase font-black tracking-tighter text-purple-200">{r.name}</span>
                                        <span className="text-[11px] font-black text-white/50 mt-0.5">{cs()}{r.price}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tip Creator (40%) */}
                    <div className="flex-[4] bg-[#091510]/50 border border-emerald-500/15 rounded-2xl p-2.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(16,185,129,0.05)]" data-tour="tod-fan-tip-creator">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Send className="w-3 h-3 text-emerald-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-wider">Tip Creator</h3>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                            {TIP_AMOUNTS.map((amount) => (
                                <button
                                    key={`tip-mobile-${amount}`}
                                    disabled={isSubmitting}
                                    onClick={() => openConfirmation('tip', `${cs()}${amount}`, `Tip ${cs()}${amount}`, amount)}
                                    className="flex flex-col items-center gap-1 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 hover:bg-emerald-500/20 transition-all active:scale-95"
                                >
                                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-[11px] font-black text-emerald-300">{cs()}{amount}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Scrollable Tab Content Panels */}
                {mobileTab === "chat" && (
                    <div className="w-full flex-1 min-h-0 flex flex-col bg-[#0b080f]/50 border border-white/5 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                        {/* Chat Header */}
                        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
                            <h3 className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-widest">
                                <div className="w-1 h-3.5 bg-[#ff2a6d] rounded-full shadow-[0_0_8px_rgba(255,42,109,0.8)]" />
                                Live Chat Room
                            </h3>
                            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">{fanCount > 0 ? fanCount : 1} ONLINE</span>
                            </div>
                        </div>

                        {/* Live Chat Messages Area */}
                        <div ref={chatScrollRef} className="p-3.5 flex-1 overflow-y-auto space-y-3 scrollbar-none">
                            {chatMessages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-white/25 text-xs uppercase tracking-wider">No messages yet — say hello!</p>
                                </div>
                            ) : (
                                chatMessages.map((m) => {
                                    const isMe = m.user_id === userId;
                                    return (
                                        <div key={`chat-mobile-${m.id}`} className="flex items-start gap-2 text-left">
                                            <div className={`w-6.5 h-6.5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white border ${isMe ? 'bg-pink-600/30 border-pink-400 shadow-[0_0_8px_rgba(219,39,119,0.2)]' : 'bg-purple-600/30 border-purple-400 shadow-[0_0_8px_rgba(147,51,234,0.2)]'}`}>
                                                {m.username?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                                    <span className={`font-black text-xs flex items-center gap-0.5 ${isMe ? 'text-pink-400' : 'text-amber-400'}`}>
                                                        👑 {m.username || 'Anonymous'}
                                                    </span>
                                                    <span className="bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[8px] font-black px-1 rounded uppercase">VIP</span>
                                                    {m.user_id && <UserBadgeDisplay userId={m.user_id} />}
                                                    <span className="text-[9px] text-white/30 ml-auto shrink-0 font-medium">
                                                        {formatChatTime(m.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-white/80 mt-0.5 break-words leading-relaxed">
                                                    {m.message}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Message Input */}
                        <div className="p-2.5 border-t border-white/5 bg-white/5 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <EmojiPicker
                                    onEmojiSelect={(emoji) => setChatInput(prev => prev + emoji)}
                                    accentColor="hsl(320, 100%, 65%)"
                                    position="top"
                                />
                                <input
                                    type="text"
                                    placeholder={userId ? "Type your message..." : "Sign in to chat"}
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleChatSend();
                                        }
                                    }}
                                    disabled={!userId || !roomId}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-gray-500 focus:border-white/25 transition-all outline-none"
                                />
                                <button
                                    onClick={() => handleChatSend()}
                                    disabled={!chatInput.trim() || !userId || chatSending}
                                    className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 transition-colors disabled:opacity-40"
                                >
                                    <Send className="w-4 h-4 text-pink-400" />
                                </button>
                                <button
                                    onClick={() => {
                                        handleChatSend("🔥");
                                    }}
                                    disabled={!userId}
                                    className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-colors"
                                >
                                    <Flame className="w-4 h-4 text-orange-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {mobileTab === "play" && (
                    <div className="w-full flex-1 min-h-0 overflow-y-auto pb-4 flex flex-col gap-3">
                        {/* System Dares & System Truths */}
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                            {/* System Dares */}
                            <div className="bg-[#180a0a]/30 border border-red-500/15 rounded-2xl p-3 flex flex-col gap-2.5 shadow-[0_4px_15px_rgba(239,68,68,0.02)]" data-tour="tod-fan-system-dares">
                                <h4 className="text-xs font-black text-red-400 uppercase tracking-widest pb-1 border-b border-red-500/10 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    System Dares
                                </h4>
                                <div className="flex flex-col gap-2">
                                    {dareTiers.map((t) => {
                                        const badgeColor = t.id === 'bronze' ? 'bg-[#48281a] border border-[#a15c38]/30 text-[#e7a379] shadow-[0_0_8px_rgba(161,92,56,0.15)]' : t.id === 'silver' ? 'bg-[#2d3139] border border-[#717684]/30 text-[#b5bac9] shadow-[0_0_8px_rgba(113,118,132,0.15)]' : 'bg-[#4e3f16] border border-[#c1a03c]/30 text-[#ecd67d] shadow-[0_0_8px_rgba(193,160,60,0.15)]';
                                        return (
                                            <button
                                                key={`dare-mobile-${t.id}`}
                                                disabled={isSubmitting}
                                                onClick={() => openConfirmation('system_dare', t.id, "", t.price)}
                                                className="w-full flex items-center justify-between group active:scale-98 text-left py-1"
                                            >
                                                <div className="min-w-0">
                                                    <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${badgeColor}`}>
                                                        {t.label}
                                                    </span>
                                                    <p className="text-[10px] text-gray-500 truncate mt-0.5 leading-none">{t.desc}</p>
                                                </div>
                                                <span className="text-xs font-black text-white shrink-0 ml-1">{cs()}{t.price}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* System Truths */}
                            <div className="bg-[#0a0f18]/30 border border-cyan-500/15 rounded-2xl p-3 flex flex-col gap-2.5 shadow-[0_4px_15px_rgba(6,182,212,0.02)]" data-tour="tod-fan-system-truths">
                                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest pb-1 border-b border-cyan-500/10 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                    System Truths
                                </h4>
                                <div className="flex flex-col gap-2">
                                    {truthTiers.map((t) => {
                                        const badgeColor = t.id === 'bronze' ? 'bg-[#48281a] border border-[#a15c38]/30 text-[#e7a379] shadow-[0_0_8px_rgba(161,92,56,0.15)]' : t.id === 'silver' ? 'bg-[#2d3139] border border-[#717684]/30 text-[#b5bac9] shadow-[0_0_8px_rgba(113,118,132,0.15)]' : 'bg-[#4e3f16] border border-[#c1a03c]/30 text-[#ecd67d] shadow-[0_0_8px_rgba(193,160,60,0.15)]';
                                        return (
                                            <button
                                                key={`truth-mobile-${t.id}`}
                                                disabled={isSubmitting}
                                                onClick={() => openConfirmation('system_truth', t.id, "", t.price)}
                                                className="w-full flex items-center justify-between group active:scale-98 text-left py-1"
                                            >
                                                <div className="min-w-0">
                                                    <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${badgeColor}`}>
                                                        {t.label}
                                                    </span>
                                                    <p className="text-[10px] text-gray-500 truncate mt-0.5 leading-none">{t.desc}</p>
                                                </div>
                                                <span className="text-xs font-black text-white shrink-0 ml-1">{cs()}{t.price}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Custom Requests */}
                        <div className="bg-[#120818]/30 border border-purple-500/15 rounded-2xl p-3 flex flex-col gap-2.5 shadow-[0_4px_15px_rgba(168,85,247,0.02)] shrink-0" data-tour="tod-fan-custom-requests">
                            <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest px-0.5">
                                Custom Requests
                            </h4>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCustomType("truth")}
                                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                                        customType === "truth" 
                                        ? "bg-[#0c1a2f]/80 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]" 
                                        : "bg-cyan-950/10 border border-cyan-500/10 text-cyan-400/50 hover:bg-cyan-500/5"
                                    }`}
                                >
                                    Custom Truth ({cs()}25)
                                </button>
                                <button
                                    onClick={() => setCustomType("dare")}
                                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                                        customType === "dare" 
                                        ? "bg-[#250d18]/80 border border-red-500/30 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.25)]" 
                                        : "bg-red-950/10 border border-red-500/10 text-red-400/50 hover:bg-red-500/5"
                                    }`}
                                >
                                    Custom Dare ({cs()}35)
                                </button>
                            </div>
                            <div className="flex gap-2 items-stretch">
                                <textarea
                                    value={customText}
                                    onChange={(e) => setCustomText(e.target.value)}
                                    placeholder="Write your custom Truth/Dare here..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-gray-600 outline-none resize-none h-14 leading-normal focus:border-white/20 transition-all"
                                />
                                <button
                                    onClick={() => openConfirmation(`custom_${customType}`, null, customText, customType === 'truth' ? 25 : 35)}
                                    disabled={!customType || !customText.trim() || isSubmitting}
                                    className="px-3 rounded-xl bg-[#241a08] border border-amber-500/40 text-amber-300 disabled:opacity-40 disabled:border-white/5 disabled:text-gray-600 disabled:bg-black/20 text-xs font-black flex flex-col items-center justify-center gap-1.5 hover:bg-amber-500/20 hover:border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] active:scale-95 select-none shrink-0"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    <span>Pay & Submit</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {mobileTab === "notifications" && (
                    <div className="w-full flex-1 min-h-0 flex flex-col bg-[#0b080f]/50 border border-white/5 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
                            <h3 className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-widest">
                                <div className="w-1 h-3.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                                Notifications
                            </h3>
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">My Activity</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-none">
                            {incomingItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                        <Zap className="w-5 h-5 text-white/20 animate-pulse" />
                                    </div>
                                    <p className="text-xs text-white/40 uppercase tracking-wider">No recent activity</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {incomingItems.map((item) => {
                                        const emoji = incomingTypeEmoji(item.type);
                                        const sc = incomingStatusColor(item.status);
                                        const isAnswered = item.status === 'answered' || item.status === 'completed' || !!item.creator_response;
                                        return (
                                            <div 
                                                key={`noti-mobile-${item.id}`}
                                                className={`flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group active:scale-98 text-left ${
                                                    isAnswered ? 'cursor-pointer hover:scale-[1.01] hover:brightness-110 active:scale-[0.99]' : ''
                                                }`}
                                                style={{ 
                                                    background: `linear-gradient(90deg, ${sc.bg}, transparent)`,
                                                    border: `1px solid ${sc.border}`
                                                }}
                                                onClick={() => {
                                                    if (isAnswered) {
                                                        setAnswerNotification({
                                                            fanName: item.fan_name || "You",
                                                            type: item.type,
                                                            tier: item.tier || "bronze",
                                                            content: item.content,
                                                            creatorResponse: item.creator_response || ""
                                                        });
                                                    }
                                                }}
                                            >
                                                <span className="text-xl group-hover:scale-110 transition-transform">{emoji}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                        <span className="text-xs font-bold text-white truncate">
                                                            {item.content || (item.type.includes('truth') ? 'Truth' : item.type.includes('dare') ? 'Dare' : 'Request')}
                                                        </span>
                                                        <span className="text-[10px] font-black text-purple-400">{cs()}{item.amount}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span 
                                                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border"
                                                            style={{ 
                                                                borderColor: sc.border,
                                                                color: sc.text,
                                                                background: `${sc.border}10`
                                                            }}
                                                        >
                                                            {item.status}
                                                        </span>
                                                        <span className="text-[9px] text-white/30 flex items-center gap-1">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {formatTimeAgo(item.created_at)}
                                                        </span>
                                                    </div>
                                                    {isAnswered && (
                                                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded-md w-max">
                                                            <span>💬</span>
                                                            <span className="animate-pulse">Tap to view response</span>
                                                        </div>
                                                    )}
                                                    {item.type === "group_call" && item.status === "calling" && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                groupCall.acceptCall();
                                                            }}
                                                            className="mt-2 w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                                                        >
                                                            <Video className="w-3.5 h-3.5" />
                                                            Accept Call
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {mobileTab === "voting" && roomId && (
                    <div className="w-full flex-1 min-h-0 overflow-y-auto pb-4 flex flex-col gap-3" data-tour="tod-fan-vote-goals">
                        <GroupVotePanel
                            roomId={roomId}
                            currentUserId={userId || undefined}
                        />
                    </div>
                )}

                {mobileTab === "info" && (
                    <div className="w-full flex-1 min-h-0 overflow-y-auto pb-4 flex flex-col gap-4">
                        {/* Stacked Kings (Top Fans) */}
                        <div className="grid grid-cols-2 gap-3 shrink-0" data-tour="tod-fan-top-fans">
                            {/* Dare King Card */}
                            <div className="bg-[#1a0f18]/80 border border-red-500/15 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-[0_4px_15px_rgba(255,42,109,0.05)]">
                                <span className="text-xs font-black text-red-400 uppercase tracking-widest flex items-center gap-1" style={{ textShadow: '0 0 5px rgba(239,68,68,0.3)' }}>
                                    <CrownIcon className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                                    Dare King
                                </span>
                                <div className="relative w-12 h-12 mt-2 rounded-full p-0.5 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)] bg-black/40">
                                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                                        {topDareKing?.avatar ? (
                                            <img src={topDareKing.avatar} alt="Dare King" className="w-full h-full object-cover" />
                                        ) : (
                                            <CrownIcon className="w-6 h-6 text-red-500/35" />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#ff2a6d] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.5)] leading-none">
                                        {topDareKing?.total ? `${topDareKing.total}` : "0"}
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-red-300 mt-2.5 truncate w-full max-w-[120px]">
                                    {topDareKing?.name || "-"}
                                </span>
                            </div>

                            {/* Truth King Card */}
                            <div className="bg-[#0a111a]/80 border border-cyan-500/15 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-[0_4px_15px_rgba(5,217,232,0.05)]">
                                <span className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1" style={{ textShadow: '0 0 5px rgba(6,182,212,0.3)' }}>
                                    <CrownIcon className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                                    Truth King
                                </span>
                                <div className="relative w-12 h-12 mt-2 rounded-full p-0.5 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)] bg-black/40">
                                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                                        {topTruthKing?.avatar ? (
                                            <img src={topTruthKing.avatar} alt="Truth King" className="w-full h-full object-cover" />
                                        ) : (
                                            <CrownIcon className="w-6 h-6 text-cyan-500/35" />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#05d9e8] text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.5)] leading-none">
                                        {topTruthKing?.total ? `${topTruthKing.total}` : "0"}
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-cyan-300 mt-2.5 truncate w-full max-w-[120px]">
                                    {topTruthKing?.name || "-"}
                                </span>
                            </div>
                        </div>

                        <div className="bg-[#120818]/30 border border-purple-500/15 rounded-2xl p-4 flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-purple-500/30 bg-black/40 flex items-center justify-center">
                                    {hostAvatarUrl ? (
                                        <img src={hostAvatarUrl} alt={hostName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl">🎭</span>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-base">{hostName}</h4>
                                    <span className="text-xs text-purple-400 font-bold uppercase tracking-widest">HOST</span>
                                </div>
                            </div>
                            {sessionInfo && (
                                <div className="space-y-1">
                                    <h5 className="font-bold text-sm text-white">{sessionInfo.title}</h5>
                                    <p className="text-xs text-white/60 leading-relaxed">{sessionInfo.desc}</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-amber-400" />
                                <div>
                                    <h5 className="text-xs text-gray-500 uppercase font-black">My Balance</h5>
                                    <div className="mt-0.5">
                                        <WalletPill />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>Invite Friend</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile Tab Bar */}
            <div className="lg:hidden">
                <MobileStudioTabs
                    tabs={mappedTabs}
                    activeTab={mobileTab}
                    onTabChange={setMobileTab}
                    accentHsl="320, 100%, 65%"
                />
            </div>
            <AnimatePresence>
                {/* 1. Confirmation Modal */}
                {confirmModal && confirmModal.isOpen && (
                    <motion.div
                        key="confirm-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-xs bg-gray-900 border border-pink-500/50 rounded-2xl p-4 shadow-2xl relative overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${confirmModal.type === 'tip' ? 'from-green-500 to-emerald-400' : 'from-pink-500 to-purple-600'}`}></div>
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="text-center space-y-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-1 ${confirmModal.type === 'tip' ? 'bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : confirmModal.type === 'reaction' ? 'bg-purple-500/20' : 'bg-pink-500/20'}`}>
                                    {confirmModal.type === 'tip' ? (
                                        <TrendingUp className="w-6 h-6 text-green-400" />
                                    ) : confirmModal.type === 'reaction' ? (
                                        <div className="text-2xl">
                                            {confirmModal.tier === 'Kiss' ? '💋' : confirmModal.tier === 'Love' ? '❤️' : confirmModal.tier === 'Spicy' ? '🔥' : '🖤'}
                                        </div>
                                    ) : (
                                        <Crown className="w-6 h-6 text-pink-400" />
                                    )}
                                </div>

                                    <h3 className="text-base font-bold text-white">
                                        {confirmModal.type === 'tip' ? 'Send a Tip' : confirmModal.type === 'reaction' ? 'Send Reaction' : 'Confirm Interaction'}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {confirmModal.type === 'tip' ? (
                                            <>Show some love to the creators!</>
                                        ) : confirmModal.type === 'reaction' ? (
                                            <>You are about to send a <span className="text-pink-300 font-bold uppercase">{confirmModal.tier}</span> reaction.</>
                                        ) : (
                                            <>You are about to send a <span className="text-pink-300 font-bold uppercase">{confirmModal.tier || "Custom"} {confirmModal.type.split('_')[1]}</span>.</>
                                        )}
                                    </p>

                                <div className={`p-3 rounded-xl border ${confirmModal.type === 'tip' ? 'bg-green-950/30 border-green-500/30' : 'bg-black/40 border-white/10'}`}>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Total Cost</div>
                                    <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${confirmModal.type === 'tip' ? 'text-green-400' : 'text-white'}`}>
                                        <span className={confirmModal.type === 'tip' ? 'text-green-600' : 'text-pink-500'}>{cs()}</span>{confirmModal.price}
                                    </div>
                                </div>

                                <button
                                    onClick={processPayment}
                                    disabled={isSubmitting}
                                    className={`w-full py-2.5 rounded-xl font-bold text-sm shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${confirmModal.type === 'tip'
                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-900/40'
                                        : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-pink-900/40'
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <>Processing...</>
                                    ) : (
                                        <>Confirm & Pay</>
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-500">Funds will be deducted from your wallet immediately.</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* 2. Result Reveal Modal - Apple Liquid Glass Style */}
                {resultModal && resultModal.isOpen && (
                    <motion.div
                        key="result-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4"
                        onClick={() => setResultModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-[280px] overflow-hidden"
                        >
                            {/* Liquid Glass Container */}
                            <div
                                className={`
                                    relative rounded-2xl p-4 
                                    bg-gradient-to-br 
                                    ${resultModal.success
                                        ? 'from-white/20 via-white/10 to-white/5'
                                        : 'from-red-500/20 via-red-500/10 to-red-500/5'
                                    }
                                    backdrop-blur-2xl
                                    border border-white/20
                                    shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]
                                `}
                            >
                                {/* Inner glow effect */}
                                <div className={`
                                    absolute inset-0 rounded-3xl opacity-60
                                    ${resultModal.success
                                        ? 'bg-gradient-to-t from-emerald-500/20 via-transparent to-transparent'
                                        : 'bg-gradient-to-t from-red-500/20 via-transparent to-transparent'
                                    }
                                `} />

                                {/* Content */}
                                <div className="relative z-10 flex flex-col items-center text-center">
                                    {/* Success/Error Icon */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
                                        className={`
                                            w-11 h-11 rounded-full flex items-center justify-center mb-3
                                            ${resultModal.success
                                                ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-[0_4px_20px_rgba(52,211,153,0.5)]'
                                                : 'bg-gradient-to-br from-red-400 to-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.5)]'
                                            }
                                        `}
                                    >
                                        {resultModal.success ? (
                                            resultModal.type === 'tip' ? (
                                                <TrendingUp className="w-5 h-5 text-white" />
                                            ) : (
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )
                                        ) : (
                                            <X className="w-5 h-5 text-white" />
                                        )}
                                    </motion.div>

                                    {/* Status Label */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 }}
                                        className={`
                                            text-[10px] font-semibold tracking-widest uppercase mb-1.5
                                            ${resultModal.success ? 'text-emerald-400' : 'text-red-400'}
                                        `}
                                    >
                                        {resultModal.success
                                            ? (resultModal.type === 'tip' ? 'Tip Sent' : 'Success')
                                            : 'Failed'
                                        }
                                    </motion.div>

                                    {/* Message */}
                                    <motion.h2
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-sm font-semibold text-white/90 leading-snug mb-3"
                                    >
                                        {resultModal.type === 'tip' && resultModal.success
                                            ? "Thanks for your support!"
                                            : resultModal.message
                                        }
                                    </motion.h2>

                                    {/* Preview Content */}
                                    {resultModal.success && resultModal.content && ['system_truth', 'system_dare', 'custom_truth', 'custom_dare'].includes(resultModal.type || '') && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="w-full bg-black/40 backdrop-blur-xl rounded-xl p-3 border border-white/10 mb-4 text-left"
                                        >
                                            <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Preview (Sent to Creator)</div>
                                            <p className="text-xs text-white/90 italic">"{resultModal.content}"</p>
                                        </motion.div>
                                    )}

                                    {/* Close Button */}
                                    <motion.button
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setResultModal(null)}
                                        className={`
                                            w-full py-2.5 rounded-xl font-medium text-sm
                                            transition-all duration-200
                                            ${resultModal.success
                                                ? 'bg-white/90 hover:bg-white text-gray-900 shadow-[0_2px_12px_rgba(255,255,255,0.3)]'
                                                : 'bg-white/20 hover:bg-white/30 text-white border border-white/10'
                                            }
                                        `}
                                    >
                                        Close & Continue
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Question Countdown & Reveal */}
            {
                showCountdown && userId && roomId && countdownRequest && (
                    <QuestionCountdown
                        roomId={roomId}
                        userId={userId}
                        initialRequest={countdownRequest}
                        onClose={() => {
                            setShowCountdown(false);
                            setCountdownRequest(null);
                        }}
                    />
                )
            }

            {/* Overlay */}
            <InteractionOverlay
                prompt={overlayPrompt}
                isVisible={showOverlay}
                onClose={() => setShowOverlay(false)}
            />

            {/* Fan Answer Notification Modal */}
            <FanAnswerModal
                notification={answerNotification}
                onClose={() => setAnswerNotification(null)}
            />

            {/* Invite Modal */}
            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                roomId={roomId}
            />

            {/* Invitation Popup (receiver side) */}
            <InvitationPopup />

            {/* Group Call Fan Modal */}
            {groupCall.callState && (
                <GroupCallFanModal
                    callState={groupCall.callState}
                    userId={userId || ""}
                    userName={userName || "You"}
                    onAcceptCall={groupCall.acceptCall}
                    onDeclineCall={groupCall.declineCall}
                    onDismiss={groupCall.dismiss}
                />
            )}

            {/* Per-minute billing overlay */}
            <BillingOverlay
                sessionId={sessionId}
                accentHsl="280, 80%, 60%"
                exitRoute="/home"
            />

        </div >
    );
}

export default function TruthOrDareRoom() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Room...</div>}>
            <TruthOrDareContent />
        </Suspense>
    );
}
