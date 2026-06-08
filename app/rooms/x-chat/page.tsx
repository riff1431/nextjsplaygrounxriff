"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Clock, XCircle, Loader2, UserPlus, Pin, Mic, Megaphone, HelpCircle, Shirt, MessageSquare, Eye, Zap, Info } from "lucide-react";
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";
import { useGuidedTour } from "@/components/guided-tour/GuidedTourProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import dynamic from "next/dynamic";
import ChatPanel from "@/components/rooms/x-chat/ChatPanel";
import WalletPill from "@/components/common/WalletPill";
import InviteModal from "@/components/rooms/InviteModal";
import InvitationPopup from "@/components/rooms/InvitationPopup";
import IncomingReplies from "@/components/rooms/x-chat/IncomingReplies";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";
import BillingOverlay from "@/components/rooms/shared/BillingOverlay";
import RoomTourHelpButton from "@/components/rooms/shared/RoomTourHelpButton";
import { cs } from "@/utils/currency";

const LiveStreamWrapper = dynamic(
    () => import("@/components/rooms/LiveStreamWrapper"),
    { ssr: false }
);
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || undefined;

type RequestStatus = "none" | "pending" | "accepted" | "declined";

/* ─── monetisation data ──────────────────────────────────── */
const reactionsRow1 = [
    { emoji: "🔥", label: "Boost", price: 2,  type: "reaction_boost" },
    { emoji: "💎", label: "Shine", price: 5,  type: "reaction_shine" },
];
const stickersRow1 = [
    { emoji: "💋", label: "Kiss",  price: 5,  type: "sticker_kiss" },
    { emoji: "😈", label: "Tease", price: 10, type: "sticker_tease" },
];
const reactionsRow2 = [
    { emoji: "👑", label: "Crown", price: 10, type: "reaction_crown" },
    { emoji: "⚡", label: "Pulse", price: 15, type: "reaction_pulse" },
];
const stickersRow2 = [
    { emoji: "🌹", label: "Rose",  price: 25, type: "sticker_rose" },
    { emoji: "🎁", label: "Gift",  price: 50, type: "sticker_gift" },
];
const visibilityBoosts = [
    { label: "Pin my name to top (1 min)", price: 25, type: "pin", icon: Pin, colorClass: "icon-pink" },
    { label: "Voice note reply",           price: 35, type: "voice_note_boost", icon: Mic, colorClass: "icon-blue" },
    { label: "Say my name + Shoutout",     price: 15, type: "shoutout", icon: Megaphone, colorClass: "icon-purple" },
];
const directAccess = [
    { label: "Private question",       price: 20, type: "private_question", icon: HelpCircle, colorClass: "icon-teal" },
    { label: "Change the Outfit",  price: 60, type: "mini_chat", icon: Shirt, colorClass: "icon-orange" },
    { label: "Choose my topic",            price: 40, type: "choose_topic", icon: MessageSquare, colorClass: "icon-green" },
];

/* ─── inline reaction chip ───────────────────────────────── */
const ReactionChip = ({
    emoji, label, price, onClick,
}: { emoji: string; label: string; price: number; onClick: () => void }) => (
    <button
        onClick={onClick}
        className="xchat-chip"
    >
        <span className="xchat-chip-emoji">{emoji}</span>
        <span className="xchat-chip-label">{label}</span>
        <span className="xchat-chip-price">{cs()}{price}</span>
    </button>
);

/* ─── boost row chip ─────────────────────────────────────── */
const BoostRow = ({
    label, price, icon: Icon, colorClass, onClick,
}: { label: string; price: number; icon?: any; colorClass?: string; onClick: () => void }) => (
    <button onClick={onClick} className="xchat-boost-row">
        <div className="xchat-boost-row-left">
            {Icon && (
                <div className={`xchat-boost-row-icon-wrapper ${colorClass || ''}`}>
                    <Icon size={14} className="xchat-animated-icon" />
                </div>
            )}
            <span className="xchat-boost-label">{label}</span>
        </div>
        <span className="xchat-boost-price">{cs()}{price}</span>
    </button>
);

/* ── mobile reaction chip ───────────────────────────────── */
const MobileReactionButton = ({
    emoji, label, price, onClick,
}: { emoji: string; label: string; price: number; onClick: () => void }) => (
    <button onClick={onClick} className="mobile-reaction-chip">
        <span className="mobile-reaction-emoji">{emoji}</span>
        <div className="mobile-reaction-details">
            <span className="mobile-reaction-label">{label}</span>
            <span className="mobile-reaction-price">{cs()}{price}</span>
        </div>
    </button>
);

