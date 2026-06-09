"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, ArrowLeft, Bell, Clock, Zap, X, Plus, Star, Gift, PhoneCall, Flame, Loader2, CheckCircle2, Lock, Eye, Video, Image as ImageIcon, ExternalLink, Heart, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import dynamic from "next/dynamic";
import SugaLogo from "@/components/rooms/suga4u/SugaLogo";
import BrandLogo from "@/components/common/BrandLogo";
import UserProfile from "@/components/rooms/suga4u/UserProfile";
import S4uGroupVotePanel from "@/components/rooms/suga4u/S4uGroupVotePanel";
import CreatorSecrets from "@/components/rooms/suga4u/CreatorSecrets";
import LiveChat from "@/components/rooms/suga4u/LiveChat";
import CreatorFavorites from "@/components/rooms/suga4u/CreatorFavorites";
import PaidRequestMenu from "@/components/rooms/suga4u/PaidRequestMenu";
import SendSugarGifts from "@/components/rooms/suga4u/SendSugarGifts";
import QuickPaidActions from "@/components/rooms/suga4u/QuickPaidActions";
import InviteModal from "@/components/rooms/InviteModal";
import InvitationPopup from "@/components/rooms/InvitationPopup";
import WalletPill from "@/components/common/WalletPill";
import PrivateCallFanModal from "@/components/rooms/suga4u/PrivateCallFanModal";
import { usePrivateCall } from "@/hooks/usePrivateCall";
import { toast } from "sonner";
import { useGroupCall } from "@/hooks/useGroupCall";
import GroupCallFanModal from "@/components/rooms/truth-or-dare/GroupCallFanModal";
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";
import { MessageSquare } from "lucide-react";
import { useAvatarMap } from "@/hooks/useAvatarMap";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";

const SUGA4U_FAN_TABS: MobileStudioTab[] = [
    { id: "chat", label: "Chat", icon: <MessageSquare className="w-5 h-5" /> },
    { id: "requests", label: "Requests", icon: <Gift className="w-5 h-5" /> },
    { id: "secrets", label: "Secrets", icon: <Lock className="w-5 h-5" /> },
    { id: "info", label: "Info", icon: <UserPlus className="w-5 h-5" /> },
];

import { useSuga4U, CreatorFavorite, CreatorSecret } from "@/hooks/useSuga4U";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import CustomRequestModal from "@/components/rooms/suga4u/CustomRequestModal";

import { createClient } from "@/utils/supabase/client";
import { cs } from "@/utils/currency";
import RoomTourHelpButton from "@/components/rooms/shared/RoomTourHelpButton";
import { useGuidedTour } from "@/components/guided-tour/GuidedTourProvider";
import { getSugaIcon, getSugaGlowClass, getSugaIconContainerClass, getSugaCyberpunkStyle } from "@/utils/suga/sugaIcons";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || undefined;

