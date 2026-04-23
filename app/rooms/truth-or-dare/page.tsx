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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import BrandLogo from "@/components/common/BrandLogo";
import RoomRequestManager from "@/components/rooms/RoomRequestManager"; // New Component
import InteractionOverlay, { OverlayPrompt } from "@/components/rooms/InteractionOverlay";
import { playNotificationSound, playSuccessSound, playErrorSound, playMoneySound } from "@/utils/sounds"; // Added playNotificationSound, playMoneySound
import GroupVotePanel from "@/components/rooms/GroupVotePanel"; // Added GroupVotePanel
import WalletPill from "@/components/common/WalletPill";
import InviteModal from "@/components/rooms/InviteModal";
import InvitationPopup from "@/components/rooms/InvitationPopup";

// import AgoraProvider, { createAgoraClient } from "@/components/providers/AgoraProvider"; // Removed
// import FanStream from "@/components/rooms/FanStream"; // Removed

import dynamic from 'next/dynamic';
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

function TruthOrDareContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();
    const roomId = searchParams.get("roomId");

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
    const [sessionStatus, setSessionStatus] = useState<'active' | 'ended' | 'loading'>('loading');
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
    const [userName, setUserName] = useState<string>('Anonymous');
    const [userAvatar, setUserAvatar] = useState<string | null>(null);

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
    } | null>(null);

    const [overlayPrompt, setOverlayPrompt] = useState<OverlayPrompt | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [showCountdown, setShowCountdown] = useState(false);
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

    const [creatorCount] = useState(1);
    const [fanCount, setFanCount] = useState(0);

    // Load Session Data
    useEffect(() => {
        if (!roomId) return;

        async function checkAccess() {
            try {
                // 1. Get Game State
                const { data: game, error: gameError } = await supabase
                    .from('truth_dare_games')
                    .select(`*, room:rooms(host_id)`)
                    .eq('room_id', roomId)
                    .maybeSingle();

                if (gameError || !game || game.status !== 'active') {
                    console.warn("Session ended or not found", gameError);
                    setSessionStatus('ended');
                    setLoading(false);
                    return;
                }

                setSessionStatus('active');
                setHostId(game.room?.host_id);
                setSessionInfo({
                    title: game.session_title || "Truth or Dare",
                    desc: game.session_description,
                    price: Number(game.unlock_price),
                    isPrivate: game.is_private
                });

                // Fetch host profile for avatar
                if (game.room?.host_id) {
                    const { data: hostProfile } = await supabase
                        .from('profiles')
                        .select('avatar_url, full_name, username')
                        .eq('id', game.room.host_id)
                        .single();

                    if (hostProfile) {
                        setHostAvatarUrl(hostProfile.avatar_url);
                        setHostName(hostProfile.full_name || hostProfile.username || 'Creator');
                    }
                }

                // 2. Check Access
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    setUserId(user.id);

                    // Fetch profile for presence
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, username, avatar_url')
                        .eq('id', user.id)
                        .single();

                    if (profile) {
                        setUserName(profile.full_name || profile.username || user.email?.split('@')[0] || 'Anonymous');
                        setUserAvatar(profile.avatar_url);
                    }

                    // A. Check Payment (Unlocks table + Entries table) - Valid for both Public and Private
                    const { data: unlock } = await supabase
                        .from('truth_dare_unlocks')
                        .select('id')
                        .eq('room_id', roomId)
                        .eq('fan_id', user.id)
                        .maybeSingle();

                    if (unlock) {
                        console.log("Access Granted: User has paid (unlocks).");
                        setAccess('granted');
                        return; // Done
                    }

                    // Also check truth_dare_entries (new entry fee table)
                    const { data: entry } = await supabase
                        .from('truth_dare_entries')
                        .select('id')
                        .eq('room_id', roomId)
                        .eq('fan_id', user.id)
                        .maybeSingle();

                    if (entry) {
                        console.log("Access Granted: User has paid (entries).");
                        setAccess('granted');
                        return; // Done
                    }

                    // B. If Private, check Request Status
                    if (game.is_private) {
                        // Get active session for this room to query join requests
                        const { data: activeSession } = await supabase
                            .from('truth_dare_sessions')
                            .select('id')
                            .eq('room_id', roomId)
                            .eq('status', 'active')
                            .order('started_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (activeSession) {
                            const { data: req } = await supabase
                                .from('room_join_requests')
                                .select('status')
                                .eq('session_id', activeSession.id)
                                .eq('user_id', user.id)
                                .maybeSingle();

                            if (req) {
                                setRequestStatus(req.status as any);
                            } else {
                                setRequestStatus('none');
                            }
                        } else {
                            setRequestStatus('none');
                        }
                    } else {
                        // Public Room: Auto-approve request logic for payment flow
                        setRequestStatus('approved');
                    }
                } else {
                    console.log("Access Locked: No user.");
                }

                // Default: Locked
                setAccess('locked');

            } catch (e) {
                console.error("checkAccess failed", e);
                // If error, keep loading or show error, do not expose content
                setSessionStatus('ended'); // Safest fallback
            } finally {
                setLoading(false);
            }
        }
        checkAccess();
    }, [roomId, supabase]);

    // Realtime Status Updates
    useEffect(() => {
        if (!roomId) return;

        const gameStatusChannel = supabase.channel(`room_status_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_games', filter: `room_id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData.status === 'ended') {
                    setSessionStatus('ended');
                } else if (newData.status === 'active') {
                    setSessionStatus('active');
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
            })
            .on('broadcast', { event: 'countdown_start' }, (payload) => {
                // Check if this is for the current user
                if (payload.payload?.fanId === userId) {
                    console.log('⏱️ Countdown started for my request:', payload.payload);
                    // The showCountdown state is already triggered in processPayment
                    // This is a backup sync mechanism
                    setShowCountdown(true);
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
            })
            .on('broadcast', { event: 'tip_event' }, (payload) => {
                const tipData = payload.payload;
                if (tipData && tipData.userId !== userId) {
                    // Show toast for other fans' tips
                    toast(`🎉 ${tipData.userName} tipped €${tipData.amount}!`, {
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
            .subscribe();

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

        // Live Chat — fetch existing + subscribe to new messages
        const fetchChatMessages = async () => {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('id, room_id, user_id, username, message, created_at')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })
                .limit(100);

            if (data && !error) {
                setChatMessages(data);
            }
            setTimeout(scrollChatToBottom, 150);
        };
        fetchChatMessages();

        const chatChannel = supabase
            .channel(`fan-chat-${roomId}`)
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
                    setChatMessages((prev) => [...prev, newMsg]);
                    setTimeout(scrollChatToBottom, 100);
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
    }, [roomId, userId, userName, userAvatar, supabase, scrollChatToBottom]);

    // Calculate and subscribe to Top Spenders (Truth King / Dare King)
    useEffect(() => {
        if (!roomId) return;

        const calculateTopSpenders = async () => {
            try {
                // Fetch all requests for this room with spending data
                const { data: requests, error } = await supabase
                    .from('truth_dare_requests')
                    .select('fan_id, fan_name, type, amount')
                    .eq('room_id', roomId);

                if (error || !requests || requests.length === 0) {
                    // No requests yet - show default
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
                }

                if (topTruth) {
                    const avatar = await fetchAvatar(topTruth.id);
                    setTopTruthKing({ name: topTruth.name, avatar, total: topTruth.total });
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
    }, [roomId, supabase]);

    // Chat send handler
    const handleChatSend = async () => {
        if (!chatInput.trim() || !roomId || !userId || chatSending) return;
        setChatSending(true);

        const { error } = await supabase.from('chat_messages').insert({
            room_id: roomId,
            user_id: userId,
            username: userName,
            message: chatInput.trim(),
        });

        if (error) {
            toast.error('Failed to send message');
        } else {
            setChatInput('');
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
            // Look up the active session for this room
            const { data: activeSession } = await supabase
                .from('truth_dare_sessions')
                .select('id')
                .eq('room_id', roomId)
                .eq('status', 'active')
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
                amount: confirmModal.price
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

                // Update resultModal based on the new structure
                setResultModal({
                    isOpen: true,
                    success: true,
                    message: data.message || "Your request was sent successfully!",
                    type: confirmModal.type
                });

                setCustomText("");
                setCustomType(null);
                setSelectedTier(null);

                // Show countdown for system truth/dare purchases
                if (confirmModal.type === 'system_truth' || confirmModal.type === 'system_dare') {
                    setShowCountdown(true);
                }

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
            } else {
                setLastAction(`Error: ${data.error || "Failed to send"}`);
                setResultModal({
                    isOpen: true,
                    success: false,
                    message: data.error || "Failed to send your request."
                });
            }
        } catch (e) {
            setLastAction("Network error. Please try again.");
            setResultModal({
                isOpen: true,
                success: false,
                message: "Network error. Please try again."
            });
        } finally {
            setIsSubmitting(false);
        }
    }


    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-pink-500">Checking access...</div>;

    if (sessionStatus === 'ended' && roomId) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="text-xl font-bold mb-2">Session Ended</div>
                <p className="text-gray-400 mb-6">This Truth or Dare session is no longer active.</p>
                <button onClick={onBack} className="px-6 py-2 bg-pink-600 rounded-xl">Back to Home</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Host Tools: Request Manager (Private Rooms) */}
            {userId && hostId && userId === hostId && sessionInfo?.isPrivate && (
                <RoomRequestManager roomId={roomId!} />
            )}

            {/* Header - Minimal Style matching screenshot */}
            <div className="relative z-50 pt-4 pb-0 px-6 flex items-center justify-between">
                <div className="pointer-events-auto flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-md"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <BrandLogo showBadge={false} />
                </div>
                {/* Invite + Wallet */}
                <div className="pointer-events-auto flex items-center gap-3">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="p-2 rounded-full border border-pink-500/30 bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 transition-all hover:scale-105 backdrop-blur-md flex items-center gap-1.5 px-3"
                        title="Invite Friends"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span className="text-xs font-bold hidden sm:inline">Invite</span>
                    </button>
                    <WalletPill />
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
                                <div className="text-2xl font-bold text-purple-300">€{sessionInfo.price}</div>
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

            <main className="relative z-10 pt-0 p-4 lg:p-6 lg:pt-2 max-w-[1600px] mx-auto">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Left: Stream + Prompts */}
                    <div className="flex flex-col gap-4 flex-1 lg:flex-[2]">
                        <div className={`grid gap-4 ${creatorCount === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {Array.from({ length: creatorCount }).map((_, i) => (
                                <div
                                    key={`creator-${i}`}
                                    className="relative rounded-3xl border border-white/10 aspect-video flex items-center justify-center bg-gray-950/40 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md"
                                >
                                    {i === 0 && roomId ? (
                                        <LiveStreamWrapper
                                            role="fan"
                                            appId={APP_ID}
                                            roomId={roomId}
                                            uid={userId || 0}
                                            hostId={hostId || 0}
                                            hostAvatarUrl={hostAvatarUrl}
                                            hostName={hostName}
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
                            ))}
                        </div>

                        {/* Prompt Section - 3 columns as in screenshot */}
                        <div className="glass-panel p-4 border-white/10 bg-white/5">

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Col 1: System Dares (now on left) */}
                                <div className="space-y-4">
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
                                                <span className="text-base font-bold text-white">€{t.price}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Col 2: System Truths (now on right) */}
                                <div className="space-y-4">
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
                                                <span className="text-base font-bold text-white">€{t.price}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Col 3: Custom Requests */}
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-bold text-purple-400 uppercase tracking-widest pb-2 px-2 bg-purple-500/5 rounded-t-lg" style={{ textShadow: '0 0 10px rgba(168,85,247,0.6), 0 0 30px rgba(168,85,247,0.3)' }}>Custom Requests</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCustomType("truth")}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${customType === "truth" ? "bg-blue-600/50 shadow-[0_0_20px_rgba(59,130,246,0.5)] text-white scale-105" : "bg-blue-900/10 text-blue-400/70 hover:bg-blue-500/10"}`}
                                        >
                                            Custom Truth (€25)
                                        </button>
                                        <button
                                            onClick={() => setCustomType("dare")}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${customType === "dare" ? "bg-red-600/50 shadow-[0_0_20px_rgba(239,68,68,0.5)] text-white scale-105" : "bg-red-900/10 text-red-400/70 hover:bg-red-500/10"}`}
                                        >
                                            Custom Dare (€35)
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
                    <div className="flex flex-col gap-4 w-full lg:w-[320px]">
                        {/* Profiles */}
                        <div className="flex gap-3">
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
                        <div className="glass-panel p-4 flex justify-between gap-2 border-white/10 bg-black/20">
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
                                        <span className="text-[8px] font-bold text-white/50">€{r.price}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Tip Creator Section */}
                        <div className="glass-panel p-4 border-white/10 bg-black/20">
                            <div className="flex items-center gap-2 mb-3">
                                <Send className="w-4 h-4 text-green-400" />
                                <h3 className="text-sm font-semibold text-white tracking-wide">Tip Creator</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {TIP_AMOUNTS.map((amount) => (
                                    <button
                                        key={`tip-${amount}`}
                                        disabled={isSubmitting}
                                        onClick={() => openConfirmation('tip', `€${amount}`, `Tip €${amount}`, amount)}
                                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/40 transition-all group hover:scale-105 shadow-[0_0_8px_rgba(34,197,94,0.15)] hover:shadow-[0_0_16px_rgba(34,197,94,0.3)]"
                                    >
                                        <span className="text-lg group-hover:scale-110 transition-transform">💰</span>
                                        <span className="text-[10px] font-bold text-green-300">€{amount}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-gray-500 text-center mt-2">Show your appreciation — tips go directly to the creator</p>
                        </div>

                        {/* Group Voting Section — wired with GroupVotePanel */}
                        {roomId && (
                            <GroupVotePanel
                                roomId={roomId}
                                currentUserId={userId || undefined}
                            />
                        )}
                    </div>

                    {/* Right: Dedicated Chat Column */}
                    <div className="flex flex-col gap-4 w-full lg:w-[380px]">
                        <div className="glass-panel border-white/10 bg-white/5 flex flex-col h-[700px] lg:h-[800px] overflow-hidden">
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
                                    <button
                                        onClick={handleChatSend}
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
                                        <span className={confirmModal.type === 'tip' ? 'text-green-600' : 'text-pink-500'}>€</span>{confirmModal.price}
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
                showCountdown && userId && roomId && (
                    <QuestionCountdown
                        roomId={roomId}
                        userId={userId}
                        onClose={() => setShowCountdown(false)}
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
