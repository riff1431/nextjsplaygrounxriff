"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useBarChat } from "@/hooks/useBarChat";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/app/context/AuthContext";
import { usePrivateCall } from "@/hooks/usePrivateCall";
import WalletPill from "@/components/common/WalletPill";
import InviteModal from "@/components/rooms/InviteModal";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import dynamic from "next/dynamic";
import VipDeliveryModal from "@/components/rooms/pgx-page2/VipDeliveryModal";
import { Heart, Wine, Crown, Sparkles, ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle, UserPlus, Bell, X, Clock, Phone } from "lucide-react";
import EmojiPicker from "@/components/common/EmojiPicker";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";
import { cs } from "@/utils/currency";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const PrivateCallFanModal = dynamic(() => import("@/components/rooms/suga4u/PrivateCallFanModal"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? "";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Design tokens — exact from reference index.css
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const BG = "hsl(270,50%,8%)";
const FG = "hsl(45,100%,95%)";
const GOLD = "hsl(42,90%,55%)";
const PINK = "hsl(320,100%,65%)";
const PURPLE = "hsl(280,100%,70%)";
const MUTED = "hsl(270,20%,65%)";

const glassPanel: React.CSSProperties = {
    background: "hsla(270,40%,15%,0.2)",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    border: "1px solid hsla(280,60%,45%,0.25)", borderRadius: "0.75rem",
};
const glowPurple: React.CSSProperties = { boxShadow: "0 0 15px hsla(280,100%,70%,0.4), 0 0 40px hsla(280,100%,70%,0.15), inset 0 0 15px hsla(280,100%,70%,0.05)" };
const glowGold: React.CSSProperties = { boxShadow: "0 0 15px hsla(42,90%,55%,0.4), 0 0 40px hsla(42,90%,55%,0.15)" };
const glowPink: React.CSSProperties = { boxShadow: "0 0 15px hsla(320,100%,65%,0.4), 0 0 40px hsla(320,100%,65%,0.15)" };
const glowTextGold: React.CSSProperties = { textShadow: "0 0 10px hsla(42,90%,55%,0.6), 0 0 30px hsla(42,90%,55%,0.3)" };

const drinkItem: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", borderRadius: "0.5rem", cursor: "pointer",
    transition: "all 0.2s", background: "hsla(270,40%,15%,0.3)",
    border: "1px solid hsla(280,60%,45%,0.2)", marginBottom: "0",
};
const chatMsg: React.CSSProperties = {
    padding: "8px 12px", borderRadius: "0.5rem", marginBottom: "8px",
    background: "hsla(270,40%,15%,0.3)", border: "1px solid hsla(280,60%,45%,0.15)",
};
const tipBtn: React.CSSProperties = {
    padding: "8px 16px", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer",
    transition: "all 0.2s", background: "hsla(270,40%,15%,0.4)",
    border: "1px solid hsla(280,60%,45%,0.3)", color: FG,
};
const btnGold: React.CSSProperties = {
    background: "linear-gradient(135deg, hsla(42,90%,55%,0.9), hsla(42,80%,45%,0.9))",
    border: "1px solid hsla(42,90%,55%,0.5)", color: BG, fontWeight: 600,
    borderRadius: "0.5rem", cursor: "pointer",
};
const btnGlow: React.CSSProperties = {
    position: "relative", overflow: "hidden", transition: "all 0.3s",
    background: "linear-gradient(135deg, hsla(280,80%,55%,0.8), hsla(320,80%,60%,0.8))",
    border: "1px solid hsla(280,60%,45%,0.5)", borderRadius: "0.5rem",
    cursor: "pointer", color: FG, fontWeight: 700,
};
const liveBadge: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
    background: "hsla(140,70%,45%,0.2)", border: "1px solid hsla(140,70%,45%,0.4)",
    color: "hsl(140,70%,55%)",
};

const DEFAULT_DRINKS = [
    { id: "d1", name: "VIP Bottle", price: 550, icon: "🍾" },
    { id: "d2", name: "Champagne", price: 250, icon: "🥂" },
    { id: "d3", name: "69 Bar Shot", price: 50, icon: "♋" },
    { id: "d4", name: "Blowjob Shot", price: 50, icon: "😮\u200d💨" },
    { id: "d5", name: "Pornstar Shot", price: 50, icon: "🌟" },
    { id: "d6", name: "Quickie Shot", price: 50, icon: "⏱️" },
    { id: "d7", name: "Liquid Lust Shot", price: 50, icon: "❤️\u200d🔥" },
    { id: "d8", name: "Cream & Scream Shot", price: 50, icon: "🍦" },
    { id: "d9", name: "Temptation Shot", price: 50, icon: "🍎" },
];

/* ── Toast system ─────────────────────────────────────────────────── */
type ToastKind = "success" | "error" | "info";
interface Toast { id: number; msg: string; kind: ToastKind; }

function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const push = useCallback((msg: string, kind: ToastKind = "success") => {
        const id = Date.now() + Math.random();
        setToasts(p => [...p, { id, msg, kind }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    }, []);
    return { toasts, push };
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
    if (!toasts.length) return null;
    return (
        <div style={{ position: "fixed", top: "80px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px", pointerEvents: "none" }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "12px 18px", borderRadius: "0.75rem",
                    backdropFilter: "blur(16px)",
                    background: t.kind === "success" ? "hsla(140,60%,20%,0.95)" : t.kind === "error" ? "hsla(0,60%,20%,0.95)" : "hsla(270,60%,20%,0.95)",
                    border: t.kind === "success" ? "1px solid hsla(140,70%,45%,0.5)" : t.kind === "error" ? "1px solid hsla(0,70%,55%,0.5)" : "1px solid hsla(280,70%,55%,0.5)",
                    boxShadow: t.kind === "success" ? "0 0 20px hsla(140,70%,45%,0.3)" : t.kind === "error" ? "0 0 20px hsla(0,70%,55%,0.3)" : "0 0 20px hsla(280,70%,55%,0.3)",
                    color: FG, fontFamily: "'Montserrat', sans-serif", fontSize: "14px", fontWeight: 500,
                    animation: "pg2-slideIn 0.3s ease",
                    minWidth: "280px", maxWidth: "360px",
                }}>
                    {t.kind === "success" && <CheckCircle style={{ width: "18px", height: "18px", color: "hsl(140,70%,55%)", flexShrink: 0 }} />}
                    {t.kind === "error" && <XCircle style={{ width: "18px", height: "18px", color: "hsl(0,80%,65%)", flexShrink: 0 }} />}
                    {t.kind === "info" && <AlertCircle style={{ width: "18px", height: "18px", color: PURPLE, flexShrink: 0 }} />}
                    <span>{t.msg}</span>
                </div>
            ))}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════ */