const Suga4URoom = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlRoomId = searchParams.get("roomId");
    const urlSessionId = searchParams.get("sessionId");
    const { user } = useAuth();
    const supabase = createClient();
    const [roomId, setRoomId] = React.useState<string | null>(null);
    const [hostId, setHostId] = React.useState<string | null>(null);
    const [hostAvatar, setHostAvatar] = React.useState<string | null>(null);
    const [hostName, setHostName] = React.useState("Alexis Rose");
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [isMobile, setIsMobile] = useState<boolean | null>(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Incoming activity state
    const [showIncomingPanel, setShowIncomingPanel] = useState(false);
    const [incomingItems, setIncomingItems] = useState<any[]>([]);
    const [unseenCount, setUnseenCount] = useState(0);
    const [previewMedia, setPreviewMedia] = useState<{ url: string; label: string } | null>(null);
    const [selectedResponse, setSelectedResponse] = useState<any | null>(null);

    // Private 1-on-1 call
    const privateCall = usePrivateCall(roomId, user?.id || null, "fan");

    // Group call (after vote campaign goal reached)
    const groupCall = useGroupCall(roomId, user?.id || null, "fan", "suga/group-vote");

    // Session Status Gating
    const [sessionStatus, setSessionStatus] = useState<string | null>(null);
    const [watcherCount, setWatcherCount] = useState<number>(0);

    // Watcher count fetcher & subscription
    useEffect(() => {
        if (!roomId) return;

        async function fetchWatcherCount() {
            const { data } = await supabase
                .from('room_participants')
                .select('user_id')
                .eq('room_id', roomId);
            const unique = new Set((data || []).map((p: any) => p.user_id).filter(Boolean));
            setWatcherCount(unique.size);
        }

        fetchWatcherCount();

        const channel = supabase
            .channel(`suga-participants-fan-${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'room_participants',
                filter: `room_id=eq.${roomId}`,
            }, () => {
                fetchWatcherCount();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, supabase]);

    const participantJoinedRef = useRef(false);
    useEffect(() => {
        if (!roomId || !user) return;

        const joinRoom = async () => {
            if (participantJoinedRef.current) return;
            const { error } = await supabase
                .from("room_participants")
                .insert({ room_id: roomId, user_id: user.id });
            if (error && error.code !== "23505") { // Ignore duplicate key
                console.error("Error joining room_participants:", error);
            } else {
                participantJoinedRef.current = true;
            }
        };

        joinRoom();

        return () => {
            if (!participantJoinedRef.current) return;
            supabase
                .from("room_participants")
                .delete()
                .match({ room_id: roomId, user_id: user.id })
                .then(() => { participantJoinedRef.current = false; });
        };
    }, [roomId, user, supabase]);

    // ── MOBILE LAYOUT STATE AND LOGIC INTEGRATIONS ─────────────────────────
    const suga = useSuga4U(roomId, urlSessionId);
    const fanIds = React.useMemo(() => suga.activity.map(a => a.fanId).filter(Boolean) as string[], [suga.activity]);
    const avatarMap = useAvatarMap(fanIds);
    const { balance, pay } = useWallet();

    const { activeTour, currentStep } = useGuidedTour();

    useEffect(() => {
        if (activeTour === "suga4u_fan") {
            if (currentStep === 3) setMobileTab("info");
            else if (currentStep === 4) setMobileTab("requests");
            else if (currentStep === 5) setMobileTab("requests");
            else if (currentStep === 6) setMobileTab("requests");
            else if (currentStep === 7) setMobileTab("secrets");
            else if (currentStep === 8) setMobileTab("secrets");
        }
    }, [activeTour, currentStep]);

    const [activeMobileFavTab, setActiveMobileFavTab] = useState("ALL");
    const [activeMobileSecTab, setActiveMobileSecTab] = useState("ALL");
    const [mobileTab, setMobileTab] = useState<string>("chat");
    const [chatUnread, setChatUnread] = useState(0);
    const [requestsUnread, setRequestsUnread] = useState(0);
    const [secretsUnread, setSecretsUnread] = useState(0);

    const activeTabRef = useRef(mobileTab);
    useEffect(() => {
        activeTabRef.current = mobileTab;
        if (mobileTab === "chat") setChatUnread(0);
        if (mobileTab === "requests") setRequestsUnread(0);
        if (mobileTab === "secrets") setSecretsUnread(0);
    }, [mobileTab]);

    const prevActivityLen = useRef(0);
    useEffect(() => {
        if (suga.activity.length > prevActivityLen.current) {
            if (prevActivityLen.current > 0 && activeTabRef.current !== "chat") {
                const added = suga.activity.slice(0, suga.activity.length - prevActivityLen.current);
                const newChats = added.filter(e => e.type === "CHAT").length;
                if (newChats > 0) {
                    setChatUnread(prev => prev + newChats);
                }
            }
        }
        prevActivityLen.current = suga.activity.length;
    }, [suga.activity]);

    const prevRequestsLen = useRef(0);
    useEffect(() => {
        if (suga.requests.length > prevRequestsLen.current) {
            if (prevRequestsLen.current > 0 && activeTabRef.current !== "requests") {
                setRequestsUnread(prev => prev + (suga.requests.length - prevRequestsLen.current));
            }
        }
        prevRequestsLen.current = suga.requests.length;
    }, [suga.requests]);

    const prevSecretsLen = useRef(0);
    useEffect(() => {
        if (suga.secrets.length > prevSecretsLen.current) {
            if (prevSecretsLen.current > 0 && activeTabRef.current !== "secrets") {
                setSecretsUnread(prev => prev + (suga.secrets.length - prevSecretsLen.current));
            }
        }
        prevSecretsLen.current = suga.secrets.length;
    }, [suga.secrets]);

    // Persisted revealed mobile favorites tracking
    const [revealedMobileFavIds, setRevealedMobileFavIds] = useState<Set<string>>(new Set());
    useEffect(() => {
        if (user?.id) {
            try {
                const stored = localStorage.getItem(`suga_unlocked_favs_${user.id}`);
                if (stored) {
                    setRevealedMobileFavIds(new Set(JSON.parse(stored)));
                }
            } catch (e) {
                console.error("Failed to parse stored favorites", e);
            }
        }
    }, [user?.id]);

    // Local unlocked mobile secrets tracking during this session
    const [unlockedMobileSecIds, setUnlockedMobileSecIds] = useState<Set<string>>(new Set());

    // Fetch unlocked secrets from transactions for mobile view
    useEffect(() => {
        if (!user || !roomId) return;
        const fetchUnlockedSecrets = async () => {
            try {
                const { data, error } = await supabase
                    .from('transactions')
                    .select('metadata')
                    .eq('user_id', user.id)
                    .eq('type', 'debit')
                    .eq('status', 'completed')
                    .eq('metadata->>related_type', 'suga_secret')
                    .eq('metadata->>room_id', roomId);
                
                if (error) throw error;
                
                if (data) {
                    const ids = data
                        .map(tx => tx.metadata?.related_id)
                        .filter(Boolean) as string[];
                    setUnlockedMobileSecIds(new Set(ids));
                }
            } catch (err) {
                console.error("Error fetching unlocked secrets:", err);
            }
        };
        fetchUnlockedSecrets();
    }, [user, roomId, supabase]);

    // Mobile popups / confirm modals
    const [confirmMobileFav, setConfirmMobileFav] = useState<{ item: CreatorFavorite; type: 'BUY' | 'REVEAL' } | null>(null);
    const [selectedMobileFav, setSelectedMobileFav] = useState<CreatorFavorite | null>(null);

    const [confirmMobileSecret, setConfirmMobileSecret] = useState<CreatorSecret | null>(null);
    const [selectedMobileSecretMedia, setSelectedMobileSecretMedia] = useState<CreatorSecret | null>(null);

    const [confirmMobileAction, setConfirmMobileAction] = useState<any | null>(null);
    const [customMobileAction, setCustomMobileAction] = useState<any | null>(null);

    // Mobile chat text input
    const [mobileChatInput, setMobileChatInput] = useState("");
    const mobileChatScrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll mobile chat
    useEffect(() => {
        if (mobileChatScrollRef.current) {
            mobileChatScrollRef.current.scrollTop = mobileChatScrollRef.current.scrollHeight;
        }
    }, [suga.activity]);

    // Group Goal subscription for Mobile Goal Footer
    const [groupVoteState, setGroupVoteState] = useState<any | null>(null);
    const [loadingMobileVote, setLoadingMobileVote] = useState(false);

    useEffect(() => {
        if (!roomId) return;
        const fetchInitialState = async () => {
            const { data } = await supabase.from('rooms').select('group_vote_state').eq('id', roomId).single();
            if (data?.group_vote_state) {
                setGroupVoteState(data.group_vote_state);
            }
        };
        fetchInitialState();

        const dbChannel = supabase.channel(`s4u-gv-updates-mobile-${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData.group_vote_state) {
                    setGroupVoteState(newData.group_vote_state);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(dbChannel);
        };
    }, [roomId, supabase]);

    // Mobile specific handlers
    const handleMobileChatSend = async () => {
        if (!mobileChatInput.trim()) return;
        try {
            const senderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            await suga.sendMessage(mobileChatInput, senderName, user?.id);
            setMobileChatInput("");
        } catch (err) {
            console.error("Failed to send message:", err);
        }
    };

    const handleMobileGiftClick = (g: { name: string; amount: number; emoji: React.ReactNode }) => {
        if (!roomId || !hostId) return;
        setConfirmMobileAction({
            type: 'GIFT',
            name: g.name,
            price: g.amount,
            emoji: g.emoji,
            description: `Send ${cs()}${g.amount} ${g.name} to the creator?`
        });
    };

    const handleMobileRequestClick = (r: { type: string; name: string; price: number; emoji: React.ReactNode; isCustomRequest: boolean }) => {
        if (!roomId || !hostId) return;
        if (r.isCustomRequest) {
            setCustomMobileAction(r);
        } else {
            setConfirmMobileAction({
                type: 'REQUEST',
                requestType: r.type,
                name: r.name,
                price: r.price,
                emoji: r.emoji,
                description: `Pay ${cs()}${r.price} to request ${r.name}?`
            });
        }
    };

    const handleConfirmMobileActionPayment = async () => {
        if (!roomId || !hostId || !confirmMobileAction) return;
        const action = confirmMobileAction;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";

            if (action.type === 'GIFT') {
                const payment = await pay(hostId, action.price, `Suga Gift: ${action.name}`, roomId, 'suga_gift');
                if (!payment.success) {
                    toast.error(payment.error || "Payment failed");
                    return;
                }
                await suga.createRequest("GIFT", action.name, `Sent ${action.name}`, action.price, fanName);
                toast.success(
                    <span className="flex items-center gap-1.5 font-semibold">
                        {action.emoji}
                        <span>Gift sent: {action.name}</span>
                    </span>,
                    { description: `${cs()}${action.price} sent to creator` }
                );
            } else if (action.type === 'REQUEST') {
                const payment = await pay(hostId, action.price, `Paid Request: ${action.name}`, roomId, 'suga_request');
                if (!payment.success) {
                    toast.error(payment.error || "Payment failed");
                    return;
                }
                await suga.createRequest(action.requestType, action.name, "Custom request from fan mobile view", action.price, fanName);
                toast.success(
                    <span className="flex items-center gap-1.5 font-semibold">
                        {action.emoji}
                        <span>Request sent: {action.name}</span>
                    </span>,
                    { description: `${cs()}${action.price} request submitted` }
                );
            } else if (action.type === 'PRIVATE_1ON1') {
                const payment = await pay(hostId, action.price, `Private 1-on-1 Call Request`, roomId, 'suga_request');
                if (!payment.success) {
                    toast.error(payment.error || "Payment failed");
                    return;
                }
                const result = await suga.createRequest("PRIVATE_1ON1", "Private 1-on-1", "Private 1-on-1 Video Call Request", action.price, fanName);
                const callResult = await privateCall.initiateCall(fanName, result?.request?.id);
                if (callResult) {
                    toast.success("👑 Private 1-on-1 requested!", { description: "Waiting for creator to accept..." });
                } else {
                    toast.error("Failed to initiate video call");
                }
            }
        } catch (err) {
            console.error("Failed to process payment:", err);
            toast.error("Failed to process action");
        } finally {
            setConfirmMobileAction(null);
        }
    };

    const handleConfirmMobileCustomAction = async (customText: string) => {
        if (!roomId || !hostId || !customMobileAction) return;
        const r = customMobileAction;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            const payment = await pay(hostId, r.price, `Custom Request: ${r.name}`, roomId, 'suga_request');
            if (!payment.success) {
                toast.error(payment.error || "Payment failed");
                return;
            }

            const res = await fetch(`/api/v1/rooms/${roomId}/suga/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: "ACTION",
                    label: r.name,
                    note: customText,
                    price: r.price,
                    fanName,
                    sessionId: urlSessionId || undefined,
                    customText,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed");

            toast.success(
                <span className="flex items-center gap-1.5 font-semibold">
                    {r.emoji}
                    <span>Custom request sent: {r.name}</span>
                </span>,
                { description: `${cs()}${r.price} — your message was delivered` }
            );
        } catch (err) {
            console.error("Failed to send custom request:", err);
            toast.error("Failed to send custom request");
        } finally {
            setCustomMobileAction(null);
        }
    };

    const handleMobileFavAction = async (item: CreatorFavorite, type: 'BUY' | 'REVEAL') => {
        if (!roomId || !hostId) return;
        setConfirmMobileFav({ item, type });
    };

    const handleConfirmMobileFavPayment = async () => {
        if (!confirmMobileFav || !roomId || !hostId) return;
        const { item, type } = confirmMobileFav;
        const amount = type === 'BUY' ? item.buy_price : (item.reveal_price || 0);
        const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
        const description = type === 'BUY' ? `Gifted "${item.name}" for her!` : `Revealed ${item.name}`;

        const result = await pay(hostId, amount, description, roomId, 'suga_favorite', item.id);
        if (!result.success) {
            toast.error(result.error || "Payment failed");
            throw new Error(result.error);
        }

        await suga.sendGift(amount, fanName, description, type === 'BUY' ? 'BUY_FOR_HER' : 'LINK_REVEAL', user?.id);

        setRevealedMobileFavIds(prev => {
            const next = new Set(prev).add(item.id);
            if (user?.id) {
                localStorage.setItem(`suga_unlocked_favs_${user.id}`, JSON.stringify(Array.from(next)));
            }
            return next;
        });

        if (type === 'REVEAL') {
            toast.success(`🔓 Revealed: ${item.name}`, { description: item.description || "Item details unlocked!" });
        } else {
            toast.success(`🎁 Bought "${item.name}" for her!`, { description: `${cs()}${amount} sent to creator` });
        }
        setConfirmMobileFav(null);
    };

    const handleMobileSecretUnlockPrompt = (s: CreatorSecret) => {
        if (!roomId || !hostId) return;
        setConfirmMobileSecret(s);
    };

    const handleConfirmMobileSecretPayment = async () => {
        if (!confirmMobileSecret || !roomId || !hostId) return;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            const result = await pay(hostId, confirmMobileSecret.unlock_price, `Unlocked Secret: ${confirmMobileSecret.name}`, roomId, 'suga_secret', confirmMobileSecret.id);
            if (!result.success) throw new Error(result.error);

            await suga.sendGift(confirmMobileSecret.unlock_price, fanName, `Unlocked Secret: ${confirmMobileSecret.name}`, 'SECRET_UNLOCK', user?.id);

            setUnlockedMobileSecIds(prev => new Set(prev).add(confirmMobileSecret.id));
            toast.success(`🔓 Secret unlocked: ${confirmMobileSecret.name}`, { description: confirmMobileSecret.description || `${cs()}${confirmMobileSecret.unlock_price} spent` });
            setConfirmMobileSecret(null);
        } catch (err: any) {
            console.error("Failed to unlock secret:", err);
            toast.error(err.message || "Failed to unlock secret");
        }
    };

    const handleMobileVote = async () => {
        if (loadingMobileVote || !roomId || !groupVoteState) return;
        setLoadingMobileVote(true);
        setGroupVoteState((prev: any) => prev ? { ...prev, current: prev.current + 1 } : null);

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/suga/group-vote/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Voted!`);
                if (data.newCount !== undefined) {
                    setGroupVoteState((prev: any) => prev ? { ...prev, current: data.newCount } : null);
                }
            } else {
                toast.error(data.error || "Failed to vote");
                setGroupVoteState((prev: any) => prev ? { ...prev, current: Math.max(0, prev.current - 1) } : null);
            }
        } catch (e) {
            toast.error("Network error");
            setGroupVoteState((prev: any) => prev ? { ...prev, current: Math.max(0, prev.current - 1) } : null);
        } finally {
            setLoadingMobileVote(false);
        }
    };
    // ── END MOBILE LAYOUT STATE AND LOGIC INTEGRATIONS ─────────────────────

    React.useEffect(() => {
        if (!roomId || !user) return;
        const fanName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Fan";
        const channel = supabase.channel(`toaster_fan_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'suga_paid_requests', filter: `room_id=eq.${roomId}` }, (payload: any) => {
                const r = payload.new;
                if (r.fan_name === fanName) {
                    if (r.status === 'accepted') {
                        toast.success(`Creator accepted your request: ${r.label} 🎉`, { duration: 5000 });
                    } else if (r.status === 'declined') {
                        toast.error(`Creator declined your request: ${r.label}`, { duration: 5000 });
                    }
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, user, supabase]);

    React.useEffect(() => {
        if (!urlSessionId) {
            setSessionStatus('active');
            return;
        }

        const fetchSessionStatus = async () => {
            const { data } = await supabase.from('room_sessions').select('status, live_started_at').eq('id', urlSessionId).single();
            if (data) {
                if (data.status === 'ended') setSessionStatus('ended');
                else if (!data.live_started_at) setSessionStatus('pending');
                else setSessionStatus('active');
            }
        };
        fetchSessionStatus();

        const channel = supabase.channel(`session-status-${urlSessionId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_sessions', filter: `id=eq.${urlSessionId}` }, (payload) => {
                const newData = payload.new;
                if (newData.status === 'ended') setSessionStatus('ended');
                else if (!newData.live_started_at) setSessionStatus('pending');
                else setSessionStatus('active');
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [urlSessionId, supabase]);

    React.useEffect(() => {
        async function fetchRoom() {
            if (urlSessionId) {
                const { data: session } = await supabase
                    .from("room_sessions")
                    .select("room_id, creator_id")
                    .eq("id", urlSessionId)
                    .single();

                if (session?.room_id) {
                    setRoomId(session.room_id);
                    setHostId(session.creator_id);
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username, full_name, avatar_url')
                        .eq('id', session.creator_id)
                        .single();

                    if (profile) {
                        setHostName(profile.full_name || profile.username || "Creator");
                        setHostAvatar(profile.avatar_url || null);
                    }
                    return;
                }
            }

            let query = supabase
                .from('rooms')
                .select('id, host_id')
                .eq('status', 'live')
                .eq('type', 'suga-4-u');

            if (urlRoomId) {
                query = query.eq('id', urlRoomId);
            } else {
                query = query.order('created_at', { ascending: false }).limit(1);
            }

            const { data: room } = await query.maybeSingle();

            if (room) {
                setRoomId(room.id);
                setHostId(room.host_id);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, full_name, avatar_url')
                    .eq('id', room.host_id)
                    .single();

                if (profile) {
                    setHostName(profile.full_name || profile.username || "Creator");
                    setHostAvatar(profile.avatar_url || null);
                }
            } else {
                setHostName("No Active Room");
            }
        }
        fetchRoom();
    }, [supabase, urlRoomId, urlSessionId]);

    useEffect(() => {
        if (!roomId || !user) return;

        const fetchIncoming = async () => {
            let query = supabase
                .from('suga_paid_requests')
                .select('*')
                .eq('room_id', roomId)
                .eq('fan_name', user.user_metadata?.full_name || user.email?.split('@')[0] || 'Fan')
                .neq('type', 'GIFT')
                .neq('type', 'TIP')
                .order('created_at', { ascending: false })
                .limit(20);

            if (urlSessionId) {
                const { data, error } = await query.eq('session_id', urlSessionId);
                if (error && error.message?.includes('session_id')) {
                    const { data: fallback } = await supabase
                        .from('suga_paid_requests')
                        .select('*')
                        .eq('room_id', roomId)
                        .eq('fan_name', user.user_metadata?.full_name || user.email?.split('@')[0] || 'Fan')
                        .neq('type', 'GIFT')
                        .neq('type', 'TIP')
                        .order('created_at', { ascending: false })
                        .limit(20);
                    if (fallback) setIncomingItems(fallback);
                } else if (data) {
                    setIncomingItems(data);
                }
            } else {
                const { data } = await query;
                if (data) setIncomingItems(data);
            }
        };
        fetchIncoming();

        const channel = supabase
            .channel(`suga-fan-incoming-${roomId}-${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'suga_paid_requests',
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const item = payload.new as any;
                if (item.type === 'GIFT' || item.type === 'TIP') return;
                const fanName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Fan';
                if (item.fan_name !== fanName) return;
                setIncomingItems(prev => [item, ...prev].slice(0, 20));
                if (!showIncomingPanel) setUnseenCount(prev => prev + 1);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'suga_paid_requests',
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const updated = payload.new as any;
                if (updated.type === 'GIFT' || updated.type === 'TIP') return;
                const fanName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Fan';
                if (updated.fan_name !== fanName) return;
                setIncomingItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
                if (!showIncomingPanel) setUnseenCount(prev => prev + 1);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, user, supabase, showIncomingPanel, urlSessionId]);

    const toggleIncomingPanel = useCallback(() => {
        setShowIncomingPanel(prev => !prev);
        if (!showIncomingPanel) setUnseenCount(0);
    }, [showIncomingPanel]);

    const incomingTypeEmoji = (type: string) => {
        switch (type) {
            case 'shoutout': return '📢';
            case 'quick_tease': return '😘';
            case 'custom_clip': return '🎬';
            case 'say_my_name': return '💬';
            case 'voice_note': return '🎙️';
            case 'photo_drop': return '📸';
            case 'sponsor_room': return '💎';
            case 'private_1on1': return '🔒';
            case 'group_vote': return '🔥';
            case 'gift': return '🎁';
            default: return '⚡';
        }
    };

    const incomingStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': case 'completed': return { bg: 'hsla(140,60%,20%,0.3)', border: 'hsla(140,70%,45%,0.4)', text: 'hsl(140,70%,55%)' };
            case 'declined': case 'rejected': return { bg: 'hsla(0,60%,20%,0.3)', border: 'hsla(0,70%,55%,0.4)', text: 'hsl(0,70%,60%)' };
            case 'pending': return { bg: 'hsla(42,60%,20%,0.3)', border: 'hsla(42,90%,55%,0.4)', text: 'hsl(42,90%,55%)' };
            default: return { bg: 'hsla(340,40%,20%,0.2)', border: 'hsla(340,60%,45%,0.25)', text: 'hsl(340,20%,65%)' };
        }
    };

    const formatTimeAgo = (dateStr?: string) => {
        if (!dateStr) return '';
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    if (sessionStatus === 'pending') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative fd-suga4u-theme">
                <div className="absolute inset-0">
                    <img src="/rooms/suga4u/bg1.jpeg" alt="" className="w-full h-full object-cover" />
                    <div className="suga-background-overlay opacity-80" />
                </div>
                
                <button onClick={() => router.back()} className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all z-20">
                    <ArrowLeft size={18} />
                </button>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-gold/20 border-t-gold rounded-full animate-spin mb-8 shadow-[0_0_30px_hsl(42_90%_55%/0.4)]" />
                    <h1 className="text-2xl md:text-4xl font-black text-gold uppercase tracking-[0.2em] mb-3 text-center px-4 fd-font-tech" style={{ textShadow: '0 0 20px hsla(42, 90%, 55%, 0.5)' }}>
                        Waiting for Suga
                    </h1>
                    <p className="text-white/60 text-sm font-medium tracking-wide">
                        The session will begin shortly.
                    </p>
                </div>
            </div>
        );
    }

    if (sessionStatus === 'ended') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative fd-suga4u-theme">
                <div className="absolute inset-0">
                    <img src="/rooms/suga4u/bg1.jpeg" alt="" className="w-full h-full object-cover grayscale opacity-30" />
                    <div className="suga-background-overlay opacity-90" />
                </div>
                
                <div className="relative z-10 flex flex-col items-center bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-md">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
                        <span className="text-2xl">💔</span>
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-3 fd-font-tech">
                        Session Ended
                    </h1>
                    <p className="text-white/50 text-sm font-medium mb-8">
                        This session has concluded.
                    </p>
                    <button onClick={() => router.back()} className="px-8 py-3 rounded-xl bg-gold text-black font-bold tracking-widest uppercase hover:brightness-110 transition-all text-sm">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen relative fd-suga4u-theme text-foreground font-body overflow-hidden">
                {/* Full-screen background */}
                <div className="fixed inset-0 z-0">
                    <img src="/rooms/suga4u/bg1.jpeg" alt="" className="w-full h-full object-cover" />
                    <div className="suga-background-overlay" />
                </div>

                <div className="relative z-10 h-screen flex flex-col">
                    
                    {/* ── DESKTOP VIEW ── */}
                    <div className="hidden lg:flex flex-col p-3 lg:p-4 h-full min-h-0">
                        {/* Header */}
                        <header className="flex items-center justify-between mb-3 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => router.back()}
                                    className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md"
                                    title="Go back"
                                    data-tour="suga-fan-back-to-rooms"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="hover:opacity-80 transition-opacity cursor-pointer" onClick={() => router.push("/home")}>
                                        <BrandLogo showBadge={false} />
                                    </div>
                                    <div className="h-6 w-[1px] bg-white/20" />
                                    <div className="hover:opacity-80 transition-opacity cursor-pointer">
                                        <SugaLogo />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="btn-pink px-3.5 py-1.5 text-xs flex items-center gap-1.5 rounded-full transition-all hover:scale-105 shadow-lg shadow-pink-500/20"
                                    data-tour="suga-fan-invite"
                                >
                                    <UserPlus size={14} />
                                    Invite
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <RoomTourHelpButton tourType="suga4u_fan" accentHsl="340, 75%, 55%" />
                                <div className="relative" data-tour="suga-fan-incoming-from-creator">
                                    <button
                                        onClick={toggleIncomingPanel}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 backdrop-blur-md ${
                                            showIncomingPanel
                                                ? 'bg-pink-500/30 border border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                                                : 'bg-pink-500/15 border border-pink-500/30 hover:bg-pink-500/25 text-pink-300'
                                        }`}
                                    >
                                        <Bell className={`w-3.5 h-3.5 ${unseenCount > 0 ? 'animate-bounce' : ''}`} />
                                        <span className="hidden sm:inline">Incoming</span>
                                        {unseenCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-pink-500 text-white text-[10px] font-black px-1 shadow-[0_0_10px_rgba(236,72,153,0.5)]">
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
                                                className="absolute top-full right-0 mt-3 w-80 bg-[#16161e]/95 border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl z-[60]"
                                            >
                                                {/* Panel Header */}
                                                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                                            <Bell className="w-4 h-4 text-pink-400" />
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
                                                            <p className="text-[10px] text-white/25 mt-1">Your paid requests will appear here</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            {incomingItems.map((item) => {
                                                                const emoji = incomingTypeEmoji(item.type);
                                                                const sc = incomingStatusColor(item.status);
                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => {
                                                                            if (item.status === 'accepted') {
                                                                                setSelectedResponse(item);
                                                                                setShowIncomingPanel(false);
                                                                            }
                                                                        }}
                                                                        className={`flex flex-col gap-1.5 p-3 rounded-xl transition-all group ${
                                                                            item.status === 'accepted' ? 'cursor-pointer hover:bg-white/10' : 'hover:bg-white/5'
                                                                        }`}
                                                                        style={{
                                                                            background: `linear-gradient(90deg, ${sc.bg}, transparent)`,
                                                                            border: `1px solid ${sc.border}`
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-xl group-hover:scale-110 transition-transform">{emoji}</span>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                                    <span className="text-xs font-bold text-white truncate">
                                                                                        {item.label || item.type || 'Request'}
                                                                                    </span>
                                                                                    <span className="text-[10px] font-black text-pink-400">{cs()}{item.price || item.amount || 0}</span>
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
                                                                            </div>
                                                                        </div>

                                                                        {item.custom_text && (
                                                                            <div className="ml-8 bg-black/20 rounded-lg px-2.5 py-1.5 border-l-2 border-pink-500/30">
                                                                                <p className="text-[9px] text-pink-400/50 uppercase tracking-wider mb-0.5">Your Request</p>
                                                                                <p className="text-[10px] text-white/50 italic truncate">&quot;{item.custom_text}&quot;</p>
                                                                            </div>
                                                                        )}

                                                                        {item.status === 'accepted' && (item.response_text || item.response_media_url) && (
                                                                            <div className="ml-8 bg-emerald-500/5 rounded-lg px-2.5 py-1.5 border-l-2 border-emerald-500/30">
                                                                                <p className="text-[9px] text-emerald-400/60 uppercase tracking-wider mb-0.5">Creator Response</p>
                                                                                {item.response_text && (
                                                                                    <p className="text-[10px] text-white/60">{item.response_text}</p>
                                                                                )}
                                                                                {item.response_media_url && (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setPreviewMedia({ url: item.response_media_url, label: item.label || 'Response' });
                                                                                        }}
                                                                                        className="mt-1.5 w-full rounded-lg overflow-hidden border border-emerald-500/20 hover:border-emerald-400/40 transition-all cursor-pointer bg-transparent p-0 text-left group/media"
                                                                                    >
                                                                                        {item.response_media_url.match(/\.(mp4|webm|mov|avi)$/i) || item.response_media_url.includes('video') ? (
                                                                                            <div className="w-full h-20 bg-black/40 flex items-center justify-center relative">
                                                                                                <span className="text-2xl">▶️</span>
                                                                                                <span className="absolute bottom-1 right-1.5 text-[8px] bg-black/60 text-white/60 px-1.5 py-0.5 rounded">VIDEO</span>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <img
                                                                                                src={item.response_media_url}
                                                                                                alt="Creator media"
                                                                                                className="w-full h-20 object-cover group-hover/media:brightness-110 transition-all"
                                                                                            />
                                                                                        )}
                                                                                        <div className="px-2 py-1 bg-emerald-500/10 flex items-center gap-1">
                                                                                            <span className="text-[9px] text-emerald-400 font-medium">📎 Tap to view</span>
                                                                                        </div>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {!item.custom_text && item.note && (
                                                                            <p className="text-[10px] text-white/40 ml-8 italic truncate">&quot;{item.note}&quot;</p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                                                    <p className="text-[9px] text-white/30 uppercase tracking-widest">Powered by PlaygroundX</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <WalletPill />
                                <div data-tour="suga-fan-creator-info">
                                    <UserProfile name={hostName} avatarUrl={hostAvatar} hostId={hostId} />
                                </div>
                            </div>
                        </header>

                        {/* Main Layout matching wireframe */}
                        <div className="grid grid-cols-1 lg:grid-cols-[55%_1fr_280px] gap-3 flex-1 min-h-0">
                            {/* LEFT: Video (top) + Secrets & Favorites (bottom) */}
                            <div className="flex flex-col gap-3 min-h-0">
                                <div className="flex-[1.6] min-h-0">
                                    <div className="glass-panel overflow-hidden flex flex-col h-full bg-transparent border-gold/20">
                                        <div className="relative flex-1 min-h-[200px]">
                                            {roomId && user && hostId && isMobile === false ? (
                                                <LiveStreamWrapper
                                                    role="fan"
                                                    appId={APP_ID}
                                                    roomId={roomId}
                                                    uid={user.id}
                                                    hostId={hostId}
                                                    hostAvatarUrl={hostAvatar || ""}
                                                    hostName={hostName}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-black/30 text-white/40 text-sm">
                                                    {roomId ? "Connecting to stream..." : "No active session"}
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3 flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push("/home")}
                                                    className="flex items-center justify-center w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 transition-all cursor-pointer"
                                                    title="Go back"
                                                >
                                                    <ArrowLeft size={16} className="text-white" />
                                                </button>
                                                <div className="flex items-center gap-1.5 bg-background/70 backdrop-blur-sm px-3 py-1 rounded-full">
                                                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-glow" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Live</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-[1fr_1.5fr] gap-3 min-h-0">
                                    <div data-tour="suga-fan-creator-secrets">
                                        <CreatorSecrets roomId={roomId} hostId={hostId} sessionId={urlSessionId} />
                                    </div>
                                    <div data-tour="suga-fan-creator-favorites">
                                        <CreatorFavorites roomId={roomId} hostId={hostId} sessionId={urlSessionId} />
                                    </div>
                                </div>
                            </div>

                            {/* MIDDLE: Live Chat */}
                            <div className="flex flex-col min-h-0">
                                <LiveChat roomId={roomId} sessionId={urlSessionId} />
                            </div>

                            {/* RIGHT: Options */}
                            <div className="flex flex-col gap-3 min-h-0 overflow-y-auto chat-scroll">
                                <div data-tour="suga-fan-paid-requests">
                                    <PaidRequestMenu roomId={roomId} hostId={hostId} sessionId={urlSessionId} />
                                </div>
                                <div data-tour="suga-fan-send-gifts">
                                    <SendSugarGifts roomId={roomId} hostId={hostId} sessionId={urlSessionId} />
                                </div>
                                <div data-tour="suga-fan-special-actions">
                                    <QuickPaidActions
                                        roomId={roomId}
                                        hostId={hostId}
                                        sessionId={urlSessionId}
                                        initiatePrivateCall={privateCall.initiateCall}
                                    />
                                </div>
                                <div data-tour="suga-fan-group-votes">
                                    <S4uGroupVotePanel roomId={roomId} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── MOBILE VIEW ── */}
                    <div className="flex lg:hidden flex-col h-full overflow-hidden bg-[#0a0209] text-white relative select-none">
                        
                        {/* Mobile Header */}
                        <header className="flex items-center justify-between px-4 py-3 bg-[#110113]/90 border-b border-pink-500/10 backdrop-blur-md shrink-0 z-50">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => router.back()}
                                    className="w-9 h-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                
                                <div className="flex items-center gap-2.5">
                                    <div className="relative">
                                        <div className="absolute -inset-0.5 rounded-full bg-pink-500/50 opacity-75 blur-[2px] animate-pulse" />
                                        {hostAvatar ? (
                                            <img
                                                src={hostAvatar}
                                                alt={hostName}
                                                className="relative w-9 h-9 rounded-full object-cover border border-pink-500/80"
                                            />
                                        ) : (
                                            <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center border border-pink-500/80 text-[11px] font-black text-white">
                                                {hostName ? hostName.slice(0, 2).toUpperCase() : "SU"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <h1 className="font-extrabold text-sm text-white tracking-wide truncate max-w-[120px] uppercase font-sans">
                                                {hostName}
                                            </h1>
                                            <span className="flex items-center gap-0.5 bg-pink-500/20 text-pink-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm border border-pink-500/30 animate-pulse uppercase tracking-wider">
                                                LIVE
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-bold text-yellow-500/70 tracking-wider uppercase truncate max-w-[150px]">
                                            PREMIUM SUGA EXPERIENCE
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-pink-600 to-pink-500 text-xs font-black text-white flex items-center gap-1.5 rounded-full shadow-md shadow-pink-500/20 active:scale-95 transition-all"
                            >
                                <UserPlus size={13} className="stroke-[3]" />
                                Invite
                            </button>
                        </header>

                        {/* Status bar */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a010c] border-b border-pink-500/5 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 bg-pink-500/15 border border-pink-500/30 px-3 py-1.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                                    <span className="text-xs font-extrabold text-pink-400 uppercase tracking-wider">LIVE</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-white/70 font-semibold uppercase tracking-wider">
                                    <span>👁️</span> {watcherCount}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button
                                        onClick={toggleIncomingPanel}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all border ${
                                            showIncomingPanel
                                                ? 'bg-pink-500/30 border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                                                : 'bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/15'
                                        }`}
                                    >
                                        <Bell className={`w-3.5 h-3.5 ${unseenCount > 0 ? 'animate-bounce' : ''}`} />
                                        Incoming
                                        {unseenCount > 0 && (
                                            <span className="ml-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-pink-500 text-white text-[9px] font-black px-0.5 animate-pulse">
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
                                                className="absolute top-full right-[-40px] xs:right-0 mt-3 w-80 max-w-[calc(100vw-32px)] bg-[#16161e]/95 border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl z-[60]"
                                            >
                                                {/* Panel Header */}
                                                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                                            <Bell className="w-4 h-4 text-pink-400" />
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
                                                <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                                                    {incomingItems.length === 0 ? (
                                                        <div className="py-12 px-4 text-center">
                                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                                                <Zap className="w-6 h-6 text-white/10" />
                                                            </div>
                                                            <p className="text-sm text-white/40">No recent activity</p>
                                                            <p className="text-[10px] text-white/25 mt-1">Your paid requests will appear here</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            {incomingItems.map((item) => {
                                                                const emoji = incomingTypeEmoji(item.type);
                                                                const sc = incomingStatusColor(item.status);
                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => {
                                                                            if (item.status === 'accepted') {
                                                                                setSelectedResponse(item);
                                                                                setShowIncomingPanel(false);
                                                                            }
                                                                        }}
                                                                        className={`flex flex-col gap-1.5 p-3 rounded-xl transition-all group ${
                                                                            item.status === 'accepted' ? 'cursor-pointer hover:bg-white/10' : 'hover:bg-white/5'
                                                                        }`}
                                                                        style={{
                                                                            background: `linear-gradient(90deg, ${sc.bg}, transparent)`,
                                                                            border: `1px solid ${sc.border}`
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-xl group-hover:scale-110 transition-transform">{emoji}</span>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                                    <span className="text-xs font-bold text-white truncate">
                                                                                        {item.label || item.type || 'Request'}
                                                                                    </span>
                                                                                    <span className="text-[10px] font-black text-pink-400">{cs()}{item.price || item.amount || 0}</span>
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
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="flex items-center gap-1.5 bg-[#19041a] border border-yellow-500/30 rounded-full pl-3 pr-1 py-0.5 shadow-sm">
                                    <span className="text-xs text-yellow-400 font-black tracking-wide">{cs()}{balance}</span>
                                    <button
                                        onClick={() => router.push("/account/wallet")}
                                        className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xs font-black ml-1 shadow-sm active:scale-95 transition-all"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Video Player */}
                        <div className="px-4 py-2 shrink-0">
                            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-pink-500/10 bg-black/40 shadow-lg">
                                {roomId && user && hostId && isMobile === true ? (
                                    <LiveStreamWrapper
                                        role="fan"
                                        appId={APP_ID}
                                        roomId={roomId}
                                        uid={user.id}
                                        hostId={hostId}
                                        hostAvatarUrl={hostAvatar || ""}
                                        hostName={hostName}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/40 text-xs italic">
                                        {roomId ? "Connecting to stream..." : "No active session"}
                                    </div>
                                )}
                                
                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-red-600 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-md shadow-sm uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                    LIVE
                                </div>
                                <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-bold text-white/90 flex items-center gap-1">
                                    <span>📶</span> 1
                                </div>
                                <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold text-white/95 flex items-center gap-1 shadow-sm">
                                    <span>👥</span> {watcherCount} Watching
                                </div>
                            </div>
                        </div>

                        {/* Quick Tips / Reactions Row (Tipping section shown right after live streaming box) */}
                        <div className="px-4 py-2 shrink-0 flex items-center justify-center bg-[#110113]/60 border-b border-pink-500/10 backdrop-blur-sm">
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none justify-center w-full">
                                {[
                                    { name: "Diamond", amount: 10 },
                                    { name: "Diamonds", amount: 25 },
                                    { name: "More Diamonds", amount: 50 },
                                    { name: "Big Money", amount: 100 },
                                ].map((g) => {
                                    const emoji = getSugaIcon("GIFT", g.name);
                                    const { glowClass, bgClass } = getSugaCyberpunkStyle("GIFT", g.name);
                                    return (
                                        <button
                                            key={g.amount}
                                            onClick={() => handleMobileGiftClick({ ...g, emoji })}
                                            disabled={!roomId || !hostId}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full backdrop-blur-md active:scale-95 transition-all text-xs font-bold disabled:opacity-50 shrink-0 ${bgClass} ${glowClass}`}
                                        >
                                            <span className="flex items-center justify-center w-4 h-4">{emoji}</span>
                                            <span className="text-white font-black">{cs()}{g.amount}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tab Contents Panel */}
                        <div className="flex-grow flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-3">
                            
                            {/* CHAT TAB */}
                            {mobileTab === "chat" && (
                                <div className="h-full flex flex-col bg-[#0e020f]/80 border border-pink-500/10 rounded-2xl p-3.5 shadow-inner shadow-black/40 min-h-0 flex-1">
                                    <div className="flex items-center justify-between pb-2 border-b border-pink-500/5 mb-2.5 shrink-0">
                                        <span className="text-xs font-black text-pink-500 tracking-widest flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                                            LIVE CHAT
                                        </span>
                                        <span className="text-[10px] font-extrabold bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            {watcherCount} Online
                                        </span>
                                    </div>

                                    <div className="mb-2.5 shrink-0">
                                        <div className="bg-pink-500/10 border border-pink-500/20 rounded-full px-4 py-2 flex items-center justify-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
                                            <span className="text-xs font-bold text-pink-400">{hostName} is now LIVE! 🔴</span>
                                        </div>
                                    </div>

                                    <div ref={mobileChatScrollRef} className="flex-grow flex-1 overflow-y-auto space-y-3 pr-0.5 scrollbar-none min-h-0">
                                        {suga.activity.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-white/30 text-xs italic">
                                                Welcome to the room! Send a message.
                                            </div>
                                        ) : (
                                            [...suga.activity].reverse().map((m) => {
                                                const isMsgHighlight = ['TIP', 'PAID_REQUEST', 'OFFER_CLAIM', 'SECRET_UNLOCK', 'LINK_REVEAL', 'BUY_FOR_HER'].includes(m.type);
                                                const formatMessageTime = (ts: number) => {
                                                    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                };
                                                return (
                                                    <div key={m.id} className="flex items-start gap-2.5 text-xs">
                                                        <div className="w-7 h-7 rounded-full bg-pink-500/10 flex-shrink-0 flex items-center justify-center overflow-hidden border border-pink-500/20 shadow-sm">
                                                            {m.fanId && avatarMap[m.fanId] ? (
                                                                <img src={avatarMap[m.fanId]} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-xs">{['TIP', 'LINK_REVEAL', 'BUY_FOR_HER', 'SECRET_UNLOCK'].includes(m.type) ? "💰" : "👤"}</span>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-baseline justify-between gap-1 mb-0.5">
                                                                <div className="flex items-center gap-1">
                                                                    <span className={`font-black tracking-wide ${isMsgHighlight ? "text-yellow-400" : "text-pink-300"}`}>
                                                                        {m.fanName}
                                                                    </span>
                                                                    {m.type === 'TIP' && (
                                                                        <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-1 rounded-sm uppercase font-black">
                                                                            VIP
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-white/35 shrink-0">{formatMessageTime(m.ts)}</span>
                                                            </div>
                                                            <p className="text-white/95 leading-snug break-words">
                                                                {m.type === 'TIP' && <span>tipped <span className="text-yellow-400 font-bold">{cs()}{m.amount}</span>!</span>}
                                                                {m.type === 'LINK_REVEAL' && <span>revealed a favourite!</span>}
                                                                {m.type === 'BUY_FOR_HER' && <span>purchased a favourite!</span>}
                                                                {m.type === 'SECRET_UNLOCK' && <span>revealed a secret!</span>}
                                                                {m.type === 'PAID_REQUEST' && <span>requested: {m.label} (${m.amount})</span>}
                                                                {m.type === 'OFFER_CLAIM' && <span>claimed offer: {m.label}</span>}
                                                                {m.type === 'CHAT' && <span>{m.label}</span>}
                                                                {isMsgHighlight && <Heart className="inline w-3 h-3 text-pink fill-pink ml-1" />}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div className="mt-3.5 flex items-center gap-2 shrink-0 relative">
                                        <div className="flex-1 bg-[#160618] border border-pink-500/15 rounded-full px-4 py-2.5 flex items-center gap-2">
                                            <button className="text-base opacity-75 hover:opacity-100 transition-opacity">
                                                😊
                                            </button>
                                            <input
                                                type="text"
                                                value={mobileChatInput}
                                                onChange={(e) => setMobileChatInput(e.target.value)}
                                                onKeyPress={(e) => e.key === "Enter" && handleMobileChatSend()}
                                                placeholder="Type a message..."
                                                className="flex-1 bg-transparent text-xs outline-none text-white placeholder-white/40 font-medium"
                                            />
                                        </div>
                                        
                                        <button
                                            onClick={handleMobileChatSend}
                                            disabled={!roomId}
                                            className="w-9 h-9 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center text-white transition-colors active:scale-95 shadow-md shadow-pink-500/25 disabled:opacity-50 shrink-0"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* REQUESTS TAB */}
                            {mobileTab === "requests" && (
                                <div className="space-y-4">
                                    <div className="border border-pink-500/15 rounded-2xl bg-[#130214]/65 p-4 flex flex-col gap-4 shadow-md shadow-pink-500/[0.02]">
                                        <div className="grid grid-cols-2 text-xs font-black tracking-widest text-pink-500/60 uppercase">
                                            <div>PAID REQUEST</div>
                                            <div className="pl-4"></div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 divide-x divide-pink-500/10">
                                            {/* Requests Grid */}
                                            <div className="grid grid-cols-2 gap-2 pr-2" data-tour="suga-fan-paid-requests">
                                                {[
                                                    { type: "POSE", name: "Pose", price: 15, isCustomRequest: true },
                                                    { type: "SHOUTOUT", name: "Shoutout", price: 25, isCustomRequest: true },
                                                    { type: "QUICK_TEASE", name: "Quick Tease", price: 40, isCustomRequest: true },
                                                    { type: "CUSTOM_CLIP", name: "Custom Clip", price: 80, isCustomRequest: true },
                                                ].map((r) => {
                                                    const emoji = getSugaIcon(r.type, r.name);
                                                    const { glowClass, bgClass } = getSugaCyberpunkStyle(r.type, r.name);
                                                    return (
                                                        <button
                                                            key={r.name}
                                                            onClick={() => handleMobileRequestClick({ ...r, emoji })}
                                                            disabled={!roomId || !hostId}
                                                            className={`group flex flex-col items-center justify-center p-2 border rounded-xl backdrop-blur-md active:scale-95 transition-all text-center disabled:opacity-50 min-h-[80px] ${bgClass} ${glowClass}`}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/45 border border-white/5 transition-all duration-300 shadow-sm group-hover:scale-110 mb-1 shrink-0">
                                                                {emoji}
                                                            </div>
                                                            <span className="text-[10px] font-extrabold tracking-wide truncate max-w-full text-white/95 uppercase">{r.name}</span>
                                                            <span className="text-xs font-black mt-0.5 text-white">{cs()}{r.price}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Gifts Grid */}
                                            <div className="grid grid-cols-2 gap-2 pl-4" data-tour="suga-fan-send-gifts">
                                                {[
                                                    { type: "ACTION", name: "Say My Name", price: 20, isCustomRequest: true },
                                                    { type: "ACTION", name: "Sponsor Room", price: 100, isCustomRequest: true },
                                                    { type: "ACTION", name: "Voice Note", price: 35, isCustomRequest: true },
                                                    { type: "ACTION", name: "Photo Drop", price: 45, isCustomRequest: true },
                                                ].map((r) => {
                                                    const emoji = getSugaIcon(r.type, r.name);
                                                    const { glowClass, bgClass } = getSugaCyberpunkStyle(r.type, r.name);
                                                    return (
                                                        <button
                                                            key={r.name}
                                                            onClick={() => handleMobileRequestClick({ ...r, emoji })}
                                                            disabled={!roomId || !hostId}
                                                            className={`group flex flex-col items-center justify-center p-2 border rounded-xl backdrop-blur-md active:scale-95 transition-all text-center disabled:opacity-50 min-h-[80px] ${bgClass} ${glowClass}`}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/45 border border-white/5 transition-all duration-300 shadow-sm group-hover:scale-110 mb-1 shrink-0">
                                                                {emoji}
                                                            </div>
                                                            <span className="text-[10px] font-extrabold tracking-wide truncate max-w-full text-white/95 uppercase">{r.name}</span>
                                                            <span className="text-xs font-black mt-0.5 text-white">{cs()}{r.price}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Private 1-on-1 Button */}
                                    <div data-tour="suga-fan-special-actions">
                                        <button
                                            onClick={() => {
                                                if (!roomId || !hostId) return;
                                                if (balance < 500) {
                                                    toast.error("Insufficient balance");
                                                    return;
                                                }
                                                setConfirmMobileAction({
                                                    type: 'PRIVATE_1ON1',
                                                    name: 'Private 1-on-1 Call',
                                                    price: 500,
                                                    emoji: getSugaIcon("PRIVATE_1ON1", "Private 1-on-1"),
                                                    description: `Request a Private 1-on-1 video call with the creator for ${cs()}500?`
                                                });
                                            }}
                                            disabled={!roomId || !hostId}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-red-500/25 border border-red-500/40 hover:shadow-red-500/40 transition-all text-center tracking-wider uppercase shrink-0"
                                        >
                                            <span className="flex items-center justify-center w-5 h-5">{getSugaIcon("PRIVATE_1ON1", "Private 1-on-1")}</span>
                                            <span>Private 1-on-1 {cs()}500</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SECRETS TAB */}
                            {mobileTab === "secrets" && (
                                <div className="space-y-4 pb-4">
                                    {/* Creator Favorites Section */}
                                    <div className="py-1" data-tour="suga-fan-creator-favorites">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5 text-sm font-black tracking-wider text-white">
                                                <span className="text-yellow-400">★</span> CREATOR FAVORITES
                                            </div>
                                        </div>

                                        <div className="flex gap-2.5 mb-3 overflow-x-auto scrollbar-none">
                                            {["ALL", "CUTE", "LUXURY", "DREAM"].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveMobileFavTab(tab)}
                                                    className={`px-3.5 py-1.5 rounded-full text-[10.5px] font-black tracking-wider transition-all border ${
                                                        activeMobileFavTab === tab
                                                            ? 'bg-pink-500 text-white border-pink-400 shadow-md shadow-pink-500/25 font-extrabold'
                                                            : 'bg-[#150417] text-pink-300 border-pink-500/15 hover:border-pink-500/35'
                                                    }`}
                                                >
                                                    {tab === 'CUTE' ? '🎀 Cute' : tab === 'LUXURY' ? '💎 Luxury' : tab === 'DREAM' ? '👑 Dream' : 'All'}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex gap-3 overflow-x-auto scrollbar-none snap-x pb-2.5">
                                            {suga.favorites.length === 0 ? (
                                                <div className="w-full py-6 text-center text-white/35 text-xs italic">
                                                    No favorites items found
                                                </div>
                                            ) : (
                                                suga.favorites
                                                    .filter(item => activeMobileFavTab === "ALL" || item.category === activeMobileFavTab)
                                                    .map((item) => {
                                                        const isUnlocked = revealedMobileFavIds.has(item.id);
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className="bg-[#130414]/90 border border-pink-500/15 rounded-2xl p-3.5 flex flex-col justify-between w-[165px] min-h-[160px] flex-shrink-0 snap-start shadow-[0_0_15px_rgba(255,42,109,0.03)]"
                                                            >
                                                                <div className="flex flex-col items-center text-center">
                                                                    <div className="w-14 h-14 rounded-full bg-pink-500/5 border border-yellow-500/25 flex items-center justify-center text-2xl mb-3 shadow-inner">
                                                                        {item.emoji}
                                                                    </div>
                                                                    <h4 className="text-xs font-black text-white leading-tight line-clamp-2 mb-1.5">
                                                                        {item.name}
                                                                    </h4>
                                                                    {isUnlocked && item.description && (
                                                                        <p className="text-[10px] text-white/50 leading-tight line-clamp-1 mb-2.5">
                                                                            {item.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="w-full mt-2">
                                                                    {isUnlocked ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            <button
                                                                                onClick={() => setSelectedMobileFav(item)}
                                                                                className="w-full py-1.5 text-[10px] font-black tracking-wider text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors uppercase animate-pulse"
                                                                            >
                                                                                OPEN
                                                                            </button>
                                                                            {item.link && (
                                                                                <a
                                                                                    href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="w-full text-center py-1.5 text-[10px] font-black tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/35 rounded-lg hover:bg-yellow-500/20 transition-colors uppercase"
                                                                                >
                                                                                    Get Link
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-center text-xs font-black text-yellow-500 mb-1">
                                                                                {cs()}{item.buy_price}
                                                                            </span>
                                                                            {item.reveal_price !== null && (
                                                                                <button
                                                                                    onClick={() => handleMobileFavAction(item, 'REVEAL')}
                                                                                    className="w-full py-1.5 text-[9.5px] font-black tracking-wider text-pink-300 bg-pink-500/10 border border-pink-500/25 rounded-lg hover:bg-pink-500/25 transition-colors uppercase"
                                                                                >
                                                                                    REVEAL {cs()}{item.reveal_price}
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => handleMobileFavAction(item, 'BUY')}
                                                                                className="w-full py-1.5 text-[9.5px] font-black tracking-wider text-white bg-[#d4af37] rounded-lg hover:brightness-110 transition-all uppercase"
                                                                            >
                                                                                BUY FOR HER
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                            )}
                                        </div>
                                    </div>

                                    {/* Creator Secrets Section */}
                                    <div className="py-1" data-tour="suga-fan-creator-secrets">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5 text-sm font-black tracking-wider text-white">
                                                <span className="text-yellow-400">🔒</span> CREATOR SECRETS
                                            </div>
                                        </div>

                                        <div className="flex gap-2.5 mb-3 overflow-x-auto scrollbar-none">
                                            {["ALL", "TEASE", "POSE", "BEHIND_THE_SCENES"].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => {
                                                        setActiveMobileSecTab(tab);
                                                    }}
                                                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all border ${
                                                        activeMobileSecTab === tab
                                                            ? 'bg-pink-500 text-white border-pink-400 shadow-md shadow-pink-500/25'
                                                            : 'bg-[#150417] text-pink-300 border-pink-500/15 hover:border-pink-500/35'
                                                    }`}
                                                >
                                                    {tab === 'TEASE' ? '🎀 Tease' : tab === 'POSE' ? '📸 Pose' : tab === 'BEHIND_THE_SCENES' ? '🎬 Behind the Scenes' : 'All'}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex gap-3 overflow-x-auto scrollbar-none snap-x pb-2.5">
                                            {suga.secrets.length === 0 ? (
                                                <div className="w-full py-6 text-center text-white/35 text-xs italic">
                                                    No secret media found
                                                </div>
                                            ) : (
                                                suga.secrets
                                                    .filter(item => {
                                                        if (activeMobileSecTab === "ALL") return true;
                                                        if (activeMobileSecTab === "TEASE" && item.category === "CUTE") return true;
                                                        if (activeMobileSecTab === "POSE" && item.category === "LUXURY") return true;
                                                        if (activeMobileSecTab === "BEHIND_THE_SCENES" && item.category === "DREAM") return true;
                                                        return false;
                                                    })
                                                    .map((item) => {
                                                        const isUnlocked = unlockedMobileSecIds.has(item.id);
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                onClick={() => {
                                                                    if (isUnlocked && item.media_url) {
                                                                        setSelectedMobileSecretMedia(item);
                                                                    }
                                                                }}
                                                                className="relative bg-[#130414]/90 border border-pink-500/15 rounded-2xl overflow-hidden w-[155px] h-[125px] flex-shrink-0 snap-start flex flex-col justify-between p-3.5 cursor-pointer shadow-[0_0_15px_rgba(255,42,109,0.03)]"
                                                            >
                                                                {item.media_url && (
                                                                    <div className="absolute inset-0 z-0 bg-black/45">
                                                                        {item.media_type === 'video' ? (
                                                                            <video src={item.media_url} className={`w-full h-full object-cover transition-all ${!isUnlocked ? 'blur-md opacity-40' : 'opacity-100'}`} loop muted playsInline />
                                                                        ) : (
                                                                            <img src={item.media_url} className={`w-full h-full object-cover transition-all ${!isUnlocked ? 'blur-md opacity-40' : 'opacity-100'}`} alt="" />
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <div className="relative z-10 flex flex-col justify-between h-full w-full">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[16px]">
                                                                            {item.category === 'CUTE' ? '🎀' : item.category === 'LUXURY' ? '💎' : '👑'}
                                                                        </span>
                                                                        {isUnlocked ? (
                                                                            <Eye className="w-4 h-4 text-emerald-400 drop-shadow animate-pulse" />
                                                                        ) : (
                                                                            item.media_url && (
                                                                                <span className="text-white/60 text-xs">
                                                                                    {item.media_type === 'video' ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                                                                </span>
                                                                            )
                                                                        )}
                                                                    </div>

                                                                    <div className="mt-1">
                                                                        {!isUnlocked && <Lock className="w-4 h-4 mx-auto mb-1 text-yellow-500 drop-shadow" />}
                                                                        <h4 className="text-[10px] font-black text-white text-center leading-tight line-clamp-2 drop-shadow">
                                                                            {item.name}
                                                                        </h4>
                                                                    </div>

                                                                    {!isUnlocked && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleMobileSecretUnlockPrompt(item);
                                                                            }}
                                                                            className="w-full mt-2 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold text-[9.5px] rounded-lg tracking-wider transition-all uppercase"
                                                                        >
                                                                            {cs()}{item.unlock_price} UNLOCK
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* INFO TAB */}
                            {mobileTab === "info" && (
                                <div className="space-y-4 pb-4">
                                    <div className="bg-[#130214]/65 border border-pink-500/15 rounded-2xl p-4">
                                        <UserProfile name={hostName} avatarUrl={hostAvatar} hostId={hostId} />
                                    </div>

                                    <div className="bg-[#130214]/65 border border-pink-500/15 rounded-2xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3.5">
                                            <span className="text-2xl">🔑</span>
                                            <div>
                                                <div className="text-[11px] text-white/40 font-bold uppercase tracking-wider">Wallet Balance</div>
                                                <div className="text-base font-black text-yellow-400">{cs()}{balance}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push("/account/wallet")}
                                            className="px-5 py-2.5 rounded-xl bg-yellow-500 text-black text-xs font-black shadow-md active:scale-95 transition-all uppercase"
                                        >
                                            Recharge
                                        </button>
                                    </div>

                                    <div className="bg-[#130214]/65 border border-pink-500/15 rounded-2xl p-4 space-y-2.5">
                                        <h4 className="text-xs font-black text-pink-500 uppercase tracking-widest">Suga4U Rules</h4>
                                        <div className="text-xs text-white/60 space-y-2 leading-relaxed">
                                            <p>• Be respectful to the creator during the live session.</p>
                                            <p>• Paid requests and gifts support the creator directly.</p>
                                            <p>• Private 1-on-1 calls are billed per minute or at a fixed rate.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Sticky footer with Room Goal and Mobile Tabs */}
                        <div className="shrink-0 bg-[#0e0010]/95 border-t border-pink-500/20 z-40 backdrop-blur-md">
                            {/* Rooms Goal Footer Bar */}
                            <div className="px-4 py-2 flex items-center justify-between bg-black/30" data-tour="suga-fan-group-votes">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-black text-yellow-400 tracking-wider flex items-center gap-1">
                                        🎯 ROOM GOAL
                                    </span>
                                    <span className="text-xs font-bold text-white/80">
                                        {groupVoteState && groupVoteState.isActive ? (
                                            groupVoteState.current >= groupVoteState.target ? (
                                                <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                                                    ✓ GOAL REACHED!
                                                </span>
                                            ) : (
                                                groupVoteState.label
                                            )
                                        ) : (
                                            "No active goal right now."
                                        )}
                                    </span>
                                    {groupVoteState && groupVoteState.isActive && groupVoteState.current < groupVoteState.target && (
                                        <div className="w-32 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5 mt-0.5">
                                            <div
                                                className="h-full bg-gradient-to-r from-pink-500 to-yellow-500 shadow-sm"
                                                style={{ width: `${Math.min(100, (groupVoteState.current / groupVoteState.target) * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {groupVoteState && groupVoteState.isActive && groupVoteState.current < groupVoteState.target && (
                                        <button
                                            onClick={handleMobileVote}
                                            disabled={loadingMobileVote}
                                            className="px-3.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-black flex items-center gap-1 active:scale-95 transition-all shadow-md uppercase disabled:opacity-50"
                                        >
                                            <Flame className="w-3 h-3 text-white fill-current" />
                                            Boost {cs()}{groupVoteState.price}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleMobileGiftClick({ name: "Diamonds", amount: 25, emoji: getSugaIcon("GIFT", "Diamonds") })}
                                        className="w-9 h-9 rounded-full bg-gradient-to-r from-pink-600 to-pink-500 flex items-center justify-center text-white active:scale-95 transition-all shadow-lg shadow-pink-500/25 text-base"
                                    >
                                        🎁
                                    </button>
                                </div>
                            </div>

                            {/* Mobile Navigation Tabs */}
                            <MobileStudioTabs
                                tabs={SUGA4U_FAN_TABS}
                                activeTab={mobileTab}
                                onTabChange={setMobileTab}
                                accentHsl="340, 75%, 55%"
                            />
                        </div>
                    </div>

                </div>

                {/* Overlays / Modals (Rendered on top for both responsive views) */}

                {/* Invite Modal */}
                <InviteModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    roomId={roomId}
                />

                {/* Invitation Popup (receiver side) */}
                <InvitationPopup />

                {/* Private 1-on-1 Call Modal */}
                {privateCall.callState && user && (
                    <PrivateCallFanModal
                        callState={privateCall.callState}
                        timeRemaining={privateCall.timeRemaining}
                        userId={user.id}
                        isLoading={privateCall.isLoading}
                        onAcceptRinging={privateCall.acceptRinging}
                        onRejectRinging={privateCall.rejectRinging}
                        onEndCall={privateCall.endCall}
                        onDismiss={privateCall.dismiss}
                        hostAvatarUrl={hostAvatar || undefined}
                        hostName={hostName}
                    />
                )}

                {/* Group Call Fan Modal */}
                {groupCall.callState && user && (
                    <GroupCallFanModal
                        callState={groupCall.callState}
                        userId={user.id}
                        userName={user.user_metadata?.full_name || user.email?.split('@')[0] || "Fan"}
                        onAcceptCall={groupCall.acceptCall}
                        onDeclineCall={groupCall.declineCall}
                        onDismiss={groupCall.dismiss}
                    />
                )}

                {/* Response Detail Modal */}
                <AnimatePresence>
                    {selectedResponse && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in"
                        >
                            <div
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                onClick={() => setSelectedResponse(null)}
                            />

                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="relative z-10 w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-[#15021a]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            >
                                {/* Modal Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/5 shrink-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
                                            <Bell className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                                                {selectedResponse.label || selectedResponse.type || 'Request'}
                                            </h3>
                                            <p className="text-[10px] text-pink-400/70 font-semibold uppercase tracking-widest">Creator Response</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedResponse(null)}
                                        className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-white/10">
                                    {/* Section 1: Original Request details */}
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                            <span>Paid Request Details</span>
                                            <span className="text-pink-400 font-black">{cs()}{selectedResponse.price || selectedResponse.amount || 0}</span>
                                        </div>
                                        <div className="h-px bg-white/5 my-1" />
                                        <div className="text-xs text-white/70">
                                            <span className="font-extrabold text-white">Item:</span> {selectedResponse.label || selectedResponse.type}
                                        </div>
                                        {selectedResponse.custom_text && (
                                            <div className="mt-1 bg-black/30 rounded-lg p-2.5 border-l-2 border-pink-500/40">
                                                <p className="text-[9px] text-pink-400/60 uppercase tracking-widest font-black mb-0.5">Your Message</p>
                                                <p className="text-xs text-white/85 italic">&quot;{selectedResponse.custom_text}&quot;</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Section 2: Creator response text */}
                                    {selectedResponse.response_text && (
                                        <div className="bg-emerald-500/[0.04] rounded-xl p-3.5 border border-emerald-500/10 flex flex-col gap-2">
                                            <p className="text-[9px] text-emerald-400/75 uppercase tracking-widest font-black flex items-center gap-1">
                                                <span>💬</span> Message from Creator
                                            </p>
                                            <p className="text-xs text-white/90 leading-relaxed font-medium bg-black/15 rounded-lg p-2.5">
                                                {selectedResponse.response_text}
                                            </p>
                                        </div>
                                    )}

                                    {/* Section 3: Creator response media */}
                                    {selectedResponse.response_media_url && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] text-pink-400/80 uppercase tracking-widest font-black flex items-center gap-1 pl-1">
                                                <span>🎬</span> Delivered Media
                                            </p>
                                            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/45 flex items-center justify-center p-1.5 relative group">
                                                {selectedResponse.response_media_url.match(/\.(mp4|webm|mov|avi)$/i) ||
                                                 selectedResponse.response_media_url.includes('video') ? (
                                                    <video
                                                        src={selectedResponse.response_media_url}
                                                        controls
                                                        className="w-full max-h-[35vh] rounded-lg object-contain"
                                                    />
                                                ) : (
                                                    <img
                                                        src={selectedResponse.response_media_url}
                                                        alt="Creator response media"
                                                        className="w-full max-h-[35vh] rounded-lg object-contain"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="px-5 py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                                    <span className="text-[9px] text-white/30">Delivered successfully</span>
                                    <div className="flex items-center gap-2">
                                        {selectedResponse.response_media_url && (
                                            <a
                                                href={selectedResponse.response_media_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-extrabold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-center"
                                            >
                                                Open Media ↗
                                            </a>
                                        )}
                                        <button
                                            onClick={() => setSelectedResponse(null)}
                                            className="px-4 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-[11px] font-black text-white active:scale-95 transition-all shadow-md shadow-pink-600/20 uppercase"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Media Preview Modal */}
                <AnimatePresence>
                    {previewMedia && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center"
                        >
                            <div
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                onClick={() => setPreviewMedia(null)}
                            />

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                            <span className="text-sm">📎</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">{previewMedia.label}</h3>
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Creator Response Media</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setPreviewMedia(null)}
                                        className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-4 flex items-center justify-center bg-black/30 max-h-[70vh]">
                                    {previewMedia.url.match(/\.(mp4|webm|mov|avi)$/i) ||
                                     previewMedia.url.includes('video') ? (
                                        <video
                                            src={previewMedia.url}
                                            controls
                                            autoPlay
                                            className="max-w-full max-h-[65vh] rounded-lg"
                                        />
                                    ) : (
                                        <img
                                            src={previewMedia.url}
                                            alt="Creator response"
                                            className="max-w-full max-h-[65vh] rounded-lg object-contain"
                                        />
                                    )}
                                </div>

                                <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                                    <p className="text-[10px] text-white/30">Delivered by creator</p>
                                    <a
                                        href={previewMedia.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                    >
                                        Open in new tab ↗
                                    </a>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mobile Specific Overlay Modals */}

                {/* Mobile Spend Action Confirmation Modal (Private 1-on-1 or standard Request/Gifts) */}
                {confirmMobileAction && (
                    <SpendConfirmModal
                        isOpen={true}
                        onClose={() => setConfirmMobileAction(null)}
                        onConfirm={handleConfirmMobileActionPayment}
                        title={confirmMobileAction.name}
                        itemLabel={confirmMobileAction.name}
                        amount={confirmMobileAction.price}
                        walletBalance={balance}
                        description={confirmMobileAction.description}
                        confirmLabel={confirmMobileAction.type === 'PRIVATE_1ON1' ? "Request Call" : "Pay & Send"}
                    />
                )}

                {/* Mobile Custom Request Modal (Pose, Shoutout, Quick Tease, Custom Clip) */}
                {customMobileAction && (
                    <CustomRequestModal
                        isOpen={true}
                        onClose={() => setCustomMobileAction(null)}
                        onConfirm={handleConfirmMobileCustomAction}
                        requestName={customMobileAction.name}
                        requestEmoji={customMobileAction.emoji}
                        amount={customMobileAction.price}
                        walletBalance={balance}
                    />
                )}

                {/* Mobile Spend Confirmation Modal (Favorites Buy or Reveal) */}
                {confirmMobileFav && (
                    <SpendConfirmModal
                        isOpen={true}
                        onClose={() => setConfirmMobileFav(null)}
                        onConfirm={handleConfirmMobileFavPayment}
                        title={confirmMobileFav.type === 'REVEAL' ? "Reveal Favorite" : "Buy For Her"}
                        itemLabel={confirmMobileFav.type === 'REVEAL' ? `Reveal: ${confirmMobileFav.item.name}` : confirmMobileFav.item.name}
                        amount={confirmMobileFav.type === 'BUY' ? confirmMobileFav.item.buy_price : (confirmMobileFav.item.reveal_price || 0)}
                        walletBalance={balance}
                        description={confirmMobileFav.type === 'REVEAL'
                            ? "This will reveal the item's name and description to you."
                            : `Gift "${confirmMobileFav.item.name}" to the creator.`}
                        confirmLabel={confirmMobileFav.type === 'REVEAL' ? "Reveal Now" : "Buy Now"}
                    />
                )}

                {/* Mobile Favorite Details Modal */}
                {selectedMobileFav && (
                    <div 
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
                        onClick={() => setSelectedMobileFav(null)}
                    >
                        <div 
                            className="relative w-full max-w-sm glass-panel p-5 animate-in fade-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => setSelectedMobileFav(null)}
                                className="absolute top-3 right-3 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <div className="flex flex-col items-center text-center mt-2">
                                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center text-4xl mb-4 border border-white/10 shadow-lg">
                                    {selectedMobileFav.emoji}
                                </div>
                                
                                <h3 className="text-xl font-bold text-white mb-2">{selectedMobileFav.name}</h3>
                                
                                {selectedMobileFav.description && (
                                    <p className="text-sm text-white/70 mb-5">{selectedMobileFav.description}</p>
                                )}
                                
                                {selectedMobileFav.link && (
                                    <a 
                                        href={selectedMobileFav.link.startsWith('http') ? selectedMobileFav.link : `https://${selectedMobileFav.link}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg transition-colors shadow-lg"
                                    >
                                        <ExternalLink className="w-4 h-4" /> Open Link
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Spend Confirmation Modal (Secrets Unlock) */}
                {confirmMobileSecret && (
                    <SpendConfirmModal
                        isOpen={true}
                        onClose={() => setConfirmMobileSecret(null)}
                        onConfirm={handleConfirmMobileSecretPayment}
                        title="Unlock Creator Secret"
                        itemLabel={confirmMobileSecret.name}
                        amount={confirmMobileSecret.unlock_price}
                        walletBalance={balance}
                        description={`Permanently unlock the secret "${confirmMobileSecret.name}" to view its contents during this session.`}
                        confirmLabel="Unlock Secret"
                    />
                )}

                {/* Mobile Secret Media Lightbox Modal */}
                {selectedMobileSecretMedia && selectedMobileSecretMedia.media_url && (
                    <div 
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
                        onClick={() => setSelectedMobileSecretMedia(null)}
                    >
                        <button 
                            onClick={() => setSelectedMobileSecretMedia(null)}
                            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors z-[10000]"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        
                        <div 
                            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            {selectedMobileSecretMedia.media_type === 'video' ? (
                                <video 
                                    src={selectedMobileSecretMedia.media_url} 
                                    className="max-w-full max-h-[85vh] rounded-lg shadow-2xl ring-1 ring-white/10" 
                                    controls
                                    autoPlay 
                                    playsInline 
                                />
                            ) : (
                                <img 
                                    src={selectedMobileSecretMedia.media_url} 
                                    alt={selectedMobileSecretMedia.name}
                                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10" 
                                />
                            )}
                            
                            {(selectedMobileSecretMedia.name || selectedMobileSecretMedia.description) && (
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 rounded-b-lg">
                                    <h3 className="text-xl font-bold text-white drop-shadow-md">{selectedMobileSecretMedia.name}</h3>
                                    {selectedMobileSecretMedia.description && (
                                        <p className="text-sm text-white/80 mt-1 max-w-2xl">{selectedMobileSecretMedia.description}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}



            </div>
        </ProtectRoute>
    );
};

export default Suga4URoom;
