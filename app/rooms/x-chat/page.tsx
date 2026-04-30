"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Clock, XCircle, Loader2, UserPlus } from "lucide-react";
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

const LiveStreamWrapper = dynamic(
    () => import("@/components/rooms/LiveStreamWrapper"),
    { ssr: false }
);
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

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
    { label: "Pin my name to top (1 min)", price: 25, type: "pin" },
    { label: "Voice note reply",           price: 35, type: "voice_note_boost" },
];
const directAccess = [
    { label: "Private question",       price: 20, type: "private_question" },
    { label: "1:1 mini chat (2 min)",  price: 60, type: "mini_chat" },
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
        <span className="xchat-chip-price">€{price}</span>
    </button>
);

/* ─── boost row chip ─────────────────────────────────────── */
const BoostRow = ({
    label, price, onClick,
}: { label: string; price: number; onClick: () => void }) => (
    <button onClick={onClick} className="xchat-boost-row">
        <span className="xchat-boost-label">{label}</span>
        <span className="xchat-boost-price">€{price}</span>
    </button>
);

/* ═══════════════════════════════════════════════════════════ */
const XChatRoom = () => {
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const urlRoomId = searchParams?.get("roomId");
    const urlSessionId = searchParams?.get("sessionId");
    const supabase = createClient();
    const { balance, refresh } = useWallet();

    const [roomId, setRoomId]       = useState<string | null>(urlRoomId || null);
    const [hostId, setHostId]       = useState<string | null>(null);
    const [hostAvatar, setHostAvatar] = useState<string | null>(null);
    const [hostName, setHostName]   = useState("Loading...");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── request subscription ───────────────────────────── */
    useEffect(() => {
        if (!roomId || !user) return;
        (async () => {
            const { data: ex } = await supabase.from("x_chat_requests")
                .select("id, status").eq("room_id", roomId).eq("fan_id", user.id)
                .order("created_at", { ascending: false }).limit(1).single();
            if (ex) setRequestStatus(ex.status as RequestStatus);
        })();
        const ch = supabase.channel(`xchat-req-${roomId}-${user.id}`)
            .on("postgres_changes", {
                event: "UPDATE", schema: "public",
                table: "x_chat_requests", filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const u = payload.new as any;
                if (u.fan_id === user.id) setRequestStatus(u.status);
            }).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [roomId, user]);

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
                body: JSON.stringify({ message: "Wants to chat" }),
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
            if (pending.reactionType === "voice_note_boost") {
                const r = await fetch(`/api/v1/rooms/${roomId}/x-chat/request`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: `Voice Note Reply: ${voicePrompt}`, amount: pending.price }),
                });
                const d = await r.json();
                if (d.success) { toast.success("Voice note request sent!"); setVoicePrompt(""); refresh?.(); }
                else { toast.error(d.error || "Failed"); throw new Error(d.error); }
                return;
            }
            const r = await fetch(`/api/v1/rooms/${roomId}/x-chat/reaction`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reactionType: pending.reactionType, amount: pending.price }),
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
        if (requestStatus === "none") return (
            <button onClick={sendRequest} disabled={!roomId || requestLoading}
                className="xchat-header-btn xchat-header-btn--blue">
                {requestLoading ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                Invite Creator
            </button>
        );
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
                <span className="text-gold font-bold text-sm">€{runningCharge}</span>
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

    /* ═══════════════════════════════════ RENDER ══════════ */
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

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            {/* page wrapper */}
            <div className="xchat-page" style={{ backgroundImage: "url(/x-chat/casino-bg.jpeg)" }}>
                <div className="xchat-overlay" />

                <div className="xchat-shell">

                    {/* ── HEADER ──────────────────────────────────── */}
                    <header className="xchat-header">
                        <div className="xchat-header-left">
                            <button onClick={() => router.push("/home")} className="xchat-back-btn">
                                <ArrowLeft size={15} />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                            {roomId && (
                                <button onClick={() => setShowInviteModal(true)} className="xchat-invite-btn">
                                    <UserPlus size={13} />
                                    <span className="hidden sm:inline">Invite</span>
                                </button>
                            )}
                            <h1 className="xchat-title">
                                <span className="hidden xs:inline">X Chat Room</span>
                                <span className="xs:hidden">X Chat</span>
                            </h1>
                        </div>
                        <div className="xchat-header-right">
                            {renderStatus()}
                            {roomId && <IncomingReplies roomId={roomId} />}
                            <WalletPill />
                        </div>
                    </header>

                    {/* ── BODY: centered container holding both columns ── */}
                    <div className="xchat-body">
                      <div className="xchat-container">

                        {/* ── LEFT PANEL ────────────────────────────── */}
                        <div className="xchat-left">

                            {/* CANVAS */}
                            <div className="xchat-canvas">
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

                                {/* canvas label */}
                                <div className="xchat-canvas-label">canvas area</div>
                            </div>

                            {/* PAID REACTIONS – ROW 1 */}
                            <div className="xchat-reaction-card">
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
                                <div className="xchat-reaction-half xchat-reaction-half--right">
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
                                <div className="xchat-boost-card">
                                    <span className="xchat-section-label">Visibility Boosts</span>
                                    <div className="xchat-boost-list">
                                        {visibilityBoosts.map(b => (
                                            <BoostRow key={b.type} {...b}
                                                onClick={() => setPending({ label: b.label, price: b.price, reactionType: b.type })} />
                                        ))}
                                    </div>
                                </div>

                                {/* Direct Access */}
                                <div className="xchat-boost-card">
                                    <span className="xchat-section-label">Direct Access</span>
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
                    title={pending?.reactionType === "voice_note_boost" ? "Request Voice Note" : "Confirm Purchase"}
                    itemLabel={pending ? `${pending.emoji || ""} ${pending.label}` : ""}
                    amount={pending?.price || 0}
                    walletBalance={balance}
                    onConfirm={handleReactionSend}
                    requireInput={pending?.reactionType === "voice_note_boost"}
                    inputPlaceholder="What should the voice note be about?"
                    inputValue={voicePrompt}
                    onInputChange={setVoicePrompt}
                />

                <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} roomId={roomId} />
                <InvitationPopup />

                {/* Per-Minute Billing */}
                <BillingOverlay
                    sessionId={urlSessionId}
                    accentHsl="45, 100%, 50%"
                    rateLabel="€2/min"
                    exitRoute="/rooms/x-chat-sessions"
                />
            </div>
        </ProtectRoute>
    );
};

export default XChatRoom;