function PgxPage2Inner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { balance, pay, refresh: refreshWallet } = useWallet();
    const { toasts, push: showToast } = useToasts();

    const roomId = searchParams.get("roomId");
    const hostId = searchParams.get("hostId");
    const sessionId = searchParams.get("sessionId");

    const [hostProfile, setHostProfile] = useState<{ full_name?: string; username?: string; avatar_url?: string } | null>(null);
    const [drinks, setDrinks] = useState<any[]>(DEFAULT_DRINKS);
    const [vipPrice, setVipPrice] = useState(150);
    const [customRequestShortcuts, setCustomRequestShortcuts] = useState<string[]>(["Show me boobs", "Do something spicy", "Change outfit", "Dance for me"]);
    const [isLoading, setIsLoading] = useState(true);
    const [tipAmount, setTipAmount] = useState<number | string>("");
    const [buying, setBuying] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showIncomingPanel, setShowIncomingPanel] = useState(false);
    const [incomingItems, setIncomingItems] = useState<any[]>([]);
    const [unseenCount, setUnseenCount] = useState(0);
    const [currentTime, setCurrentTime] = useState(Date.now());
    // Track VIP/booth request statuses
    const [vipRequestStatus, setVipRequestStatus] = useState<'idle' | 'pending' | 'accepted' | 'declined'>('idle');
    const [boothRequestStatus, setBoothRequestStatus] = useState<'idle' | 'pending' | 'accepted' | 'declined'>('idle');

    // Private 1-on-1 call
    const privateCall = usePrivateCall(roomId, user?.id || null, "fan");
    const [showPrivateCallConfirm, setShowPrivateCallConfirm] = useState(false);
    const PRIVATE_CALL_PRICE = 500;

    // Custom Request
    const [customReqText, setCustomReqText] = useState("");
    const [customReqAmount, setCustomReqAmount] = useState<number | string>("");
    
    // VIP Delivery
    const [vipDeliveryOpen, setVipDeliveryOpen] = useState(false);
    const [vipDeliveryData, setVipDeliveryData] = useState<any>(null);

    // Helper: safely parse creator_reply whether it's a JSONB object, JSON string, or plain text
    const parseCreatorReply = useCallback((raw: any): { text?: string; mediaUrl?: string; mediaType?: string } | null => {
        if (!raw) return null;
        if (typeof raw === 'object') return raw; // Already parsed JSONB
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch { return { text: raw }; }
        }
        return null;
    }, []);

    // Update time every 10 seconds to refresh the pinned message timer
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    // Session Status Gating
    const [sessionStatus, setSessionStatus] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const { messages, sendMessage } = useBarChat(roomId, sessionId);

    // Find active pinned user
    const activePinMessage = useMemo(() => {
        // Search backwards to find the most recent pin message
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.is_system && m.content.includes("📌")) {
                const pinTime = new Date(m.created_at).getTime();
                // Check if it's within 10 minutes
                if (currentTime - pinTime <= 10 * 60 * 1000) {
                    return m;
                }
                // If the most recent one is expired, no older ones are active
                break;
            }
        }
        return null;
    }, [messages, currentTime]);

    // Session Status Gating — fetch initial status and subscribe to realtime updates
    useEffect(() => {
        if (!sessionId) {
            setSessionStatus('active');
            return;
        }

        const fetchSessionStatus = async () => {
            const { data } = await supabase.from('room_sessions').select('status, live_started_at').eq('id', sessionId).single();
            if (data) {
                if (data.status === 'ended') setSessionStatus('ended');
                else if (!data.live_started_at) setSessionStatus('pending');
                else setSessionStatus('active');
            }
        };
        fetchSessionStatus();

        const channel = supabase.channel(`session-status-${sessionId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
                const newData = payload.new;
                if (newData.status === 'ended') setSessionStatus('ended');
                else if (!newData.live_started_at) setSessionStatus('pending');
                else setSessionStatus('active');
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [sessionId, supabase]);

    /* ── Fetch session data ─── */
    useEffect(() => {
        if (!roomId) { setIsLoading(false); return; }
        let mounted = true;
        (async () => {
            try {
                if (hostId) {
                    const { data: p } = await supabase.from("profiles").select("full_name, username, avatar_url").eq("id", hostId).single();
                    if (mounted && p) setHostProfile(p);
                }
                const { data: cfg } = await supabase.from("admin_bar_config").select("*").eq("id", 1).single();
                if (mounted && cfg) {
                    if (cfg.menu_items?.length) setDrinks(cfg.menu_items);
                    if (cfg.vip_price) setVipPrice(cfg.vip_price);
                    if (cfg.custom_requests?.length) setCustomRequestShortcuts(cfg.custom_requests.filter((r: string) => r.toLowerCase() !== "say my name"));
                }
            } finally { if (mounted) setIsLoading(false); }
        })();
        return () => { mounted = false; };
    }, [roomId, hostId]);

    /* ── Viewer count ─── */
    useEffect(() => {
        if (!roomId) return;
        supabase.rpc("increment_viewer_count", { p_room_id: roomId, p_amount: 1 });
        return () => { supabase.rpc("increment_viewer_count", { p_room_id: roomId, p_amount: -1 }); };
    }, [roomId]);

    /* ── Room participant registration (for real-time fan count) ─── */
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
    }, [roomId, user]);

    /* ── Auto-scroll chat ─── */
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    /* ── PURCHASE / TIP / REQUEST ─── */
    const doPurchase = useCallback(async (type: string, label: string, price: number, itemId: string) => {
        if (!roomId || buying) return;
        setBuying(itemId);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/bar-lounge/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, label, amount: price, sessionId }),
            });
            const data = await res.json();
            if (data.success) {
                const isTipLike = ["drink", "tip", "champagne", "vip_bottle"].includes(type);
                const isRequest = ["vip", "booth"].includes(type);
                const emoji = type === "drink" ? "🍸" : type === "tip" ? "💰" : type === "vip" ? "👑" : type === "booth" ? "🛋️" : type === "pin" ? "📌" : "⚡";
                if (isRequest) {
                    if (type === "vip") setVipRequestStatus("pending");
                    if (type === "booth") setBoothRequestStatus("pending");
                    showToast(`${emoji} ${label} requested! Waiting for creator approval...`, "info");
                } else {
                    showToast(`${emoji} ${label} sent! -${cs()}${price} from your wallet`, "success");
                }
                await refreshWallet();
            } else {
                showToast(data.error === "Insufficient balance" ? "💸 Not enough balance. Top up your wallet!" : `Failed: ${data.error || "Unknown error"}`, "error");
            }
        } catch {
            showToast("Network error. Please try again.", "error");
        } finally {
            setBuying(null);
        }
    }, [roomId, buying, showToast, refreshWallet, sessionId]);

    const handleTip = (amount: number) => doPurchase("tip", `${cs()}${amount} Tip`, amount, `tip-${amount}`);
    const handleDrinkTip = (drink: any) => {
        const id = drink.id || drink.name;
        doPurchase("drink", drink.name, drink.price, id);
    };
    const handleCustomTip = () => {
        const a = Number(tipAmount);
        if (a > 0) { doPurchase("tip", `${cs()}${a} Tip`, a, `tip-custom`); setTipAmount(""); }
        else showToast("Enter a valid tip amount", "info");
    };
    const handleCustomRequest = () => {
        const text = customReqText.trim();
        if (!text) { showToast("Type your request message", "info"); return; }
        doPurchase("custom", text, 0, `custom-req-${Date.now()}`);
        setCustomReqText("");
    };

    // Subscribe to request status updates (for VIP/booth accept/decline from creator)
    useEffect(() => {
        if (!roomId || !user) return;
        const channel = supabase.channel(`bar-req-status-${roomId}-${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'bar_lounge_requests',
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const updated = payload.new as any;
                if (updated.fan_id !== user.id) return;
                const newStatus = updated.status as 'accepted' | 'declined';
                if (updated.type === 'vip') {
                    setVipRequestStatus(newStatus);
                    showToast(newStatus === 'accepted' ? '👑 VIP Upgrade approved! Welcome to the VIP Lounge!' : '❌ VIP Upgrade was declined', newStatus === 'accepted' ? 'success' : 'error');
                }
                if (updated.type === 'booth') {
                    setBoothRequestStatus(newStatus);
                    showToast(newStatus === 'accepted' ? '🛋️ Booth reserved! Enjoy your private time!' : '❌ Booth reservation was declined', newStatus === 'accepted' ? 'success' : 'error');
                }
                if (updated.type === 'custom') {
                    if (newStatus === 'accepted') {
                        const reply = parseCreatorReply(updated.creator_reply);
                        if (reply) {
                            // Creator attached media or text, open the delivery modal!
                            setVipDeliveryData({
                                creatorName: creatorName !== "[CreatorName]" ? creatorName : "Creator",
                                text: reply.text,
                                mediaUrl: reply.mediaUrl,
                                mediaType: reply.mediaType,
                                originalRequestLabel: updated.label || "Custom Request"
                            });
                            setVipDeliveryOpen(true);
                        } else {
                            // Standard text toast
                            showToast('📩 Custom request approved by creator!', 'success');
                        }
                    } else {
                        showToast('❌ Custom request was declined', 'error');
                    }
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, user, supabase, showToast]);

    /* ── Incoming notifications — fetch fan's own activity + realtime ─── */
    useEffect(() => {
        if (!roomId || !user) return;
        const fetchIncoming = async () => {
            let query = supabase
                .from("bar_lounge_requests")
                .select("*")
                .eq("room_id", roomId)
                .eq("fan_id", user.id)
                .order("created_at", { ascending: false })
                .limit(20);
            if (sessionId) query = query.eq("session_id", sessionId);
            const { data } = await query;
            if (data) setIncomingItems(data);
        };
        fetchIncoming();

        const channel = supabase
            .channel(`fan-incoming-${roomId}-${user.id}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "bar_lounge_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const item = payload.new as any;
                if (item.fan_id !== user.id) return;
                if (sessionId && item.session_id && item.session_id !== sessionId) return;
                setIncomingItems(prev => [item, ...prev].slice(0, 20));
                if (!showIncomingPanel) setUnseenCount(prev => prev + 1);
            })
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "bar_lounge_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const updated = payload.new as any;
                if (updated.fan_id !== user.id) return;
                setIncomingItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, user, sessionId, supabase]);

    const toggleIncomingPanel = () => {
        setShowIncomingPanel(prev => !prev);
        if (!showIncomingPanel) setUnseenCount(0);
    };

    const incomingTypeEmoji = (type: string) => {
        switch (type) {
            case "drink": return "🍸";
            case "tip": return "💰";
            case "vip": return "👑";
            case "booth": return "🛋️";
            case "pin": return "📌";
            case "custom": return "📩";
            default: return "⚡";
        }
    };

    const incomingStatusColor = (status: string) => {
        switch (status) {
            case "accepted": return { bg: "hsla(140,60%,20%,0.3)", border: "hsla(140,70%,45%,0.4)", text: "hsl(140,70%,55%)" };
            case "declined": return { bg: "hsla(0,60%,20%,0.3)", border: "hsla(0,70%,55%,0.4)", text: "hsl(0,70%,60%)" };
            case "pending": return { bg: "hsla(42,60%,20%,0.3)", border: "hsla(42,90%,55%,0.4)", text: GOLD };
            default: return { bg: "hsla(280,40%,20%,0.2)", border: "hsla(280,60%,45%,0.25)", text: MUTED };
        }
    };

    const formatTimeAgo = (dateStr?: string) => {
        if (!dateStr) return "";
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    const handleSendChat = () => {
        if (!chatInput.trim()) return;
        sendMessage(chatInput, user?.id, user?.user_metadata?.full_name || "Guest");
        setChatInput("");
    };

    const creatorName = hostProfile?.full_name || hostProfile?.username || "[CreatorName]";

    /* ── No session fallback ─── */
    if (!isLoading && !roomId) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG, fontFamily: "'Montserrat', sans-serif" }}>
                <div style={{ ...glassPanel, padding: "48px", textAlign: "center", maxWidth: "400px" }}>
                    <Wine style={{ width: "48px", height: "48px", color: `${GOLD}66`, margin: "0 auto 16px" }} />
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: GOLD, ...glowTextGold, marginBottom: "8px" }}>No Session Selected</h2>
                    <p style={{ color: MUTED, fontSize: "14px", marginBottom: "24px" }}>Pick an active Bar Lounge session from the lobby.</p>
                    <button onClick={() => router.push("/rooms/bar-lounge")} style={{ ...btnGold, padding: "12px 24px", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                        <ArrowLeft style={{ width: "16px", height: "16px" }} /> Go to Lobby
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
                <Loader2 style={{ width: "32px", height: "32px", color: PURPLE, animation: "spin 1s linear infinite" }} />
            </div>
        );
    }

    /* ── Session Status Gating — Waiting for Host ─── */
    if (sessionStatus === 'pending') {
        return (
            <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', fontFamily: "'Montserrat', sans-serif", color: FG }}>
                <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/rooms/bar-lounge/lounge-bg-v2.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2 }} />
                <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'hsla(270,50%,8%,0.8)' }} />
                
                <button onClick={() => router.push('/rooms/bar-lounge')} style={{ position: 'absolute', top: '24px', left: '24px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: 'hsla(0,0%,100%,0.1)', border: '1px solid hsla(0,0%,100%,0.1)', cursor: 'pointer', color: FG, zIndex: 20, transition: 'all 0.2s' }}>
                    <ArrowLeft style={{ width: '18px', height: '18px' }} />
                </button>

                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', border: `4px solid hsla(42,90%,55%,0.2)`, borderTopColor: GOLD, borderRadius: '9999px', animation: 'spin 1s linear infinite', marginBottom: '32px', boxShadow: `0 0 30px hsla(42,90%,55%,0.3)` }} />
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', textAlign: 'center', padding: '0 16px', ...glowTextGold, fontFamily: "'Playfair Display', serif" }}>
                        Waiting for Host
                    </h1>
                    <p style={{ color: 'hsla(0,0%,100%,0.6)', fontSize: '14px', fontWeight: 500, letterSpacing: '0.05em' }}>
                        The Bar Lounge session will begin shortly.
                    </p>
                </div>
            </div>
        );
    }

    /* ── Session Status Gating — Session Ended ─── */
    if (sessionStatus === 'ended') {
        return (
            <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', fontFamily: "'Montserrat', sans-serif", color: FG }}>
                <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/rooms/bar-lounge/lounge-bg-v2.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.1, filter: 'grayscale(100%)' }} />
                <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'hsla(270,50%,8%,0.9)' }} />
                
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'hsla(0,0%,100%,0.05)', border: '1px solid hsla(0,0%,100%,0.1)', padding: '40px', borderRadius: '24px', backdropFilter: 'blur(12px)' }}>
                    <div style={{ width: '64px', height: '64px', background: 'hsla(0,0%,100%,0.1)', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid hsla(0,0%,100%,0.1)' }}>
                        <span style={{ fontSize: '24px' }}>🍸</span>
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '12px', ...glowTextGold, fontFamily: "'Playfair Display', serif" }}>
                        Session Ended
                    </h1>
                    <p style={{ color: 'hsla(0,0%,100%,0.5)', fontSize: '14px', fontWeight: 500, marginBottom: '32px' }}>
                        This Bar Lounge session has concluded.
                    </p>
                    <button onClick={() => router.push('/rooms/bar-lounge')} style={{ ...btnGold, padding: '12px 32px', fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', boxShadow: `0 0 20px hsla(42,90%,55%,0.3)` }}>
                        Return to Lobby
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", fontFamily: "'Montserrat', sans-serif", color: FG }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
                @keyframes glow-pulse    { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
                @keyframes float         { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                @keyframes sparkle       { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
                @keyframes neon-flicker  { 0%, 100% { opacity:1; } 92%{opacity:1;} 93%{opacity:0.7;} 94%{opacity:1;} 96%{opacity:0.8;} 97%{opacity:1;} }
                @keyframes pg2-slideIn   { from { opacity:0; transform: translateX(24px); } to { opacity:1; transform: translateX(0); } }
                .pg2-glow-pulse   { animation: glow-pulse   2s ease-in-out infinite; }
                .pg2-float        { animation: float         4s ease-in-out infinite; }
                .pg2-sparkle      { animation: sparkle       2s ease-in-out infinite; }
                .pg2-neon-flicker { animation: neon-flicker  3s ease-in-out infinite; }
                .pg2-drink-item:hover:not(:disabled) { background: hsla(280,60%,45%,0.2) !important; box-shadow: 0 0 10px hsla(280,100%,70%,0.2); }
                .pg2-tip-btn:hover:not(:disabled)    { background: hsla(280,60%,45%,0.3) !important; box-shadow: 0 0 15px hsla(280,100%,70%,0.3); }
                .pg2-btn-glow:hover  { box-shadow: 0 0 20px hsla(280,100%,70%,0.5), 0 0 50px hsla(280,100%,70%,0.2); transform: translateY(-1px); }
                .pg2-btn-gold:hover  { box-shadow: 0 0 20px hsla(42,90%,55%,0.5), 0 0 50px hsla(42,90%,55%,0.2); transform: translateY(-1px); }
                .pg2-scroll::-webkit-scrollbar       { width: 4px; }
                .pg2-scroll::-webkit-scrollbar-track { background: transparent; }
                .pg2-scroll::-webkit-scrollbar-thumb { background: hsla(280,60%,45%,0.3); border-radius: 10px; }
            `}</style>

            {/* Toasts */}
            <ToastStack toasts={toasts} />

            {/* Background */}
            <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url(/rooms/bar-lounge/lounge-bg-v2.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
            <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "hsla(270,50%,8%,0.6)" }} />

            {/* Sparkles */}
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="pg2-sparkle" style={{ position: "fixed", width: "4px", height: "4px", borderRadius: "9999px", background: GOLD, zIndex: 10, pointerEvents: "none", left: `${(i * 13 + 7) % 100}%`, top: `${(i * 17 + 11) % 100}%`, animationDelay: `${(i * 0.3) % 4}s`, animationDuration: `${2 + (i % 3)}s` }} />
            ))}

            {/* Header */}
            <div style={{ position: "relative", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button onClick={() => router.push("/rooms/bar-lounge")} style={{ ...glassPanel, padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: `${GOLD}cc`, cursor: "pointer" }}>
                        <ArrowLeft style={{ width: "14px", height: "14px" }} /> Exit Lounge
                    </button>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        style={{ ...glassPanel, padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: PINK, cursor: "pointer", border: "1px solid hsla(320,80%,55%,0.35)", background: "hsla(320,60%,30%,0.2)", transition: "all 0.3s" }}
                    >
                        <UserPlus style={{ width: "14px", height: "14px" }} /> Invite
                    </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Incoming Button */}
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={toggleIncomingPanel}
                            className="pg2-btn-glow"
                            style={{
                                position: "relative",
                                padding: "8px 16px",
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                fontSize: "13px", fontWeight: 700,
                                color: "#fff",
                                cursor: "pointer",
                                background: showIncomingPanel
                                    ? "linear-gradient(135deg, hsla(0,80%,50%,0.9), hsla(340,80%,45%,0.9))"
                                    : "linear-gradient(135deg, hsla(0,80%,50%,0.85), hsla(340,80%,50%,0.85))",
                                border: "1px solid hsla(0,80%,60%,0.5)",
                                borderRadius: "0.75rem",
                                boxShadow: "0 0 15px hsla(0,80%,50%,0.4), 0 0 40px hsla(0,80%,50%,0.15)",
                                transition: "all 0.3s",
                            }}
                        >
                            <Bell style={{ width: "14px", height: "14px" }} />
                            Incoming
                            {unseenCount > 0 && (
                                <span style={{
                                    position: "absolute", top: "-6px", right: "-6px",
                                    minWidth: "20px", height: "20px",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    borderRadius: "9999px",
                                    background: GOLD,
                                    color: BG,
                                    fontSize: "11px", fontWeight: 800,
                                    padding: "0 5px",
                                    boxShadow: "0 0 10px hsla(42,90%,55%,0.6)",
                                    animation: "glow-pulse 1.5s ease-in-out infinite",
                                }}>
                                    {unseenCount}
                                </span>
                            )}
                        </button>

                        {/* Incoming Dropdown Panel */}
                        {showIncomingPanel && (
                            <div style={{
                                position: "absolute", top: "calc(100% + 12px)", right: 0,
                                width: "380px", maxHeight: "480px",
                                ...glassPanel,
                                background: "hsla(270,50%,10%,0.95)",
                                backdropFilter: "blur(24px)",
                                border: "1px solid hsla(0,80%,50%,0.3)",
                                borderRadius: "1rem",
                                boxShadow: "0 8px 32px hsla(0,0%,0%,0.5), 0 0 20px hsla(0,80%,50%,0.2)",
                                overflow: "hidden",
                                animation: "pg2-slideIn 0.25s ease",
                                zIndex: 100,
                            }}>
                                {/* Panel header */}
                                <div style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "16px 20px",
                                    borderBottom: "1px solid hsla(280,60%,45%,0.2)",
                                    background: "hsla(0,60%,25%,0.15)",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <Bell style={{ width: "18px", height: "18px", color: "hsl(0,80%,60%)" }} />
                                        <span style={{ fontSize: "15px", fontWeight: 700, color: FG }}>My Activity</span>
                                        <span style={{
                                            fontSize: "11px", fontWeight: 600,
                                            padding: "2px 8px", borderRadius: "9999px",
                                            background: "hsla(0,80%,50%,0.2)",
                                            border: "1px solid hsla(0,80%,50%,0.3)",
                                            color: "hsl(0,80%,65%)",
                                        }}>
                                            {incomingItems.length}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setShowIncomingPanel(false)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: "4px", display: "flex", transition: "color 0.2s" }}
                                    >
                                        <X style={{ width: "16px", height: "16px" }} />
                                    </button>
                                </div>

                                {/* Panel body */}
                                <div className="pg2-scroll" style={{ maxHeight: "400px", overflowY: "auto", padding: "8px" }}>
                                    {incomingItems.length === 0 ? (
                                        <div style={{ padding: "32px 16px", textAlign: "center" }}>
                                            <Bell style={{ width: "32px", height: "32px", color: `${MUTED}44`, margin: "0 auto 12px" }} />
                                            <p style={{ color: MUTED, fontSize: "13px" }}>No activity yet this session</p>
                                            <p style={{ color: `${MUTED}88`, fontSize: "12px", marginTop: "4px" }}>Buy a drink or tip to see your activity here</p>
                                        </div>
                                    ) : (
                                        incomingItems.map((item: any) => {
                                            const emoji = incomingTypeEmoji(item.type);
                                            const sc = incomingStatusColor(item.status);
                                            const isRequest = ["vip", "booth", "custom"].includes(item.type);

                                            return (
                                                <div key={item.id} style={{
                                                    display: "flex", alignItems: "center", gap: "12px",
                                                    padding: "10px 14px", marginBottom: "4px",
                                                    borderRadius: "0.75rem",
                                                    background: sc.bg,
                                                    border: `1px solid ${sc.border}`,
                                                    transition: "all 0.2s",
                                                }}>
                                                    <span style={{ fontSize: "22px", flexShrink: 0 }}>{emoji}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                            <span style={{ fontSize: "13px", fontWeight: 600, color: FG }}>
                                                                {item.label || item.type}
                                                            </span>
                                                            <span style={{
                                                                fontSize: "12px", fontWeight: 700, color: GOLD,
                                                            }}>{cs()}{item.amount}</span>
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                                            {isRequest && (
                                                                <span style={{
                                                                    fontSize: "10px", fontWeight: 700,
                                                                    padding: "1px 6px", borderRadius: "4px",
                                                                    background: sc.bg,
                                                                    border: `1px solid ${sc.border}`,
                                                                    color: sc.text,
                                                                    textTransform: "uppercase",
                                                                    letterSpacing: "0.5px",
                                                                }}>
                                                                    {item.status === "pending" ? "⏳ Awaiting approval" : item.status === "accepted" ? "✓ Approved" : item.status === "declined" ? "✗ Declined" : item.status}
                                                                </span>
                                                            )}
                                                            {!isRequest && (
                                                                <span style={{ fontSize: "10px", color: "hsl(140,70%,55%)", fontWeight: 600 }}>✓ Sent</span>
                                                            )}
                                                            {item.created_at && (
                                                                <span style={{ fontSize: "10px", color: `${MUTED}88`, display: "flex", alignItems: "center", gap: "3px" }}>
                                                                    <Clock style={{ width: "10px", height: "10px" }} />
                                                                    {formatTimeAgo(item.created_at)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* View Reply Button for Custom Requests with media */}
                                                    {item.type === "custom" && item.creator_reply && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const reply = parseCreatorReply(item.creator_reply);
                                                                if (reply) {
                                                                    setVipDeliveryData({
                                                                        creatorName: creatorName !== "[CreatorName]" ? creatorName : "Creator",
                                                                        text: reply.text,
                                                                        mediaUrl: reply.mediaUrl,
                                                                        mediaType: reply.mediaType,
                                                                        originalRequestLabel: item.label || "Custom Request"
                                                                    });
                                                                }
                                                                setVipDeliveryOpen(true);
                                                                setShowIncomingPanel(false);
                                                            }}
                                                            style={{
                                                                background: "hsla(280, 80%, 60%, 0.2)",
                                                                border: "1px solid hsla(280, 80%, 60%, 0.5)",
                                                                color: "hsl(280, 80%, 80%)",
                                                                padding: "4px 8px",
                                                                borderRadius: "0.5rem",
                                                                fontSize: "11px",
                                                                fontWeight: 600,
                                                                marginLeft: "auto",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s"
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = "hsla(280, 80%, 60%, 0.4)"}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = "hsla(280, 80%, 60%, 0.2)"}
                                                        >
                                                            View Reply
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <WalletPill />
                </div>
            </div>

            {/* Main grid */}
            <div style={{ position: "relative", zIndex: 20, padding: "0 16px 16px" }}>
                <div style={{ maxWidth: "80rem", margin: "0 auto", display: "grid", gridTemplateColumns: "320px 1fr 350px", gap: "24px", height: "calc(100vh - 3rem)" }}>

                    {/* ═══ LEFT: Drink Menu ═══ */}
                    <div className="pg2-scroll" style={{ overflowY: "auto" }}>
                        <div style={{ padding: "16px", display: "flex", flexDirection: "column", height: "100%", border: "1px solid hsla(280,40%,30%,0.2)", borderRadius: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <Wine className="pg2-glow-pulse" style={{ width: "20px", height: "12px", color: PURPLE }} />
                                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: GOLD, ...glowTextGold, margin: 0 }}>Buy a Drink</h2>
                            </div>
                            <p style={{ color: MUTED, fontSize: "12px", margin: "0 0 0 0" }}>for {creatorName}</p>

                            {/* Drink list */}
                            <div style={{ borderTop: "1px solid hsla(280,40%,30%,0.3)", paddingTop: "8px" }}>
                                <h3 style={{ fontSize: "11px", fontWeight: 600, color: MUTED, marginBottom: "6px", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 0 }}>Drink Menu</h3>
                                <div>
                                    {drinks.slice(0, 9).map((drink: any) => {
                                        const id = drink.id || drink.name;
                                        const isThisBuying = buying === id;
                                        return (
                                            <div
                                                key={id}
                                                className="pg2-drink-item"
                                                style={{ ...drinkItem, opacity: buying && !isThisBuying ? 0.6 : 1, marginBottom: "4px" }}
                                                onClick={() => !buying && handleDrinkTip(drink)}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <span style={{ fontSize: "15px" }}>{drink.icon}</span>
                                                    <span style={{ color: FG, fontWeight: 500, fontSize: "12px" }}>{drink.name}</span>
                                                </div>
                                                {isThisBuying
                                                    ? <Loader2 style={{ width: "14px", height: "14px", color: GOLD, animation: "spin 1s linear infinite" }} />
                                                    : <span style={{ color: GOLD, fontWeight: 600 }}>{cs()}{drink.price}</span>
                                                }
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>



                            {/* VIP section */}
                            <div style={{ borderTop: "1px solid hsla(280,40%,30%,0.3)", paddingTop: "12px", marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 700, color: FG, textAlign: "center", margin: 0 }}>VIP Lounge</h3>

                                {/* ── VIP & Custom Request Unified Container ── */}
                                <div style={{ ...glassPanel, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid hsla(42,90%,55%,0.3)" }}>
                                    
                                    {/* Top Half: VIP Status */}
                                    {vipRequestStatus === 'accepted' ? (
                                        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", background: "hsla(140,40%,15%,0.2)", borderBottom: "1px solid hsla(42,90%,55%,0.3)" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Crown style={{ width: "20px", height: "20px", color: GOLD }} />
                                                <span style={{ fontWeight: 700, color: "hsl(140,70%,55%)", fontSize: "12px" }}>✓ VIP Access Granted</span>
                                            </div>
                                            <p style={{ fontSize: "12px", color: MUTED, margin: 0, marginLeft: "28px" }}>Enjoy your exclusive VIP perks!</p>
                                        </div>
                                    ) : vipRequestStatus === 'pending' ? (
                                        <div style={{ ...glowGold, padding: "12px", display: "flex", flexDirection: "column", gap: "8px", opacity: 0.8, cursor: "default", borderBottom: "1px solid hsla(42,90%,55%,0.3)" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Crown className="pg2-glow-pulse" style={{ width: "20px", height: "20px", color: GOLD }} />
                                                <span style={{ fontWeight: 700, color: GOLD, ...glowTextGold, fontSize: "12px" }}>VIP Request Pending...</span>
                                                <Loader2 style={{ width: "14px", height: "14px", color: GOLD, animation: "spin 1s linear infinite", marginLeft: "auto" }} />
                                            </div>
                                            <p style={{ fontSize: "12px", color: MUTED, margin: 0, marginLeft: "28px" }}>Waiting for creator approval</p>
                                        </div>
                                    ) : vipRequestStatus === 'declined' ? (
                                        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", background: "hsla(0,40%,15%,0.15)", borderBottom: "1px solid hsla(42,90%,55%,0.3)" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Crown style={{ width: "20px", height: "20px", color: MUTED }} />
                                                <span style={{ fontWeight: 700, color: "hsl(0,70%,60%)", fontSize: "12px" }}>VIP Request Declined</span>
                                            </div>
                                            <button onClick={() => { setVipRequestStatus('idle'); }} style={{ fontSize: "12px", color: GOLD, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0, marginLeft: "28px", textAlign: "left" }}>Try again?</button>
                                        </div>
                                    ) : (
                                        <div style={{ ...glowGold, padding: "12px", cursor: buying ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", gap: "8px", opacity: buying ? 0.7 : 1, borderBottom: "1px solid hsla(42,90%,55%,0.3)", transition: "background 0.2s" }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "hsla(42,90%,55%,0.1)"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                            onClick={() => !buying && doPurchase("vip", "VIP Upgrade", vipPrice, "vip")}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Crown className="pg2-glow-pulse" style={{ width: "20px", height: "20px", color: GOLD }} />
                                                {buying === "vip"
                                                    ? <Loader2 style={{ width: "16px", height: "16px", color: GOLD, animation: "spin 1s linear infinite" }} />
                                                    : <span style={{ fontWeight: 700, color: GOLD, ...glowTextGold }}>Upgrade to VIP - {cs()}{vipPrice}</span>}
                                            </div>
                                            <ul style={{ fontSize: "12px", color: MUTED, marginLeft: "28px", margin: "0", padding: 0, listStyle: "none" }}>
                                                <li style={{ display: "flex", alignItems: "center", gap: "4px" }}><Sparkles style={{ width: "12px", height: "12px", color: PINK }} /> Exclusive Content</li>
                                            </ul>

                                        </div>
                                    )}

                                    {/* Bottom Half: Custom Request */}
                                    {vipRequestStatus === 'accepted' ? (
                                        <div style={{
                                            padding: "14px",
                                            background: "linear-gradient(135deg, hsla(270,60%,25%,0.1), hsla(42,50%,25%,0.05))",
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                                <span style={{ fontSize: "18px" }}>📩</span>
                                                <span style={{ fontWeight: 700, color: GOLD, fontSize: "12px", ...glowTextGold }}>Custom Request</span>
                                                <span style={{
                                                    marginLeft: "auto", fontSize: "10px", fontWeight: 600,
                                                    padding: "2px 8px", borderRadius: "9999px",
                                                    background: "hsla(140,70%,45%,0.15)",
                                                    border: "1px solid hsla(140,70%,45%,0.3)",
                                                    color: "hsl(140,70%,55%)",
                                                }}>UNLIMITED</span>
                                            </div>
                                            <div style={{ position: "relative", width: "100%" }}>
                                                <textarea
                                                    placeholder="Type your request for the creator..."
                                                    value={customReqText}
                                                    onChange={(e) => setCustomReqText(e.target.value.slice(0, 1000))}
                                                    rows={3}
                                                    style={{
                                                        width: "100%", resize: "none",
                                                        borderRadius: "0.5rem", padding: "10px 12px",
                                                        paddingBottom: "36px",
                                                        fontSize: "13px", lineHeight: "1.4",
                                                        background: "hsla(270,30%,18%,0.4)",
                                                        border: "1px solid hsla(280,40%,30%,0.3)",
                                                        color: FG, outline: "none",
                                                        fontFamily: "'Montserrat', sans-serif",
                                                    }}
                                                />
                                                <button
                                                    className="pg2-btn-gold"
                                                    disabled={!!buying || !customReqText.trim()}
                                                    style={{
                                                        position: "absolute",
                                                        bottom: "8px",
                                                        right: "8px",
                                                        ...btnGold,
                                                        padding: "4px 12px",
                                                        fontSize: "11px",
                                                        fontWeight: 700,
                                                        opacity: (buying || !customReqText.trim()) ? 0.5 : 1,
                                                        display: "flex", alignItems: "center", gap: "4px",
                                                    }}
                                                    onClick={handleCustomRequest}
                                                >
                                                    {buying?.startsWith("custom-req") ? <Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} /> : "Send"}
                                                </button>
                                            </div>
                                            
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                                                {customRequestShortcuts.map(shortcut => (
                                                    <button
                                                        key={shortcut}
                                                        onClick={() => setCustomReqText(shortcut)}
                                                        style={{
                                                            background: "hsla(280,40%,30%,0.2)",
                                                            border: "1px solid hsla(280,40%,40%,0.3)",
                                                            borderRadius: "9999px",
                                                            padding: "4px 10px",
                                                            fontSize: "11px",
                                                            color: MUTED,
                                                            cursor: "pointer",
                                                            transition: "all 0.2s"
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = "hsla(42,90%,55%,0.5)"; e.currentTarget.style.background = "hsla(42,90%,55%,0.1)"; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = "hsla(280,40%,40%,0.3)"; e.currentTarget.style.background = "hsla(280,40%,30%,0.2)"; }}
                                                    >
                                                        {shortcut}
                                                    </button>
                                                ))}
                                            </div>


                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: "14px",
                                            background: "hsla(270,40%,15%,0.2)",
                                            position: "relative",
                                            overflow: "hidden"
                                        }}>
                                            <div style={{ opacity: 0.3, pointerEvents: "none", userSelect: "none" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                                    <span style={{ fontSize: "18px", filter: "grayscale(1)" }}>📩</span>
                                                    <span style={{ fontWeight: 700, color: MUTED, fontSize: "12px" }}>Custom Request</span>
                                                    <span style={{
                                                        marginLeft: "auto", fontSize: "10px", fontWeight: 600,
                                                        padding: "2px 8px", borderRadius: "9999px",
                                                        background: "hsla(0,0%,50%,0.15)",
                                                        border: "1px solid hsla(0,0%,50%,0.3)",
                                                        color: MUTED,
                                                    }}>UNLIMITED</span>
                                                </div>
                                                <div style={{
                                                    width: "100%", height: "64px",
                                                    borderRadius: "0.5rem",
                                                    background: "hsla(270,30%,18%,0.4)",
                                                    border: "1px solid hsla(280,40%,30%,0.3)",
                                                }} />
                                                <div style={{ display: "flex", gap: "8px", marginTop: "8px", height: "34px" }}>
                                                    <div style={{ ...tipBtn, flex: 1, background: "hsla(270,30%,18%,0.4)", border: "1px solid hsla(280,40%,30%,0.3)" }} />
                                                    <div style={{ ...btnGold, width: "64px", background: "hsla(0,0%,50%,0.3)", border: "none" }} />
                                                </div>
                                            </div>
                                            
                                            <div style={{
                                                position: "absolute", inset: 0,
                                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                                background: "hsla(270,50%,10%,0.65)", backdropFilter: "blur(4px)",
                                                zIndex: 10
                                            }}>
                                                <Crown style={{ width: "24px", height: "24px", color: GOLD, marginBottom: "8px", ...glowTextGold }} className="pg2-glow-pulse" />
                                                <span style={{ fontSize: "12px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", ...glowTextGold }}>VIP Only</span>
                                                <p style={{ fontSize: "11px", color: "#fff", marginTop: "4px", fontWeight: 500, letterSpacing: "0.5px" }}>Purchase VIP to unlock</p>
                                            </div>
                                        </div>
                                    )}
                                </div>


                            </div>
                        </div>
                    </div>

                    {/* ═══ CENTER: Live Stream & Actions ═══ */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflow: "hidden", height: "100%", paddingBottom: "16px" }}>

                        {/* Live stream — 4:3 landscape positioned at the bottom */}
                        <div style={{ width: "100%", marginTop: "auto", flexShrink: 0 }}>
                            <div style={{ position: "relative", ...glassPanel, ...glowPurple, overflow: "hidden", borderRadius: "0.75rem", width: "100%", paddingBottom: "75%" }}>
                                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column" }}>

                                    {/* Real Agora fan stream */}
                                    {roomId && user ? (
                                        <div style={{ width: "100%", height: "100%", borderRadius: "0.75rem", overflow: "hidden", flex: 1 }}>
                                        <LiveStreamWrapper
                                            role="fan"
                                            appId={APP_ID}
                                            roomId={roomId}
                                            uid={user.id || 0}
                                            hostId={hostId || ""}
                                            hostAvatarUrl={hostProfile?.avatar_url || null}
                                            hostName={creatorName}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, hsla(270,50%,15%,0.8), hsla(280,60%,10%,0.9))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", borderRadius: "0.75rem", flex: 1 }}>
                                        <Wine style={{ width: "60px", height: "60px", color: `${GOLD}33` }} />
                                        <span style={{ fontSize: "13px", color: MUTED }}>Connecting to stream...</span>
                                    </div>
                                )}

                                {/* Floating hearts */}
                                <div className="pg2-float" style={{ position: "absolute", top: "40px", right: "16px", zIndex: 10, pointerEvents: "none" }}>
                                    <Heart className="pg2-glow-pulse" style={{ width: "40px", height: "40px", color: PINK, fill: "hsla(320,100%,65%,0.5)", filter: "drop-shadow(0 0 10px hsla(320,100%,65%,0.6))" }} />
                                </div>
                                <div className="pg2-float" style={{ position: "absolute", top: "48px", right: "64px", animationDelay: "1s", zIndex: 10, pointerEvents: "none" }}>
                                    <Heart className="pg2-glow-pulse" style={{ width: "24px", height: "24px", color: PINK, fill: "hsla(320,100%,65%,0.3)", filter: "drop-shadow(0 0 8px hsla(320,100%,65%,0.4))" }} />
                                </div>

                                {/* Bottom gradient */}
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "64px", background: "linear-gradient(to top, hsla(270,50%,8%,0.8), transparent)", zIndex: 5, pointerEvents: "none" }} />

                                {/* LIVE badge */}
                                <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, display: "flex", alignItems: "center", gap: "6px", background: "hsla(0,80%,45%,0.9)", border: "1px solid hsla(0,80%,60%,0.5)", borderRadius: "9999px", padding: "3px 10px", fontSize: "11px", fontWeight: 700, color: "#fff", backdropFilter: "blur(8px)", letterSpacing: "0.08em" }}>
                                    <span className="pg2-glow-pulse" style={{ width: "6px", height: "6px", borderRadius: "9999px", background: "#fff", display: "inline-block" }} />
                                    LIVE
                                </div>

                                {/* Creator name badge */}
                                {creatorName !== "[CreatorName]" && (
                                    <div style={{ position: "absolute", bottom: "12px", left: "12px", zIndex: 10, background: "hsla(270,50%,8%,0.75)", backdropFilter: "blur(8px)", borderRadius: "0.5rem", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: FG }}>
                                        {creatorName}
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>

                        {/* Custom Tip and Private 1-on-1 merged into one row */}
                        <div style={{ display: "flex", flexDirection: "row", gap: "12px", flexShrink: 0 }}>
                            
                            {/* Custom Tip row */}
                            <div style={{ ...glassPanel, flex: 1, padding: "8px 12px", display: "flex", alignItems: "center", gap: "12px", border: "1px solid hsla(280,60%,45%,0.4)" }}>
                                <div style={{ width: "28px", height: "28px", borderRadius: "9999px", background: "hsla(42,90%,55%,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid hsla(42,90%,55%,0.3)" }}>
                                    <span style={{ fontSize: "14px" }}>💰</span>
                                </div>
                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "hsla(270,40%,15%,0.4)", borderRadius: "0.5rem", padding: "6px 12px", border: "1px solid hsla(280,60%,45%,0.2)" }}>
                                    <span style={{ color: MUTED, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Custom Tip</span>
                                    <span style={{ color: GOLD, fontSize: "14px", fontWeight: 700, marginLeft: "auto" }}>{cs()}</span>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Amount"
                                        value={tipAmount}
                                        onChange={(e) => setTipAmount(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleCustomTip()}
                                        style={{ background: "transparent", border: "none", outline: "none", color: FG, fontFamily: "'Montserrat', sans-serif", fontSize: "12px", width: "60px", fontWeight: 600 }}
                                    />
                                </div>
                                <button
                                    className="pg2-btn-gold"
                                    disabled={!!buying || !tipAmount || Number(tipAmount) <= 0}
                                    style={{ ...btnGold, flexShrink: 0, padding: "8px 16px", fontSize: "11px", opacity: (buying || !tipAmount || Number(tipAmount) <= 0) ? 0.5 : 1, minWidth: "80px", display: "flex", justifyContent: "center" }}
                                    onClick={handleCustomTip}>
                                    {buying === "tip-custom" ? <Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} /> : "Tip Now"}
                                </button>
                            </div>

                            {/* Private 1-on-1 Session */}
                            <div
                                style={{
                                    ...glassPanel,
                                    flex: 1,
                                    padding: "8px 14px",
                                    cursor: (buying || privateCall.callState) ? "not-allowed" : "pointer",
                                    opacity: (buying || privateCall.callState) ? 0.7 : 1,
                                    background: "linear-gradient(135deg, hsla(280,80%,30%,0.25), hsla(320,80%,35%,0.2))",
                                    border: "1px solid hsla(320,80%,55%,0.4)",
                                    transition: "all 0.3s",
                                    display: "flex", alignItems: "center", justifyContent: "space-between"
                                }}
                                className="pg2-btn-glow"
                                onClick={() => !buying && !privateCall.callState && setShowPrivateCallConfirm(true)}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div style={{
                                        width: "28px", height: "28px", borderRadius: "9999px",
                                        background: "linear-gradient(135deg, hsla(320,80%,55%,0.4), hsla(280,80%,55%,0.4))",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        border: "1px solid hsla(320,80%,60%,0.3)",
                                        flexShrink: 0,
                                    }}>
                                        <Phone style={{ width: "12px", height: "12px", color: PINK }} />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontWeight: 700, color: FG, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Private 1-on-1</span>
                                        <span style={{ fontSize: "10px", color: MUTED }}>Direct video call</span>
                                    </div>
                                </div>
                                <span style={{ color: GOLD, fontWeight: 700, fontSize: "12px" }}>{cs()}{PRIVATE_CALL_PRICE}</span>
                            </div>
                        </div>


                    </div>


                    {/* ═══ RIGHT: Lounge Chat ═══ */}
                    <div style={{ padding: "16px", display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden", border: "1px solid hsla(280,40%,30%,0.2)", borderRadius: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: GOLD, ...glowTextGold, margin: 0 }}>Lounge Chat</h2>
                            <span style={liveBadge}>
                                <span className="pg2-glow-pulse" style={{ width: "8px", height: "8px", borderRadius: "9999px", background: "hsl(140,70%,55%)", display: "inline-block" }} />
                                Live
                            </span>
                        </div>

                        {/* Pinned User Banner */}
                        {activePinMessage && (
                            <div style={{ ...chatMsg, ...glowPink, marginBottom: "12px", border: `1px solid hsla(320,100%,65%,0.5)`, background: "hsla(320,60%,30%,0.15)", flexShrink: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "12px" }}>📌</span>
                                    <span style={{ fontWeight: 700, fontSize: "11px", color: PINK, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pinned to Top</span>
                                    <span style={{ marginLeft: "auto", fontSize: "11px", color: MUTED, fontWeight: 600 }}>
                                        {Math.ceil((10 * 60 * 1000 - (currentTime - new Date(activePinMessage.created_at).getTime())) / 60000)}m left
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "16px", flexShrink: 0 }}>👑</span>
                                    <div style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        <span style={{ fontWeight: 700, fontSize: "12px", color: "#fff" }}>{activePinMessage.handle}</span>
                                        <span style={{ fontSize: "11px", color: "hsla(0,0%,100%,0.7)", marginLeft: "6px" }}>is the life of the party!</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pg2-scroll" style={{ flex: 1, overflowY: "auto", paddingRight: "4px", marginBottom: "12px", minHeight: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                            {messages.length === 0 && (
                                <div style={{ textAlign: "center", color: MUTED, fontSize: "13px", padding: "24px 0" }}>No messages yet. Say hello! 👋</div>
                            )}
                            {messages.map((msg: any, i: number) => (
                                <div key={msg.id ?? i} style={{ ...chatMsg, display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                    <span style={{ fontSize: "18px", flexShrink: 0 }}>{msg.is_system ? "🔔" : "🧑"}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                            <span style={{ fontWeight: 700, fontSize: "12px", color: FG }}>{msg.handle || "Anonymous"}</span>
                                            {msg.user_id && <UserBadgeDisplay userId={msg.user_id} />}
                                            {msg.handle?.includes("VIP") && <Crown style={{ width: "12px", height: "12px", color: GOLD, display: "inline", marginBottom: "2px" }} />}
                                        </div>
                                        <span style={{ fontSize: "12px", color: MUTED, display: "block", marginTop: "2px" }}>{msg.content}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Pin Name */}
                        <div style={{ ...chatMsg, ...glowPink, display: "flex", alignItems: "center", gap: "8px", cursor: buying ? "not-allowed" : "pointer", marginBottom: "8px", opacity: buying ? 0.7 : 1 }}
                            onClick={() => !buying && doPurchase("pin", "Pin Name to Top", 25, "pin")}>
                            <span style={{ fontSize: "18px" }}>🔥</span>
                            <span className="pg2-neon-flicker" style={{ fontSize: "12px", fontWeight: 700, color: PINK }}>PIN NAME TO TOP 10 mins</span>
                            {buying === "pin"
                                ? <Loader2 style={{ width: "14px", height: "14px", color: GOLD, animation: "spin 1s linear infinite", marginLeft: "auto" }} />
                                : <span style={{ color: GOLD, fontWeight: 700, marginLeft: "auto" }}>+{cs()}25</span>}
                        </div>

                        {/* Chat input */}
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input type="text" placeholder="Send a message..." value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                                style={{ flex: 1, borderRadius: "0.5rem", padding: "8px 12px", fontSize: "12px", background: "hsla(270,30%,18%,0.3)", border: "1px solid hsla(280,40%,30%,0.3)", color: FG, outline: "none", fontFamily: "'Montserrat', sans-serif" }}
                            />
                            <EmojiPicker
                                onEmojiSelect={(emoji) => setChatInput((prev) => prev + emoji)}
                                accentColor={GOLD}
                                position="top"
                            />
                            <button className="pg2-btn-glow" style={{ ...btnGlow, padding: "8px 16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={handleSendChat}>
                                SEND
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Invite Modal */}
            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                roomId={roomId}
            />

            {/* Private 1-on-1 Spend Confirmation */}
            <SpendConfirmModal
                isOpen={showPrivateCallConfirm}
                onClose={() => setShowPrivateCallConfirm(false)}
                title="Private 1-on-1 Video Call"
                itemLabel="👑 Private 1-on-1 Session"
                amount={PRIVATE_CALL_PRICE}
                walletBalance={balance}
                description={`Pay ${cs()}${PRIVATE_CALL_PRICE} for a Private 1-on-1 video call with ${hostProfile?.full_name || hostProfile?.username || 'the creator'}?`}
                confirmLabel="Pay & Request Call"
                onConfirm={async () => {
                    if (!roomId || !hostId) return;
                    const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
                    // Deduct from wallet
                    const payment = await pay(hostId, PRIVATE_CALL_PRICE, "Private 1-on-1 Video Call", roomId, 'private_1on1');
                    if (!payment.success) {
                        showToast(payment.error || "Payment failed", "error");
                        return;
                    }
                    // Initiate the private call
                    const callResult = await privateCall.initiateCall(fanName);
                    if (callResult) {
                        showToast("👑 Private 1-on-1 requested! Waiting for creator...", "info");
                        // Post system message to Lounge Chat (title only)
                        await supabase.from("bar_lounge_messages").insert({
                            room_id: roomId,
                            user_id: user?.id ?? null,
                            handle: fanName,
                            content: `📞 ${fanName} bought 1 on 1 Video Call (${cs()}${PRIVATE_CALL_PRICE})`,
                            is_system: true,
                            ...(sessionId ? { session_id: sessionId } : {}),
                        });
                    } else {
                        showToast("Failed to initiate video call", "error");
                    }
                    await refreshWallet();
                    setShowPrivateCallConfirm(false);
                }}
            />

            {/* Private 1-on-1 Call Modal (handles all call states) */}
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
                    hostAvatarUrl={hostProfile?.avatar_url || undefined}
                    hostName={hostProfile?.full_name || hostProfile?.username || "Creator"}
                />
            )}

            <VipDeliveryModal
                isOpen={vipDeliveryOpen}
                onClose={() => setVipDeliveryOpen(false)}
                delivery={vipDeliveryData}
            />
        </div>
    );
}

export default function PgxPage2Room() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
                <div style={{ width: "32px", height: "32px", border: "3px solid hsla(280,100%,70%,0.3)", borderTopColor: PURPLE, borderRadius: "9999px", animation: "spin 1s linear infinite" }} />
            </div>
        }>
            <PgxPage2Inner />
        </Suspense>
    );
}