/* ── mobile navigation SVGs ──────────────────────────────── */
const HomeIcon = () => (
    <svg className="mobile-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const RoomsIcon = () => (
    <svg className="mobile-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const MessagesIcon = () => (
    <svg className="mobile-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

const ProfileIcon = () => (
    <svg className="mobile-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const FullscreenIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 9v12h-12M3 15V3h12" />
    </svg>
);

const XCHAT_FAN_TABS: MobileStudioTab[] = [
    { id: "chat", label: "Chat", icon: <MessageSquare className="w-5 h-5" /> },
    { id: "boosts", label: "Boosts", icon: <Zap className="w-5 h-5" /> },
    { id: "info", label: "Info", icon: <Info className="w-5 h-5" /> },
];

/* ═══════════════════════════════════════════════════════════ */
const XChatRoom = () => {
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const urlRoomId = searchParams?.get("roomId");
    const urlSessionId = searchParams?.get("sessionId");
    const supabase = createClient();
    const { balance, refresh } = useWallet();

    const { activeTour, currentStep } = useGuidedTour();

    useEffect(() => {
        if (activeTour === "xchat_fan") {
            if (currentStep === 4) setActiveTab("boosts");
            else if (currentStep === 6) setActiveTab("boosts");
            else if (currentStep === 7) setActiveTab("chat");
            else if (currentStep === 8) setActiveTab("chat");
        }
    }, [activeTour, currentStep]);

    const [roomId, setRoomId]       = useState<string | null>(urlRoomId || null);
    const [hostId, setHostId]       = useState<string | null>(null);
    const [hostAvatar, setHostAvatar] = useState<string | null>(null);
    const [hostName, setHostName]   = useState("Loading...");

    const [isMobile, setIsMobile]   = useState(false);
    const [activeTab, setActiveTab] = useState<"chat" | "boosts" | "info">("chat");

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 767);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const [chatUnread, setChatUnread] = useState(0);
    const activeTabRef = useRef(activeTab);

    useEffect(() => {
        activeTabRef.current = activeTab;
        if (activeTab === "chat") {
            setChatUnread(0);
        }
    }, [activeTab]);

    useEffect(() => {
        if (!roomId) return;
        const channelName = urlSessionId ? `x-chat-unread-${roomId}-${urlSessionId}` : `x-chat-unread-${roomId}`;
        const channel = supabase.channel(channelName)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "x_chat_messages",
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const newMsg = payload.new as any;
                if (urlSessionId && newMsg.session_id && newMsg.session_id !== urlSessionId) return;
                if (activeTabRef.current !== "chat") {
                    setChatUnread(prev => prev + 1);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, urlSessionId]);

    const mappedTabs = XCHAT_FAN_TABS.map(tab => {
        if (tab.id === "chat") return { ...tab, badge: chatUnread };
        return tab;
    });

    const [requestStatus, setRequestStatus] = useState<RequestStatus>("none");
    const [requestLoading, setRequestLoading] = useState(false);

    const [sessionActive, setSessionActive] = useState(false);
    const [sessionStart, setSessionStart]   = useState<Date | null>(null);
    const [elapsed, setElapsed]             = useState(0);
    const RATE_PER_MIN = 2;

    const [showInviteModal, setShowInviteModal] = useState(false);

    const [pending, setPending]     = useState<{ label: string; price: number; reactionType: string; emoji?: string } | null>(null);
    const [voicePrompt, setVoicePrompt] = useState("");
    const [animatingEmoji, setAnimatingEmoji] = useState<string | null>(null);

    /* ── session status gating ──────────────────────────── */
    const [sessionStatus, setSessionStatus] = useState<string | null>(null);

    useEffect(() => {
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

    /* ── fetch room ─────────────────────────────────────── */
    useEffect(() => {
        async function fetchRoom() {
            // 1. Prioritize session_id as the source of truth
            if (urlSessionId) {
                const { data: session } = await supabase
                    .from("room_sessions")
                    .select("room_id, creator_id")
                    .eq("id", urlSessionId)
                    .single();

                if (session?.room_id) {
                    setRoomId(session.room_id);
                    setHostId(session.creator_id);
                    const { data: p } = await supabase.from("profiles")
                        .select("username, full_name, avatar_url")
                        .eq("id", session.creator_id).single();
                    if (p) {
                        const name = p.full_name || p.username || "Host";
                        setHostName(name);
                        setHostAvatar(p.avatar_url || null);
                    }
                    return;
                }
            }

            // 2. Fallback logic
            let q = supabase.from("rooms").select("id, host_id, title")
                .eq("status", "live").eq("type", "x-chat");
            if (urlRoomId) q = q.eq("id", urlRoomId);
            else q = q.order("created_at", { ascending: false }).limit(1);

            const { data: rooms } = await q;
            const room = rooms?.[0];
            if (room) {
                setRoomId(room.id);
                setHostId(room.host_id);
                const { data: p } = await supabase.from("profiles")
                    .select("username, full_name, avatar_url")
                    .eq("id", room.host_id).single();
                if (p) {
                    const name = p.full_name || p.username || "Host";
                    setHostName(name);
                    setHostAvatar(p.avatar_url || null);
                }
            } else {
                setHostName("No Active Room");
            }
        }
        fetchRoom();
    }, [urlSessionId, urlRoomId, supabase]);

    /* ── request subscription ───────────────────────────── */
    useEffect(() => {
        if (!roomId || !user) return;

        // Reset for fresh session
        setRequestStatus("none");

        (async () => {
            let query = supabase.from("x_chat_requests")
                .select("id, status").eq("room_id", roomId).eq("fan_id", user.id)
                .order("created_at", { ascending: false }).limit(1);
            if (urlSessionId) query = query.eq("session_id", urlSessionId);
            const { data: ex } = await query.single();
            if (ex) setRequestStatus(ex.status as RequestStatus);
        })();
        const ch = supabase.channel(`xchat-req-${roomId}-${user.id}-${urlSessionId || 'all'}`)
            .on("postgres_changes", {
                event: "UPDATE", schema: "public",
                table: "x_chat_requests", filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const u = payload.new as any;
                if (u.fan_id === user.id) {
                    // Only update if belongs to current session
                    if (urlSessionId && u.session_id !== urlSessionId) return;
                    setRequestStatus(u.status);
                }
            }).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [roomId, user, urlSessionId]);

    /* ── session timer ──────────────────────────────────── */
    useEffect(() => {
        if (!sessionActive || !sessionStart) return;
        const t = setInterval(() =>
            setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000)), 1000);
        return () => clearInterval(t);
    }, [sessionActive, sessionStart]);

    const formatTime = (s: number) =>
        `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

    const runningCharge = Math.ceil(elapsed / 60) * RATE_PER_MIN;

    /* ── actions ────────────────────────────────────────── */
    const sendRequest = async () => {
        if (!roomId || requestLoading) return;
        setRequestLoading(true);
        try {
            const r = await fetch(`/api/v1/rooms/${roomId}/x-chat/request`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "Wants to chat", session_id: urlSessionId }),
            });
            if ((await r.json()).success) setRequestStatus("pending");
        } finally { setRequestLoading(false); }
    };

    const endSession = async () => {
        if (!roomId) return;
        const r = await fetch(`/api/v1/rooms/${roomId}/x-chat/session`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "end" }),
        });
        if ((await r.json()).success) { setSessionActive(false); setSessionStart(null); }
    };

    const handleReactionSend = async () => {
        if (!pending || !roomId) return;
        try {
            if (pending.reactionType === "voice_note_boost" || pending.reactionType === "choose_topic" || pending.reactionType === "private_question" || pending.reactionType === "mini_chat" || pending.reactionType === "shoutout") {
                const r = await fetch(`/api/v1/rooms/${roomId}/x-chat/request`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        message: `${pending.label}: ${voicePrompt}`, 
                        request_label: pending.label,
                        amount: pending.price, 
                        session_id: urlSessionId 
                    }),
                });
                const d = await r.json();
                if (d.success) { toast.success(`${pending.label} request sent!`); setVoicePrompt(""); refresh?.(); }
                else { toast.error(d.error || "Failed"); throw new Error(d.error); }
                return;
            }
            const r = await fetch(`/api/v1/rooms/${roomId}/x-chat/reaction`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reactionType: pending.reactionType, amount: pending.price, session_id: urlSessionId, message: voicePrompt }),
            });
            const d = await r.json();
            if (d.success) {
                toast.success(`${pending.emoji || "✨"} ${pending.label} sent!`);
                refresh?.();
                if (pending.emoji) { setAnimatingEmoji(pending.emoji); setTimeout(() => setAnimatingEmoji(null), 1500); }
            } else { toast.error(d.error || "Failed"); throw new Error(d.error); }
        } catch (err) { throw err; }
    };

    /* ── header status badge ────────────────────────────── */
    const renderStatus = () => {
        if (requestStatus === "none") return null;
        if (requestStatus === "pending") return (
            <div className="xchat-header-btn xchat-header-btn--yellow">
                <Clock size={13} className="animate-pulse" /> Request Pending…
            </div>
        );
        if (requestStatus === "accepted" && sessionActive) return (
            <div className="flex items-center gap-2">
                <div className="xchat-header-btn xchat-header-btn--green">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live — {formatTime(elapsed)}
                </div>
                <span className="text-gold font-bold text-sm">{cs()}{runningCharge}</span>
                <button onClick={endSession} className="xchat-header-btn xchat-header-btn--red">End Session</button>
            </div>
        );
        if (requestStatus === "declined") return (
            <div className="xchat-header-btn xchat-header-btn--red">
                <XCircle size={13} /> Request Declined
            </div>
        );
        return null;
    };

    /* ── ═══════════════════════════════════ RENDER ══════════ */
    const mobileRow1 = [
        reactionsRow1[0], // Boost
        reactionsRow1[1], // Shine
        stickersRow1[0],  // Kiss
        stickersRow1[1],  // Tease
        reactionsRow2[0], // Crown
    ];
    const mobileRow2 = [
        reactionsRow2[1], // Pulse
        stickersRow2[0],  // Rose
        stickersRow2[1],  // Gift
    ];

    if (sessionStatus === 'pending') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] text-white relative xchat-page">
                <div className="absolute inset-0" style={{ backgroundImage: "url(/x-chat/casino-bg.jpeg)", backgroundSize: "cover", opacity: 0.3 }} />
                <div className="absolute inset-0 bg-black/60" />
                
                <button onClick={() => router.back()} className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all z-20">
                    <ArrowLeft size={18} />
                </button>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(255,215,0,0.3)]" />
                    <h1 className="text-3xl font-black text-[#FFD700] uppercase tracking-[0.2em] mb-3 text-center px-4" style={{ textShadow: "0 0 15px rgba(255,215,0,0.5)" }}>
                        Waiting for Creator
                    </h1>
                    <p className="text-white/60 text-sm font-medium tracking-wide uppercase">
                        The X-Chat session will begin shortly.
                    </p>
                </div>
            </div>
        );
    }

    if (sessionStatus === 'ended') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] text-white relative xchat-page">
                <div className="absolute inset-0" style={{ backgroundImage: "url(/x-chat/casino-bg.jpeg)", backgroundSize: "cover", opacity: 0.2, filter: "grayscale(100%)" }} />
                <div className="absolute inset-0 bg-black/80" />
                
                <div className="relative z-10 flex flex-col items-center bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-md">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 border border-white/10">
                        <span className="text-2xl opacity-50">❌</span>
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-3" style={{ textShadow: "0 0 15px rgba(255,255,255,0.3)" }}>
                        Session Ended
                    </h1>
                    <p className="text-white/50 text-sm font-medium mb-8 uppercase tracking-wider">
                        This X-Chat session has concluded.
                    </p>
                    <button onClick={() => router.back()} className="px-8 py-3 rounded-full bg-[#FFD700] text-black font-bold tracking-widest uppercase hover:brightness-110 transition-all text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (isMobile) {
        const allMobileReactions = [
            ...reactionsRow1,
            ...stickersRow1,
            ...reactionsRow2,
            ...stickersRow2,
        ];

        return (
            <ProtectRoute allowedRoles={["fan"]}>
                <div className="xchat-mobile-shell">
                    {/* MOBILE HEADER */}
                    <header className="mobile-header">
                        <div className="mobile-header-left">
                            <button onClick={() => router.push("/home")} className="mobile-back-btn" data-tour="xchat-fan-back">
                                <ArrowLeft size={16} />
                            </button>
                            {roomId && (
                                <button onClick={() => setShowInviteModal(true)} className="mobile-invite-btn" data-tour="xchat-fan-invite">
                                    <UserPlus size={14} />
                                    <span>Invite</span>
                                </button>
                            )}
                        </div>
                        <div className="mobile-header-right">
                            {renderStatus()}
                            {roomId && <IncomingReplies roomId={roomId} sessionId={urlSessionId} />}
                            <WalletPill />
                        </div>
                    </header>

                    {/* MOBILE BODY */}
                    <div className="mobile-body">
                        {/* 1. VIDEO stage */}
                        <div className="mobile-canvas-container" data-tour="xchat-fan-video-area">
                            {roomId && user && hostId ? (
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
                                <div className="mobile-canvas-placeholder">
                                    <div className="mobile-avatar-ring">
                                        {hostAvatar
                                            ? <img src={hostAvatar} alt={hostName} className="w-full h-full object-cover" />
                                            : <span className="text-3xl">✨</span>}
                                    </div>
                                    <p className="mobile-host-name">{hostName}</p>
                                    <p className="mobile-host-status">• • • SETTING UP • • •</p>
                                </div>
                            )}

                            {/* PIP self-view */}
                            {sessionActive && user && (
                                <div className="mobile-pip">
                                    <LiveStreamWrapper
                                        role="host"
                                        appId={APP_ID}
                                        roomId={`${roomId}_fan`}
                                        uid={user.id}
                                        hostId={user.id}
                                        hostAvatarUrl={user?.user_metadata?.avatar_url || ""}
                                        hostName="You"
                                    />
                                    <span className="mobile-pip-label">You</span>
                                </div>
                            )}

                            {/* Overlaid Badges */}
                            <div className="mobile-canvas-badges">
                                <div className="mobile-live-badge">
                                    <span className="mobile-live-dot animate-pulse" />
                                    <span className="mobile-live-text">LIVE</span>
                                </div>
                                <div className="mobile-viewer-badge">
                                    <Eye size={11} />
                                    <span>123</span>
                                </div>
                            </div>

                            <button className="mobile-canvas-expand-btn">
                                <FullscreenIcon />
                            </button>

                            {/* floating emoji burst */}
                            {animatingEmoji && (
                                <div className="mobile-emoji-burst">
                                    <span>{animatingEmoji}</span>
                                </div>
                            )}
                        </div>

                        {/* 2. REACTIONS & TIPS */}
                        <div className="mobile-reactions-card" data-tour="xchat-fan-paid-reactions" data-tour-match="xchat-fan-paid-stickers">
                            <span className="mobile-section-label">Reactions & Tips</span>
                            <div className="mobile-reactions-scroll-row">
                                {allMobileReactions.map(r => (
                                    <MobileReactionButton 
                                        key={r.type} 
                                        emoji={r.emoji} 
                                        label={r.label} 
                                        price={r.price} 
                                        onClick={() => setPending({ label: r.label, price: r.price, reactionType: r.type, emoji: r.emoji })} 
                                    />
                                ))}
                            </div>
                        </div>

                        {/* 3. TABBED CONTENT CONTAINER */}
                        <div className="mobile-tab-content-container">
                            {activeTab === "chat" && (
                                <div className="mobile-chat-container">
                                    <ChatPanel roomId={roomId} hostName={hostName} sessionId={urlSessionId} isMobile={true} />
                                </div>
                            )}
                            
                            {activeTab === "boosts" && (
                                <div className="mobile-boosts-scroll-area">
                                    {/* Visibility Boosts */}
                                    <div className="mobile-boost-card" data-tour="xchat-fan-visibility-boosts">
                                        <div className="mobile-boost-header">
                                            <Eye size={12} className="mobile-boost-header-icon" />
                                            <span className="mobile-boost-title">Visibility Boosts</span>
                                        </div>
                                        <div className="mobile-boost-list">
                                            {visibilityBoosts.map(b => (
                                                <button 
                                                    key={b.type} 
                                                    onClick={() => setPending({ label: b.label, price: b.price, reactionType: b.type })} 
                                                    className="mobile-boost-row"
                                                >
                                                    <div className="mobile-boost-row-left">
                                                        <div className={`mobile-boost-icon-circle ${b.colorClass || ''}`}>
                                                            <b.icon size={13} className="mobile-animated-icon" />
                                                        </div>
                                                        <span className="mobile-boost-label">{b.label}</span>
                                                    </div>
                                                    <span className="mobile-boost-price">{cs()}{b.price}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Direct Access */}
                                    <div className="mobile-boost-card" data-tour="xchat-fan-direct-access">
                                        <div className="mobile-boost-header">
                                            <Zap size={12} className="mobile-boost-header-icon" />
                                            <span className="mobile-boost-title">Direct Access</span>
                                        </div>
                                        <div className="mobile-boost-list">
                                            {directAccess.map(d => (
                                                <button 
                                                    key={d.type} 
                                                    onClick={() => setPending({ label: d.label, price: d.price, reactionType: d.type })} 
                                                    className="mobile-boost-row"
                                                >
                                                    <div className="mobile-boost-row-left">
                                                        <div className={`mobile-boost-icon-circle ${d.colorClass || ''}`}>
                                                            <d.icon size={13} className="mobile-animated-icon" />
                                                        </div>
                                                        <span className="mobile-boost-label">{d.label}</span>
                                                    </div>
                                                    <span className="mobile-boost-price">{cs()}{d.price}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "info" && (
                                <div className="mobile-info-scroll-area">
                                    <div className="mobile-host-info-card">
                                        <div className="mobile-host-avatar-ring">
                                            {hostAvatar ? (
                                                <img src={hostAvatar} alt={hostName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-4xl">✨</span>
                                            )}
                                        </div>
                                        <h3 className="mobile-host-name-title">{hostName}</h3>
                                        <p className="mobile-host-role-badge">Room Creator</p>
                                        
                                        <div className="mobile-info-divider" />
                                        
                                        <div className="mobile-info-stats">
                                            <div className="mobile-info-stat-item">
                                                <span className="stat-label">Session ID</span>
                                                <span className="stat-value truncate max-w-[120px]">{urlSessionId || "N/A"}</span>
                                            </div>
                                            <div className="mobile-info-stat-item">
                                                <span className="stat-label">Active Status</span>
                                                <span className="stat-value text-green-400">Live</span>
                                            </div>
                                        </div>

                                        <div className="mobile-info-actions">
                                            {requestStatus === "none" && (
                                                <button 
                                                    onClick={sendRequest} 
                                                    disabled={requestLoading}
                                                    className="mobile-action-req-btn"
                                                >
                                                    {requestLoading ? <Loader2 className="animate-spin" size={14} /> : "Request to Chat"}
                                                </button>
                                            )}
                                            {requestStatus === "pending" && (
                                                <div className="mobile-info-status-pending">
                                                    <Clock size={13} className="animate-pulse" /> Request Pending…
                                                </div>
                                            )}
                                            {requestStatus === "accepted" && (
                                                <div className="mobile-info-status-accepted">
                                                    Active session in progress
                                                </div>
                                            )}
                                            {requestStatus === "declined" && (
                                                <div className="mobile-info-status-declined">
                                                    Request Declined
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PERSISTENT BOTTOM NAVIGATION BAR */}
                    <MobileStudioTabs
                        tabs={mappedTabs}
                        activeTab={activeTab}
                        onTabChange={(tabId) => setActiveTab(tabId as any)}
                        accentHsl="45, 90%, 55%"
                    />

                    {/* Spend Confirm Modal */}
                    <SpendConfirmModal
                        isOpen={!!pending}
                        onClose={() => { setPending(null); setVoicePrompt(""); }}
                        title={
                            ["voice_note_boost", "choose_topic", "private_question", "mini_chat", "shoutout"].includes(pending?.reactionType || "") 
                                ? `Request ${pending?.label}` 
                                : "Confirm Purchase"
                        }
                        itemLabel={pending ? `${pending.emoji || ""} ${pending.label}` : ""}
                        amount={pending?.price || 0}
                        walletBalance={balance}
                        onConfirm={handleReactionSend}
                        requireInput={["voice_note_boost", "choose_topic", "private_question", "mini_chat", "shoutout"].includes(pending?.reactionType || "")}
                        allowInput={true}
                        inputPlaceholder={
                            pending?.reactionType === "voice_note_boost" ? "What should the voice note be about?" : 
                            pending?.reactionType === "choose_topic" ? "What topic do you want to choose?" : 
                            pending?.reactionType === "private_question" ? "Type your private question here..." :
                            pending?.reactionType === "mini_chat" ? "What do you want the creator to wear?" :
                            pending?.reactionType === "shoutout" ? "What name should the creator say?" :
                            "Add an optional message..."
                        }
                        inputValue={voicePrompt}
                        onInputChange={setVoicePrompt}
                    />

                    <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} roomId={roomId} />
                    <InvitationPopup />

                    {/* Per-minute billing overlay */}
                    <BillingOverlay
                        sessionId={urlSessionId}
                        accentHsl="45, 100%, 50%"
                        exitRoute="/home"
                    />
                </div>
            </ProtectRoute>
        );
    }

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            {/* page wrapper */}
            <div className="xchat-page" style={{ backgroundImage: "url(/x-chat/casino-bg.jpeg)" }}>
                <div className="xchat-overlay" />

                <div className="xchat-shell">

                    {/* ── HEADER ──────────────────────────────────── */}
                    <header className="xchat-header">
                        <div className="xchat-header-left">
                            <button onClick={() => router.push("/home")} className="xchat-back-btn" data-tour="xchat-fan-back">
                                <ArrowLeft size={15} />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                            {roomId && (
                                <button onClick={() => setShowInviteModal(true)} className="xchat-invite-btn" data-tour="xchat-fan-invite">
                                    <UserPlus size={13} />
                                    <span className="hidden sm:inline">Invite</span>
                                </button>
                            )}
                            <h1 className="xchat-title">
                                <span className="hidden xs:inline">X Chat Room</span>
                                <span className="xs:hidden">X Chat</span>
                            </h1>
                        </div>
                        <div className="xchat-header-right" data-tour="xchat-fan-top-bar">
                            <RoomTourHelpButton tourType="xchat_fan" accentHsl="45, 90%, 55%" />
                            {renderStatus()}
                            {roomId && <IncomingReplies roomId={roomId} sessionId={urlSessionId} />}
                            <WalletPill />
                        </div>
                    </header>

                    {/* ── BODY: centered container holding both columns ── */}
                    <div className="xchat-body">
                      <div className="xchat-container">

                        {/* ── LEFT PANEL ────────────────────────────── */}
                        <div className="xchat-left">

                            {/* CANVAS */}
                            <div className="xchat-canvas" data-tour="xchat-fan-video-area">
                                {roomId && user && hostId ? (
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
                                    <div className="xchat-canvas-placeholder">
                                        <div className="xchat-avatar-ring">
                                            {hostAvatar
                                                ? <img src={hostAvatar} alt={hostName} className="w-full h-full object-cover" />
                                                : <span className="text-3xl">✨</span>}
                                        </div>
                                        <p className="xchat-host-name">{hostName}</p>
                                        <p className="xchat-host-status">• • • SETTING UP • • •</p>
                                    </div>
                                )}

                                {/* PIP self-view */}
                                {sessionActive && user && (
                                    <div className="xchat-pip">
                                        <LiveStreamWrapper
                                            role="host"
                                            appId={APP_ID}
                                            roomId={`${roomId}_fan`}
                                            uid={user.id}
                                            hostId={user.id}
                                            hostAvatarUrl={user?.user_metadata?.avatar_url || ""}
                                            hostName="You"
                                        />
                                        <span className="xchat-pip-label">You</span>
                                    </div>
                                )}

                                {/* floating emoji burst */}
                                {animatingEmoji && (
                                    <div className="xchat-emoji-burst">
                                        <span>{animatingEmoji}</span>
                                    </div>
                                )}

                            </div>

                            {/* PAID REACTIONS – ROW 1 */}
                            <div className="xchat-reaction-card" data-tour="xchat-fan-paid-reactions">
                                <div className="xchat-reaction-half xchat-reaction-half--left">
                                    <span className="xchat-section-label">Paid Reactions</span>
                                    <div className="xchat-chip-row">
                                        {reactionsRow1.map(r => (
                                            <ReactionChip key={r.type} {...r}
                                                onClick={() => setPending({ label: r.label, price: r.price, reactionType: r.type, emoji: r.emoji })} />
                                        ))}
                                    </div>
                                </div>
                                <div className="xchat-reaction-divider" />
                                <div className="xchat-reaction-half xchat-reaction-half--right" data-tour="xchat-fan-paid-stickers">
                                    <span className="xchat-section-label">Paid Stickers</span>
                                    <div className="xchat-chip-row">
                                        {stickersRow1.map(s => (
                                            <ReactionChip key={s.type} {...s}
                                                onClick={() => setPending({ label: s.label, price: s.price, reactionType: s.type, emoji: s.emoji })} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* PAID REACTIONS – ROW 2 (paid reaction section) */}
                            <div className="xchat-reaction-card">
                                <div className="xchat-reaction-half xchat-reaction-half--left">
                                    <div className="xchat-chip-row">
                                        {reactionsRow2.map(r => (
                                            <ReactionChip key={r.type} {...r}
                                                onClick={() => setPending({ label: r.label, price: r.price, reactionType: r.type, emoji: r.emoji })} />
                                        ))}
                                    </div>
                                </div>
                                <div className="xchat-reaction-divider" />
                                <div className="xchat-reaction-half xchat-reaction-half--right">
                                    <div className="xchat-chip-row">
                                        {stickersRow2.map(s => (
                                            <ReactionChip key={s.type} {...s}
                                                onClick={() => setPending({ label: s.label, price: s.price, reactionType: s.type, emoji: s.emoji })} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* VISIBILITY BOOSTS + DIRECT ACCESS */}
                            <div className="xchat-bottom-row">
                                {/* Visibility Boosts */}
                                <div className="xchat-boost-card" data-tour="xchat-fan-visibility-boosts">
                                    <div className="xchat-section-header">
                                        <Eye size={14} className="xchat-section-header-icon" />
                                        <span className="xchat-section-label" style={{ marginBottom: 0 }}>Visibility Boosts</span>
                                    </div>
                                    <div className="xchat-boost-list">
                                        {visibilityBoosts.map(b => (
                                            <BoostRow key={b.type} {...b}
                                                onClick={() => setPending({ label: b.label, price: b.price, reactionType: b.type })} />
                                        ))}
                                    </div>
                                </div>

                                {/* Direct Access */}
                                <div className="xchat-boost-card" data-tour="xchat-fan-direct-access">
                                    <div className="xchat-section-header">
                                        <Zap size={14} className="xchat-section-header-icon" />
                                        <span className="xchat-section-label" style={{ marginBottom: 0 }}>Direct Access</span>
                                    </div>
                                    <div className="xchat-boost-list">
                                        {directAccess.map(d => (
                                            <BoostRow key={d.type} {...d}
                                                onClick={() => setPending({ label: d.label, price: d.price, reactionType: d.type })} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT PANEL: Chat ──────────────────────── */}
                        <div className="xchat-right">
                            <ChatPanel roomId={roomId} hostName={hostName} sessionId={urlSessionId} />
                        </div>

                      </div>{/* /xchat-container */}
                    </div>{/* /xchat-body */}
                </div>

                {/* Spend Confirm Modal */}
                <SpendConfirmModal
                    isOpen={!!pending}
                    onClose={() => { setPending(null); setVoicePrompt(""); }}
                    title={
                        ["voice_note_boost", "choose_topic", "private_question", "mini_chat", "shoutout"].includes(pending?.reactionType || "") 
                            ? `Request ${pending?.label}` 
                            : "Confirm Purchase"
                    }
                    itemLabel={pending ? `${pending.emoji || ""} ${pending.label}` : ""}
                    amount={pending?.price || 0}
                    walletBalance={balance}
                    onConfirm={handleReactionSend}
                    requireInput={["voice_note_boost", "choose_topic", "private_question", "mini_chat", "shoutout"].includes(pending?.reactionType || "")}
                    allowInput={true}
                    inputPlaceholder={
                        pending?.reactionType === "voice_note_boost" ? "What should the voice note be about?" : 
                        pending?.reactionType === "choose_topic" ? "What topic do you want to choose?" : 
                        pending?.reactionType === "private_question" ? "Type your private question here..." :
                        pending?.reactionType === "mini_chat" ? "What do you want the creator to wear?" :
                        pending?.reactionType === "shoutout" ? "What name should the creator say?" :
                        "Add an optional message..."
                    }
                    inputValue={voicePrompt}
                    onInputChange={setVoicePrompt}
                />

                <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} roomId={roomId} />
                <InvitationPopup />

                {/* Per-minute billing overlay */}
                <BillingOverlay
                    sessionId={urlSessionId}
                    accentHsl="45, 100%, 50%"
                    exitRoute="/home"
                />

            </div>
        </ProtectRoute>
    );
};

export default XChatRoom;
