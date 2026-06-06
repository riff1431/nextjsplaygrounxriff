"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useBarChat } from "@/hooks/useBarChat";
import { useAuth } from "@/app/context/AuthContext";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Video, Send, Zap, Star, Sparkles, MessageCircle, Crown,
    Search, Bell, LogOut, User as UserIcon, CreditCard, Users, Settings, Heart,
    Link as LinkIcon, Loader2, Play, DollarSign, Wine, Home, Eye, Clock, UserPlus, Globe
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import WalletPill from "@/components/common/WalletPill";
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { useWallet } from "@/hooks/useWallet";
import RoomEntryInfoModal, { isRoomEntryDismissed } from "@/components/rooms/shared/RoomEntryInfoModal";
import EmojiPicker from "@/components/common/EmojiPicker";
import CreatorProfileHover from "@/components/shared/CreatorProfileHover";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";
import { cs } from "@/utils/currency";
import BillingOverlay from "@/components/rooms/shared/BillingOverlay";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const supabase = createClient();

/* ── colour tokens (match reference index.css) ────────────────────────── */
const C = {
    bg: "hsl(270,50%,8%)",
    fg: "hsl(45,100%,95%)",
    gold: "hsl(42,90%,55%)",
    goldDark: "hsl(42,80%,45%)",
    neonPink: "hsl(320,100%,65%)",
    neonPurple: "hsl(280,100%,70%)",
    border: "hsla(280,60%,45%,0.25)",
    borderLight: "hsla(280,60%,45%,0.2)",
    borderStrong: "hsla(280,60%,45%,0.3)",
    glassBg: "hsla(270,40%,15%,0.2)",
    glassBgStrong: "hsla(270,40%,15%,0.3)",
    muted: "hsl(270,20%,65%)",
    card: "hsl(270,40%,12%)",
};

const glassPanel: React.CSSProperties = { background: C.glassBg, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `1px solid ${C.border}`, borderRadius: "0.75rem" };
const glassPanelStrong: React.CSSProperties = { background: C.glassBgStrong, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${C.borderStrong}`, borderRadius: "0.75rem" };
const glowGold: React.CSSProperties = { boxShadow: `0 0 15px hsla(42,90%,55%,0.4), 0 0 40px hsla(42,90%,55%,0.15)` };
const glowPurple: React.CSSProperties = { boxShadow: `0 0 15px hsla(280,100%,70%,0.4), 0 0 40px hsla(280,100%,70%,0.15), inset 0 0 15px hsla(280,100%,70%,0.05)` };
const glowPink: React.CSSProperties = { boxShadow: `0 0 15px hsla(320,100%,65%,0.4), 0 0 40px hsla(320,100%,65%,0.15)` };
const glowTextGold: React.CSSProperties = { textShadow: `0 0 10px hsla(42,90%,55%,0.6), 0 0 30px hsla(42,90%,55%,0.3)` };

const drinkItemStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "0.5rem", cursor: "pointer", transition: "all 0.2s", background: C.glassBgStrong, border: `1px solid ${C.borderLight}` };
const tipBtnStyle: React.CSSProperties = { padding: "8px 16px", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", background: "hsla(270,40%,15%,0.4)", border: `1px solid ${C.borderStrong}`, color: C.fg };
const btnGoldStyle: React.CSSProperties = { background: `linear-gradient(135deg, hsla(42,90%,55%,0.9), hsla(42,80%,45%,0.9))`, border: `1px solid hsla(42,90%,55%,0.5)`, color: C.bg, fontWeight: 600, borderRadius: "0.5rem", cursor: "pointer" };
const btnGlowStyle: React.CSSProperties = { position: "relative", overflow: "hidden", transition: "all 0.3s", background: "linear-gradient(135deg, hsla(280,80%,55%,0.8), hsla(320,80%,60%,0.8))", border: `1px solid hsla(280,60%,45%,0.5)`, borderRadius: "0.5rem", cursor: "pointer", color: C.fg, fontWeight: 700 };
const chatMsgStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: "0.5rem", marginBottom: "2px", background: C.glassBgStrong, border: `1px solid hsla(280,60%,45%,0.15)` };
const liveBadge: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600, background: "hsla(140,70%,45%,0.2)", border: "1px solid hsla(140,70%,45%,0.4)", color: "hsl(140,70%,55%)" };

type Room = {
    id: string; title: string | null; status: string; host_id: string;
    created_at: string; viewer_count?: number;
    profiles?: { handle?: string; avatar_url?: string; full_name?: string };
};

const BAR_LOUNGE_FAN_TABS: MobileStudioTab[] = [
    { id: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
    { id: "drinks", label: "Drinks", icon: <Wine className="w-5 h-5" /> },
    { id: "games", label: "Games", icon: <Play className="w-5 h-5" /> },
    { id: "info", label: "Info", icon: <Users className="w-5 h-5" /> },
];

export default function BarLoungeRoom() {
    const ENTRY_FEE = 10;
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();
    const [viewState, setViewState] = useState<"lobby" | "hosting">("lobby");
    const [activeSessions, setActiveSessions] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mySession, setMySession] = useState<Room | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const { messages, sendMessage } = useBarChat(roomId, sessionId);
    const [hostId, setHostId] = useState<string | null>(null);
    const [hostProfile, setHostProfile] = useState<any>(null);
    const [billingActive, setBillingActive] = useState(false);
    const [spentHidden, setSpentHidden] = useState(32);
    const { balance: walletBalance } = useWallet();
    const [pendingPurchase, setPendingPurchase] = useState<{ type: string; label: string; price: number; meta?: any } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [showEntryInfo, setShowEntryInfo] = useState(false);
    const [pendingEntrySession, setPendingEntrySession] = useState<Room | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [mobileTab, setMobileTab] = useState("chat");

    const [drinks, setDrinks] = useState<any[]>([]);
    const [spinOutcomes, setSpinOutcomes] = useState<any[]>([]);
    const [vipPrice, setVipPrice] = useState(150);
    const [ultraVipPrice, setUltraVipPrice] = useState(400);
    const SPIN_PRICE = 25;
    const [spinning, setSpinning] = useState(false);
    const [spinResult, setSpinResult] = useState<any | null>(null);
    const [tipAmount, setTipAmount] = useState<number | string>("");

    useEffect(() => {
        if (authLoading) return;
        let isMounted = true;
        let roomChannel: any = null;
        const init = async () => {
            try {
                if (user && role === "creator") {
                    const { data: myRooms } = await supabase.from("rooms").select("*").eq("host_id", user.id).eq("type", "bar-lounge").order("created_at", { ascending: true }).limit(1);
                    if (isMounted && myRooms && myRooms.length > 0) setMySession(myRooms[0]);
                }
                const fetchSessions = async () => {
                    try {
                        const res = await fetch('/api/v1/rooms/sessions/browse?room_type=bar-lounge');
                        const data = await res.json();
                        if (res.ok && data.sessions) {
                            // Map browse API response to the Room type the UI expects
                            const mapped = data.sessions.map((s: any) => ({
                                id: s.room_id,
                                title: s.title,
                                description: s.description,
                                status: 'live',
                                host_id: s.creator_id,
                                created_at: s.started_at,
                                viewer_count: s.viewer_count || s.participant_count || 0,
                                profiles: s.creator ? {
                                    handle: s.creator.username,
                                    avatar_url: s.creator.avatar_url,
                                    full_name: s.creator.full_name,
                                } : undefined,
                                // Store session-level data for entry fee
                                session_id: s.id,
                                entry_fee: s.entry_fee,
                                session_type: s.session_type,
                            }));
                            if (isMounted) setActiveSessions(mapped);
                        }
                    } catch (err) {
                        console.error('Failed to fetch bar lounge sessions:', err);
                    }
                };
                await fetchSessions();
                if (isMounted) {
                    // Listen to both rooms and room_sessions changes for live updates
                    roomChannel = supabase.channel('bar-lounge-fan-lobby')
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'type=eq.bar-lounge' }, fetchSessions)
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_sessions', filter: 'room_type=eq.bar-lounge' }, fetchSessions)
                        .subscribe();
                }
                const { data: config } = await supabase.from("admin_bar_config").select("*").eq("id", 1).single();
                if (isMounted && config) {
                    if (config.menu_items) setDrinks(config.menu_items);
                    if (config.spin_odds) setSpinOutcomes(config.spin_odds);
                    if (config.vip_price) setVipPrice(config.vip_price);
                    if (config.ultra_vip_price) setUltraVipPrice(config.ultra_vip_price);
                }
                if (isMounted && !config) {
                    setDrinks([
                        { id: "d1", name: "VIP Bottle", price: 550, icon: "🍾" },
                        { id: "d2", name: "Champagne", price: 250, icon: "🥂" },
                        { id: "d3", name: "69 Bar Shot", price: 50, icon: "♋" },
                        { id: "d4", name: "Blowjob Shot", price: 50, icon: "😮‍💨" },
                        { id: "d5", name: "Pornstar Shot", price: 50, icon: "🌟" },
                        { id: "d6", name: "Quickie Shot", price: 50, icon: "⏱️" },
                        { id: "d7", name: "Liquid Lust Shot", price: 50, icon: "❤️‍🔥" },
                        { id: "d8", name: "Cream & Scream Shot", price: 50, icon: "🍦" },
                        { id: "d9", name: "Temptation Shot", price: 50, icon: "🍎" },
                    ]);
                }
            } catch (err) { console.error(err); } finally { if (isMounted) setIsLoading(false); }
        };
        init();
        return () => { isMounted = false; if (roomChannel) supabase.removeChannel(roomChannel); };
    }, [user, role, authLoading]);

    const joinSession = async (room: any) => {
        if (!user) return router.push("/login");

        const sessionId = room.session_id;
        if (!sessionId) {
            alert("Session data missing — please refresh and try again.");
            return;
        }

        try {
            const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.already_joined) {
                    // Re-entry allowed — navigate directly
                    router.push(`/rooms/pgx-page2?roomId=${room.id}&hostId=${room.host_id}&sessionId=${sessionId}`);
                    return;
                }
                alert(data.error || "Insufficient funds to join session");
                return;
            }

            router.push(`/rooms/pgx-page2?roomId=${room.id}&hostId=${room.host_id}&sessionId=${sessionId}`);
        } catch (e) {
            alert("Network error when trying to join");
        }
    };
    const interceptJoin = (session: Room) => {
        if (isRoomEntryDismissed("bar-lounge")) {
            joinSession(session);
            return;
        }
        setPendingEntrySession(session);
        setShowEntryInfo(true);
    };
    const startHosting = async () => {
        if (!user || role !== 'creator') return; setIsLoading(true);
        if (mySession) { 
            if (mySession.status !== "live") {
                await supabase.from("rooms").update({ status: "live" }).eq("id", mySession.id);
                setMySession({ ...mySession, status: "live" });
            }
            // Fetch the active session_id for this room
            const { data: activeSession } = await supabase
                .from("room_sessions").select("id")
                .eq("room_id", mySession.id).eq("status", "active")
                .order("created_at", { ascending: false }).limit(1).maybeSingle();
            if (activeSession) setSessionId(activeSession.id);
            setRoomId(mySession.id); setHostId(user.id); setViewState("hosting"); setIsLoading(false); return; 
        }
        const { data } = await supabase.from("rooms").insert({ host_id: user.id, title: `${user.user_metadata?.full_name || user.email?.split('@')[0]}'s Lounge`, status: "live", type: "bar-lounge" }).select().single();
        if (data) {
            // Fetch the active session_id for newly created room
            const { data: activeSession } = await supabase
                .from("room_sessions").select("id")
                .eq("room_id", data.id).eq("status", "active")
                .order("created_at", { ascending: false }).limit(1).maybeSingle();
            if (activeSession) setSessionId(activeSession.id);
            setMySession(data); setRoomId(data.id); setHostId(user.id); setViewState("hosting");
        }
        setIsLoading(false);
    };
    const endHosting = async () => { if (!confirm("End session?") || !roomId) return; const { error } = await supabase.from("rooms").update({ status: "ended" }).eq("id", roomId); if (!error) { setMySession(null); setRoomId(null); setHostId(null); setSessionId(null); setViewState("lobby"); } };

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const activateBilling = () => { if (!billingActive && viewState === 'hosting') setBillingActive(true); };

    type FX = { id: string; kind: "confetti" | "spotlight"; createdAt: number };
    const [fx, setFx] = useState<FX[]>([]);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (!roomId || viewState !== "hosting") return;
        const channel = supabase.channel("bar_lounge_events_" + roomId)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "revenue_events", filter: `room_key=eq.${roomId}` }, (payload) => {
                const meta = payload.new.metadata || {};
                if (meta.special === "champagne") pushFx(["confetti", "spotlight"], "🍾 Champagne popped");
                else if (meta.special === "vipbottle") pushFx(["confetti", "spotlight"], "👑 VIP bottle served");
                else if (meta.type === 'spin') { const out = meta.outcome; if (out) { if (out.id === "o2" || out.id === "o1") pushFx(["spotlight"], `🎰 ${out.label}`); else if (out.id === "o5") pushFx(["confetti"], `🎰 ${out.label}`); else pushFx([], `🎰 ${out.label}`); } }
                else if (meta.type === 'vip') pushFx(["spotlight"], `👑 ${meta.label} unlocked`);
                else pushFx([], `${meta.label} served`);
            }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, viewState]);

    const pushFx = (kinds: Array<FX["kind"]>, toastMsg?: string) => {
        const now = Date.now(); const items: FX[] = kinds.map((k) => ({ id: `${k}_${now}_${Math.random().toString(16).slice(2)}`, kind: k, createdAt: now })); setFx((rows) => [...rows, ...items]); if (toastMsg) setToast(toastMsg);
        window.setTimeout(() => { setFx((rows) => rows.filter((x) => now - x.createdAt < 1800)); setToast((t) => (t === toastMsg ? null : t)); }, 1600);
    };

    const confirmPurchase = (type: string, label: string, price: number, meta: any = {}) => { if (!roomId) return; setPendingPurchase({ type, label, price, meta }); };
    const handlePurchase = async (type: string, label: string, price: number, meta: any = {}) => {
        if (!roomId) return; activateBilling();
        try { const res = await fetch(`/api/v1/rooms/${roomId}/bar-lounge/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, label, amount: price, sessionId }) }); const data = await res.json(); if (!data.success) pushFx([], `Purchase failed: ${data.error || "Insufficient funds"}`); else pushFx([], `${label} sent!`); } catch { pushFx([], 'Network error'); }
    };
    const doSpin = () => { if (spinning || !roomId) return; confirmPurchase("spin", "Spin the Bottle", SPIN_PRICE); };
    const executeSpinAfterConfirm = async () => {
        if (spinning || !roomId) return; setSpinning(true); activateBilling(); setSpentHidden((s) => s + SPIN_PRICE);
        try { const res = await fetch(`/api/v1/rooms/${roomId}/bar-lounge/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: SPIN_PRICE }) }); const data = await res.json(); if (data.success) { setSpinResult(data.result || data.spin?.result); setTimeout(() => setSpinning(false), 1100); } else { setSpinning(false); pushFx([], `Spin failed: ${data.error || "Insufficient funds"}`); } } catch { setSpinning(false); pushFx([], 'Network error'); }
    };

    const handleTip = (amount: number) => { confirmPurchase("tip", `${cs()}${amount} Tip`, amount); };
    const handleCustomTip = () => { const amt = Number(tipAmount); if (amt > 0) confirmPurchase("tip", `${cs()}${amt} Tip`, amt); };

    const handleSendChat = () => {
        if (!chatInput.trim()) return;
        sendMessage(chatInput, user?.id, user?.user_metadata?.full_name || "Guest");
        setChatInput("");
        if (!billingActive) activateBilling();
    };

    const formatTime = (dateStr: string) => { const d = new Date(dateStr); const now = new Date(); const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000); if (diffMin < 1) return "Just started"; if (diffMin < 60) return `${diffMin}m ago`; return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago`; };

    if (isLoading || authLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: C.neonPurple }} /></div>;

    // ─── LOBBY VIEW ─────────────────────────────────────────────────────
    if (viewState === "lobby") {
        return (
            <div className="relative min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <style>{`
                    @keyframes blShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
                    .bl-shimmer { background: linear-gradient(90deg, transparent 25%, hsla(42,90%,55%,0.08) 50%, transparent 75%); background-size: 200% 100%; animation: blShimmer 3s ease-in-out infinite; }
                    @keyframes bl-sparkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
                    .bl-animate-sparkle { animation: bl-sparkle 2s ease-in-out infinite; }
                `}</style>
                <div className="fixed inset-0 z-0" style={{ backgroundImage: "url(/rooms/bar-lounge/lounge-bg-v2.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
                <div className="fixed inset-0 z-0" style={{ background: `${C.bg}99` }} />
                {/* Sparkle particles */}
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="fixed w-1 h-1 rounded-full bl-animate-sparkle z-10 pointer-events-none" style={{ background: C.gold, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 4}s`, animationDuration: `${2 + Math.random() * 3}s` }} />
                ))}
                <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <Link href="/home" style={{ ...glassPanel, padding: "10px 16px", borderRadius: "0.75rem", color: `${C.gold}cc`, fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                                <ArrowLeft className="w-4 h-4" /> Back
                            </Link>

                            <div>
                                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.875rem", fontWeight: 700, color: C.gold, ...glowTextGold }}>Bar Lounge</h1>
                                <p style={{ color: "hsla(45,100%,95%,0.4)", fontSize: "14px", marginTop: "4px" }}>Join a live chill session. Vibes only.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {user && role === 'creator' && (
                                <button onClick={startHosting} style={{ ...btnGoldStyle, padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                                    <Video className="w-4 h-4" /> {mySession ? "Resume Session" : "Go Live"}
                                </button>
                            )}
                            <WalletPill />
                        </div>
                    </div>
                    {activeSessions.length === 0 ? (
                        <div style={{ ...glassPanel, padding: "80px 20px", textAlign: "center", borderRadius: "1.5rem" }}>
                            <Wine className="w-14 h-14 mx-auto mb-5" style={{ color: `${C.gold}33` }} />
                            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: `${C.gold}66`, marginBottom: "8px" }}>No Active Sessions</h3>
                            <p style={{ color: "hsla(45,100%,95%,0.3)", fontSize: "14px" }}>Check back later — creators go live throughout the day.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                                <span style={{ fontSize: "14px", fontWeight: 700, color: `${C.gold}b3`, textTransform: "uppercase", letterSpacing: "0.1em" }}>{activeSessions.length} Live {activeSessions.length === 1 ? 'Session' : 'Sessions'}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {activeSessions.map((session: any, i: number) => {
                                    const creatorName = session.profiles?.full_name || session.profiles?.handle || "Creator";
                                    return (
                                        <div
                                            key={session.id}
                                            onClick={() => interceptJoin(session)}
                                            style={{
                                                position: "relative",
                                                borderRadius: "14px",
                                                background: "linear-gradient(145deg, hsla(270,40%,20%,0.7), hsla(270,50%,10%,0.8))",
                                                border: "1px solid hsla(42,90%,55%,0.15)",
                                                overflow: "hidden",
                                                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                                                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                                                cursor: "pointer",
                                                animation: `blCardEntry 0.5s ease-out ${i * 0.08}s both`,
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = "translateY(-3px)";
                                                e.currentTarget.style.background = "linear-gradient(145deg, hsla(270,40%,25%,0.9), hsla(270,50%,15%,0.95))";
                                                e.currentTarget.style.border = "1px solid hsla(42,90%,55%,0.4)";
                                                e.currentTarget.style.boxShadow = "0 20px 60px hsla(280,100%,70%,0.15), 0 0 0 1px hsla(42,90%,55%,0.2)";
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.background = "linear-gradient(145deg, hsla(270,40%,20%,0.7), hsla(270,50%,10%,0.8))";
                                                e.currentTarget.style.border = "1px solid hsla(42,90%,55%,0.15)";
                                                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
                                            }}
                                        >
                                            <style>{`@keyframes blCardEntry { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }`}</style>

                                            {/* Card top section */}
                                            <div style={{ padding: "12px 14px 0" }}>
                                                {/* Status row */}
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                                        {/* Live badge */}
                                                        <span style={{
                                                            display: "inline-flex", alignItems: "center", gap: "4px",
                                                            padding: "2px 7px", borderRadius: "6px",
                                                            background: "hsla(42,90%,55%,0.15)",
                                                            border: "1px solid hsla(42,90%,55%,0.3)",
                                                            fontSize: "8px", fontWeight: 800,
                                                            color: C.gold, letterSpacing: "1px",
                                                            textTransform: "uppercase" as const,
                                                            boxShadow: "0 0 10px hsla(42,90%,55%,0.15)",
                                                        }}>
                                                            <span style={{
                                                                width: 4, height: 4, borderRadius: "50%",
                                                                background: C.gold,
                                                                boxShadow: `0 0 8px ${C.gold}`,
                                                                animation: "bl-glow-pulse 1.5s ease-in-out infinite",
                                                            }} />
                                                            Active
                                                        </span>
                                                        {/* Access badge */}
                                                        <span style={{
                                                            display: "inline-flex", alignItems: "center", gap: "3px",
                                                            padding: "2px 6px", borderRadius: "6px",
                                                            background: "hsla(280,100%,70%,0.1)",
                                                            border: "1px solid hsla(280,100%,70%,0.2)",
                                                            fontSize: "8px", fontWeight: 700,
                                                            color: C.neonPurple,
                                                            textTransform: "uppercase" as const,
                                                            letterSpacing: "0.5px",
                                                        }}>
                                                            <Globe style={{ width: 8, height: 8 }} /> Open
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Title */}
                                                <h3 style={{
                                                    fontSize: "14px", fontWeight: 700,
                                                    color: "#fff",
                                                    margin: "0 0 4px", lineHeight: 1.3,
                                                    transition: "color 0.3s ease",
                                                    overflow: "hidden", textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap" as const,
                                                }}>
                                                    {session.title || "Premium Nightclub Experience"}
                                                </h3>
                                                <div style={{ minHeight: "16px", marginBottom: "8px" }}>
                                                    <p style={{
                                                        fontSize: "11px", color: "hsla(45,100%,95%,0.6)",
                                                        margin: 0, lineHeight: 1.4,
                                                        overflow: "hidden", display: "-webkit-box",
                                                        WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const
                                                    }}>
                                                        {session.description || " "}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Creator row */}
                                            <div style={{
                                                padding: "8px 14px",
                                                display: "flex", alignItems: "center", gap: "8px",
                                                borderTop: `1px solid ${C.borderLight}`,
                                                borderBottom: `1px solid ${C.borderLight}`,
                                                background: "hsla(42,90%,55%,0.05)",
                                                marginTop: "8px"
                                            }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: "8px",
                                                    background: "linear-gradient(135deg, hsla(42,90%,55%,1), hsla(280,100%,70%,1))",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    overflow: "hidden", flexShrink: 0,
                                                    border: `2px solid hsla(42,90%,55%,0.3)`,
                                                    boxShadow: `0 0 15px hsla(42,90%,55%,0.3)`,
                                                }}>
                                                    {session.profiles?.avatar_url ? (
                                                        <img src={session.profiles.avatar_url} alt=""
                                                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    ) : (
                                                        <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>
                                                            {creatorName[0]?.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <CreatorProfileHover
                                                        creatorId={session.host_id}
                                                        creatorName={creatorName}
                                                        avatarUrl={session.profiles?.avatar_url}
                                                    >
                                                        <div style={{
                                                            fontSize: "12px", fontWeight: 600, color: "#fff",
                                                            textShadow: `0 0 5px hsla(42,90%,55%,0.3)`,
                                                        }}>
                                                            {creatorName}
                                                        </div>
                                                    </CreatorProfileHover>
                                                    <div style={{
                                                        fontSize: "10px", color: "hsla(45,100%,95%,0.6)",
                                                        marginTop: "1px",
                                                    }}>
                                                        Uplink {formatTime(session.created_at)}
                                                    </div>
                                                </div>
                                                <Crown style={{
                                                    width: 13, height: 13,
                                                    color: C.gold,
                                                    filter: `drop-shadow(0 0 5px ${C.gold})`,
                                                }} />
                                            </div>

                                            {/* Stats row */}
                                            <div style={{
                                                padding: "8px 14px",
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                            }}>
                                                <div style={{
                                                    display: "flex", alignItems: "center", gap: "4px",
                                                    fontSize: "10px", color: "hsla(45,100%,95%,0.7)", fontWeight: 500,
                                                }}>
                                                    <Eye style={{ width: 11, height: 11 }} />
                                                    <span>{session.viewer_count || 0} viewers</span>
                                                </div>
                                                <div style={{
                                                    display: "flex", alignItems: "center", gap: "4px",
                                                    fontSize: "10px", fontWeight: 800,
                                                    color: C.gold,
                                                    textShadow: `0 0 10px hsla(42,90%,55%,0.3)`,
                                                }}>
                                                    <span>{cs()}{(session as any).entry_fee || ENTRY_FEE}</span>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div style={{ padding: "0 12px 12px" }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); interceptJoin(session); }}
                                                    style={{
                                                        width: "100%", padding: "9px",
                                                        borderRadius: "10px", border: `1px solid hsla(42,90%,55%,0.5)`,
                                                        background: "linear-gradient(135deg, hsla(42,90%,55%,0.8), hsla(42,80%,45%,0.9))",
                                                        color: C.bg, fontSize: "11px", fontWeight: 800,
                                                        cursor: "pointer", transition: "all 0.3s ease",
                                                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                        boxShadow: `0 0 20px hsla(42,90%,55%,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`,
                                                        letterSpacing: "0.5px", textTransform: "uppercase",
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 0 30px hsla(42,90%,55%,0.5), inset 0 1px 0 rgba(255,255,255,0.2)`; e.currentTarget.style.background = "linear-gradient(135deg, hsla(42,90%,55%,0.9), hsla(42,80%,45%,1))"; }}
                                                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 0 20px hsla(42,90%,55%,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`; e.currentTarget.style.background = "linear-gradient(135deg, hsla(42,90%,55%,0.8), hsla(42,80%,45%,0.9))"; }}
                                                >
                                                    <Play style={{ width: 12, height: 12, fill: C.bg, stroke: C.bg }} /> Enter Lounge
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ── Room Entry Info Modal ── */}
                    <RoomEntryInfoModal
                        isOpen={showEntryInfo}
                        onClose={() => { setShowEntryInfo(false); setPendingEntrySession(null); }}
                        onEnter={() => {
                            setShowEntryInfo(false);
                            if (pendingEntrySession) {
                                joinSession(pendingEntrySession);
                                setPendingEntrySession(null);
                            }
                        }}
                        roomType="bar-lounge"
                        roomLabel="Bar Lounge"
                        roomEmoji="🍸"
                        accentHsl="45, 90%, 55%"
                        accentHslSecondary="280, 40%, 50%"
                        sessionTitle={pendingEntrySession?.title || undefined}
                        sessionType="public"
                        entryFee={pendingEntrySession ? Number((pendingEntrySession as any).entry_fee) || ENTRY_FEE : ENTRY_FEE}
                    />
                </div>
            </div>
        );
    }

    // ─── WATCHING / HOSTING VIEW (matching reference UI exactly) ─────────
    const creatorName = hostProfile?.full_name || hostProfile?.handle || "Creator";
    const sessionTitle = activeSessions.find(s => s.id === roomId)?.title || "";

    return (
        <div className="relative h-[100dvh] w-screen overflow-hidden" style={{ fontFamily: "'Montserrat', sans-serif", color: C.fg, background: C.bg }}>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes blBottleSpin { 0% { transform: rotate(0deg) scale(1); } 60% { transform: rotate(720deg) scale(1.04); } 100% { transform: rotate(1080deg) scale(1); } }
                @keyframes blSpotlight { 0% { opacity: 0; } 10% { opacity: 1; } 70% { opacity: 0.85; } 100% { opacity: 0; } }
                @keyframes blConfettiFall { 0% { transform: translateY(-10px) rotate(0deg); } 100% { transform: translateY(110vh) rotate(540deg); } }
                @keyframes bl-glow-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
                @keyframes bl-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                @keyframes bl-sparkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
                @keyframes bl-neon-flicker { 0%, 100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.7; } 94% { opacity: 1; } 96% { opacity: 0.8; } 97% { opacity: 1; } }
                .bl-glow-pulse { animation: bl-glow-pulse 2s ease-in-out infinite; }
                .bl-float { animation: bl-float 4s ease-in-out infinite; }
                .bl-sparkle { animation: bl-sparkle 2s ease-in-out infinite; }
                .bl-neon-flicker { animation: bl-neon-flicker 3s ease-in-out infinite; }
                .bl-bottle { font-size: 68px; line-height: 1; filter: saturate(1.8) contrast(1.15); text-shadow: 0 0 18px rgba(244,182,37,0.55), 0 0 42px rgba(244,182,37,0.25); }
                .bl-bottle-spin { animation: blBottleSpin 1.1s cubic-bezier(.18,.9,.2,1) both; }
                .bl-spotlight { background: radial-gradient(circle at 50% 40%, rgba(244,182,37,0.24), transparent 55%); animation: blSpotlight 1.6s ease-out both; mix-blend-mode: screen; }
                .bl-confetti { position: absolute; width: 10px; height: 12px; border-radius: 3px; background: ${C.gold}e6; box-shadow: 0 0 14px ${C.gold}8c; animation-name: blConfettiFall; animation-timing-function: ease-in; animation-fill-mode: both; }
                .bl-chat-scroll::-webkit-scrollbar { width: 4px; }
                .bl-chat-scroll::-webkit-scrollbar-track { background: transparent; }
                .bl-chat-scroll::-webkit-scrollbar-thumb { background: hsla(280,60%,45%,0.3); border-radius: 10px; }
            `}} />

            {/* Background */}
            <div className="fixed inset-0 z-0" style={{ backgroundImage: "url(/rooms/bar-lounge/lounge-bg-v2.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="fixed inset-0 z-0" style={{ background: `${C.bg}99` }} />

            {/* Sparkle particles */}
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="fixed w-1 h-1 rounded-full bl-sparkle z-10 pointer-events-none" style={{ background: C.gold, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 4}s`, animationDuration: `${2 + Math.random() * 3}s` }} />
            ))}

            {/* FX overlays */}
            {(fx.length > 0 || toast) && (
                <div className="fixed inset-0 pointer-events-none z-[60]">
                    {fx.some((x) => x.kind === "spotlight") && <div className="absolute inset-0 bl-spotlight" />}
                    {fx.some((x) => x.kind === "confetti") && <div className="absolute inset-0 overflow-hidden">{Array.from({ length: 42 }).map((_, i) => <span key={i} className="bl-confetti" style={{ left: `${Math.random() * 100}%`, top: `-12px`, animationDelay: `${Math.random() * 0.35}s`, animationDuration: `${1.1 + Math.random() * 0.6}s` }} />)}</div>}
                    {toast && <div className="absolute top-10 left-1/2 -translate-x-1/2 rounded-full px-8 py-4 z-[70]" style={{ border: `1px solid ${C.gold}66`, background: `${C.bg}e6`, fontSize: "14px", color: C.gold, fontWeight: 700, boxShadow: `0 0 40px ${C.gold}4d`, textTransform: "uppercase", letterSpacing: "0.1em" }}>{toast}</div>}
                </div>
            )}

            {/* Content */}
            <div className="relative z-20 h-full overflow-hidden flex flex-col p-3 lg:p-6 pb-20 lg:pb-6">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto w-full shrink-0">
                    <div className="flex items-center gap-3">
                        {viewState === 'hosting' ? (
                            <button onClick={endHosting} style={{ ...glassPanel, padding: "8px 16px", borderRadius: "0.75rem", fontSize: "12px", fontWeight: 700, color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", gap: "8px" }}>
                                <LogOut className="w-4 h-4" /> End Session
                            </button>
                        ) : (
                            <button onClick={() => setViewState("lobby")} style={{ ...glassPanel, padding: "8px 16px", borderRadius: "0.75rem", fontSize: "12px", fontWeight: 700, color: `${C.gold}cc`, display: "flex", alignItems: "center", gap: "8px" }}>
                                <ArrowLeft className="w-4 h-4" /> Exit Lounge
                            </button>
                        )}
                        <div>
                            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 700, color: C.gold, ...glowTextGold }}>Bar Lounge</h1>
                            <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: C.muted }}>{sessionTitle || "Premium Nightclub Experience"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <WalletPill />
                    </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden lg:grid max-w-7xl mx-auto w-full flex-1 min-h-0 grid-cols-[320px_1fr_350px] gap-6 overflow-hidden">
                    {/* ─── LEFT: Drink Menu ─── */}
                    <div className="overflow-y-auto bl-chat-scroll h-full" style={{ ...glassPanel, padding: "16px", display: "flex", flexDirection: "column" }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Wine className="w-5 h-3 bl-glow-pulse" style={{ color: C.neonPurple }} />
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 700, color: C.gold, ...glowTextGold }}>Buy a Drink</h2>
                        </div>
                        <p style={{ color: C.muted, fontSize: "14px", marginBottom: "8px" }}>for {creatorName}</p>

                        <div style={{ borderTop: `1px solid ${C.borderStrong}`, paddingTop: "8px" }}>
                            <h3 style={{ fontSize: "12px", fontWeight: 600, color: C.muted, marginBottom: "8px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Drink Menu</h3>
                            <div className="space-y-0">
                                {drinks.slice(0, 9).map((drink: any) => (
                                    <div key={drink.id || drink.name} style={drinkItemStyle} onClick={() => confirmPurchase("drink", drink.name, drink.price, { special: drink.special })}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "hsla(280,60%,45%,0.2)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 10px hsla(280,100%,70%,0.2)"; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = C.glassBgStrong; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                                        <div className="flex items-center gap-2">
                                            <span style={{ fontSize: "18px" }}>{drink.icon}</span>
                                            <span style={{ color: C.fg, fontWeight: 500, fontSize: "14px" }}>{drink.name}</span>
                                        </div>
                                        <span style={{ color: C.gold, fontWeight: 600 }}>{cs()}{drink.price}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* VIP Section */}
                        <div style={{ borderTop: `1px solid ${C.borderStrong}`, paddingTop: "12px", marginTop: "12px" }}>
                            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: 700, color: C.fg, textAlign: "center", marginBottom: "8px" }}>VIP Lounge</h3>
                            <div style={{ ...glassPanel, ...glowGold, padding: "16px", cursor: "pointer", transition: "all 0.2s" }} onClick={() => confirmPurchase("vip", `VIP Upgrade`, vipPrice)} className="hover:scale-[1.02] hover:bg-white/5 active:scale-95">
                                <div className="flex items-center gap-2">
                                    <Crown className="w-5 h-5 bl-glow-pulse" style={{ color: C.gold }} />
                                    <span style={{ fontWeight: 700, color: C.gold, ...glowTextGold }}>Upgrade to VIP - ${vipPrice}</span>
                                </div>
                                <ul style={{ fontSize: "14px", color: C.muted, marginLeft: "28px", marginTop: "4px" }}>
                                    <li className="flex items-center gap-1"><Sparkles className="w-3 h-3" style={{ color: C.neonPink }} /> Exclusive Content</li>
                                </ul>
                            </div>
                            <div className="mt-3 hover:scale-[1.02] hover:bg-white/5 active:scale-95 transition-all" style={{ ...glassPanel, padding: "16px", cursor: "pointer" }} onClick={() => confirmPurchase("booth", "Booth Reservation", 300)}>
                                <div className="flex items-center gap-2">
                                    <span style={{ fontSize: "20px" }}>🛋️</span>
                                    <div>
                                        <span style={{ fontWeight: 700, color: C.fg, fontSize: "15px" }}>Reserve a Booth</span>
                                        <span style={{ color: C.gold, fontWeight: 700, marginLeft: "8px", fontSize: "15px" }}>{cs()}300</span>
                                        <p style={{ fontSize: "13px", color: C.muted, marginTop: "2px" }}>🎉 Private (5 mins)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── CENTER: Stream + Tips + Spin ─── */}
                    <div className="flex flex-col overflow-y-auto bl-chat-scroll h-full">
                        {/* Stream */}
                        <div className="relative shrink-0" style={{ ...glassPanel, ...glowPurple, overflow: "hidden", borderRadius: "0.75rem" }}>
                            <div style={{ aspectRatio: "16/9", width: "100%", position: "relative" }}>
                                {roomId && <LiveStreamWrapper role={viewState === "hosting" ? "host" : "fan"} appId={APP_ID} roomId={roomId} uid={user?.id || 0} hostId={hostId || ""} hostAvatarUrl={hostProfile?.avatar_url || ""} hostName={creatorName} />}
                            </div>
                            {/* Floating hearts */}
                            <div className="absolute top-10 right-4 bl-float" style={{ zIndex: 30 }}>
                                <Heart className="w-10 h-10 bl-glow-pulse" style={{ color: C.neonPink, fill: `${C.neonPink}80`, filter: `drop-shadow(0 0 10px ${C.neonPink}99)` }} />
                            </div>
                            <div className="absolute top-12 right-16 bl-float" style={{ animationDelay: "1s", zIndex: 30 }}>
                                <Heart className="w-6 h-6 bl-glow-pulse" style={{ color: C.neonPink, fill: `${C.neonPink}4d`, filter: `drop-shadow(0 0 8px ${C.neonPink}66)` }} />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: `linear-gradient(to top, ${C.bg}cc, transparent)` }} />
                        </div>

                        {/* Tips */}
                        <div className="mt-0 shrink-0" style={{ border: `1px solid ${C.borderLight}`, borderRadius: "0.75rem", padding: "24px 64px", paddingTop: "0" }}>
                            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: 700, color: C.fg, textAlign: "center", marginBottom: "12px", marginTop: "12px" }}>
                                <Zap className="w-5 h-5 inline mr-2" style={{ color: C.gold }} />Tip Now
                            </h3>
                            <div className="flex gap-4 mb-3">
                                {[10, 25, 50].map((amount) => (
                                    <button key={amount} style={tipBtnStyle} className="flex-1 text-sm" onClick={() => handleTip(amount)}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "hsla(280,60%,45%,0.3)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 15px hsla(280,100%,70%,0.3)"; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "hsla(270,40%,15%,0.4)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
                                        ${amount}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1 flex items-center gap-1" style={{ ...tipBtnStyle, padding: "8px 12px" }}>
                                    <span style={{ color: C.gold }}>{cs()}</span>
                                    <input type="number" placeholder="Custom Amount" value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} className="bg-transparent outline-none flex-1 text-sm" style={{ color: C.fg, fontFamily: "'Montserrat', sans-serif" }} />
                                </div>
                                <button style={{ ...btnGoldStyle, padding: "8px 16px", flex: 1, fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }} onClick={handleCustomTip}>
                                    <DollarSign className="w-4 h-4" /> SEND TIP
                                </button>
                            </div>
                        </div>

                        {/* Spin the Bottle */}
                        <div className="mt-4 shrink-0" style={{ ...glassPanel, padding: "24px", borderRadius: "0.75rem" }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-5 h-5" style={{ color: C.gold }} />
                                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: C.gold, ...glowTextGold }}>Spin the Bottle</h2>
                                </div>
                                <div style={{ padding: "4px 12px", borderRadius: "9999px", background: `${C.gold}1a`, border: `1px solid ${C.gold}33`, color: C.gold, fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>{cs()}{SPIN_PRICE} PER SPIN</div>
                            </div>
                            <div className="rounded-2xl p-8 flex items-center justify-center relative overflow-hidden group" style={{ background: `${C.bg}66`, border: `1px solid hsla(0,0%,100%,0.05)` }}>
                                <div className={`bl-bottle relative z-10 transition-transform ${spinning ? "bl-bottle-spin" : ""}`}>🥂</div>
                                {spinResult && !spinning && <div className="absolute inset-0 flex items-center justify-center" style={{ background: `${C.bg}99`, backdropFilter: "blur(4px)" }}><div className="text-center p-6"><div style={{ fontSize: "1.25rem", color: C.gold, fontFamily: "'Playfair Display', serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>{spinResult.label}</div><div style={{ fontSize: "14px", color: "hsla(0,0%,100%,0.7)", fontStyle: "italic" }}>"{spinResult.note}"</div></div></div>}
                            </div>
                            <button style={{ ...btnGoldStyle, width: "100%", padding: "16px", marginTop: "24px", borderRadius: "0.75rem", fontSize: "18px", fontWeight: 900, letterSpacing: "0.1em", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", opacity: spinning ? 0.8 : 1, cursor: spinning ? "not-allowed" : "pointer" }} onClick={doSpin} disabled={spinning}>
                                {spinning ? <><Loader2 className="w-6 h-6 animate-spin" /> SPINNING...</> : <>TRY YOUR LUCK <Zap className="w-5 h-5" /></>}
                            </button>
                        </div>
                    </div>

                    {/* ─── RIGHT: Lounge Chat ─── */}
                    <div className="h-full flex flex-col overflow-hidden" style={{ ...glassPanel, padding: "16px", display: "flex", flexDirection: "column" }}>
                        <div className="flex items-center justify-between mb-3 shrink-0">
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 700, color: C.gold, ...glowTextGold }}>Lounge Chat</h2>
                            <span style={liveBadge}>
                                <span className="w-2 h-2 rounded-full bl-glow-pulse" style={{ background: "hsl(140,70%,55%)" }} />
                                Live
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 bl-chat-scroll" style={{ marginBottom: "12px", minHeight: 0 }}>
                            {messages.map((msg: any) => (
                                <div key={msg.id} style={chatMsgStyle} className="flex items-start gap-2">
                                    <span style={{ fontSize: "18px", flexShrink: 0 }}>{msg.is_system ? "🔔" : "🧑"}</span>
                                    <div className="flex-1 min-w-0">
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                                            <span style={{ fontWeight: 700, fontSize: "14px", color: C.fg }}>{msg.handle || "Anonymous"}</span>
                                            {msg.user_id && <UserBadgeDisplay userId={msg.user_id} />}
                                            {msg.handle && msg.handle.includes("VIP") && <Crown className="w-3 h-3 inline" style={{ color: C.gold }} />}
                                        </div>
                                        <span style={{ fontSize: "14px", color: C.muted, display: "block", marginTop: "2px" }}>{msg.content}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Pin name */}
                        <div style={{ ...chatMsgStyle, ...glowPink, display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }} onClick={() => confirmPurchase("pin", "Pin Name to Top", 25)} className="shrink-0">
                            <span style={{ fontSize: "18px" }}>🔥</span>
                            <span className="bl-neon-flicker" style={{ fontSize: "14px", fontWeight: 700, color: C.neonPink }}>PIN NAME TO TOP 10 mins</span>
                            <span style={{ color: C.gold, fontWeight: 700, marginLeft: "auto" }}>+{cs()}25</span>
                        </div>

                        <div className="flex gap-2 shrink-0" style={{ alignItems: "center" }}>
                            <input
                                type="text"
                                placeholder="Send a message..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                                style={{ background: "hsla(270,30%,18%,0.3)", border: `1px solid ${C.borderStrong}`, color: C.fg, fontFamily: "'Montserrat', sans-serif" }}
                            />
                            <EmojiPicker
                                onEmojiSelect={(emoji) => setChatInput((prev) => prev + emoji)}
                                accentColor={C.gold}
                                position="top"
                            />
                            <button onClick={handleSendChat} style={{ ...btnGlowStyle, padding: "8px 16px", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
                                SEND
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Layout */}
                <div className="lg:hidden flex flex-col gap-3 flex-1 min-h-0 overflow-hidden w-full">
                    {/* Stream — always visible at top */}
                    <div className="relative w-full aspect-video max-w-[600px] shrink-0 mx-auto rounded-xl overflow-hidden shadow-lg border border-[hsla(42,90%,55%,0.2)] bg-black/40">
                        {roomId && <LiveStreamWrapper role={viewState === "hosting" ? "host" : "fan"} appId={APP_ID} roomId={roomId} uid={user?.id || 0} hostId={hostId || ""} hostAvatarUrl={hostProfile?.avatar_url || ""} hostName={creatorName} />}
                        {/* Floating hearts */}
                        <div className="absolute top-4 right-4 bl-float" style={{ zIndex: 30 }}>
                            <Heart className="w-6 h-6 bl-glow-pulse" style={{ color: C.neonPink, fill: `${C.neonPink}80`, filter: `drop-shadow(0 0 10px ${C.neonPink}99)` }} />
                        </div>
                    </div>

                    {/* Tip Creator Row — fixed below video */}
                    <div className="shrink-0 flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-2">
                        <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">Tip Host</span>
                        <div className="flex gap-1.5 flex-1 justify-end">
                            {[10, 25, 50].map((amount) => (
                                <button key={`tip-mobile-${amount}`} className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold active:scale-95" onClick={() => handleTip(amount)}>
                                    ${amount}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab panels */}
                    {mobileTab === "chat" && (
                        <div className="w-full flex-1 min-h-0 flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                                <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Lounge Chat</h3>
                                <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bl-chat-scroll">
                                {messages.map((msg: any) => (
                                    <div key={msg.id} style={chatMsgStyle} className="flex items-start gap-1.5">
                                        <span style={{ fontSize: "14px", flexShrink: 0 }}>{msg.is_system ? "🔔" : "🧑"}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <span className="font-bold text-xs text-white">{msg.handle || "Anonymous"}</span>
                                                {msg.user_id && <UserBadgeDisplay userId={msg.user_id} />}
                                            </div>
                                            <span className="text-xs text-white/70 block mt-0.5">{msg.content}</span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-2 border-t border-white/10 bg-white/5 shrink-0 flex flex-col gap-2">
                                <div onClick={() => confirmPurchase("pin", "Pin Name to Top", 25)} className="flex items-center justify-between bg-pink-500/10 border border-pink-500/25 rounded-lg px-2.5 py-1.5 cursor-pointer">
                                    <span className="text-[9px] font-black text-pink-400 tracking-wider">🔥 PIN NAME TO TOP 10 mins</span>
                                    <span className="text-[9px] font-bold text-amber-400">+{cs()}25</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        placeholder="Send a message..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                                        className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none bg-white/5 border border-white/10 text-white"
                                    />
                                    <EmojiPicker
                                        onEmojiSelect={(emoji) => setChatInput((prev) => prev + emoji)}
                                        accentColor={C.gold}
                                        position="top"
                                    />
                                    <button onClick={handleSendChat} style={{ ...btnGlowStyle, padding: "6px 12px", fontSize: "11px" }}>
                                        SEND
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {mobileTab === "drinks" && (
                        <div className="w-full flex-1 min-h-0 overflow-y-auto pb-4 flex flex-col gap-3">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col">
                                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Drink Menu</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {drinks.slice(0, 9).map((drink: any) => (
                                        <div key={drink.id || drink.name} style={drinkItemStyle} onClick={() => confirmPurchase("drink", drink.name, drink.price, { special: drink.special })}>
                                            <div className="flex items-center gap-2">
                                                <span style={{ fontSize: "16px" }}>{drink.icon}</span>
                                                <span style={{ color: C.fg, fontWeight: 500, fontSize: "13px" }}>{drink.name}</span>
                                            </div>
                                            <span style={{ color: C.gold, fontWeight: 600, fontSize: "13px" }}>{cs()}{drink.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2.5">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider">VIP Lounge</h3>
                                <div style={{ ...glassPanel, ...glowGold, padding: "12px", cursor: "pointer" }} onClick={() => confirmPurchase("vip", `VIP Upgrade`, vipPrice)} className="active:scale-95">
                                    <div className="flex items-center gap-2">
                                        <Crown className="w-4 h-4 text-amber-400" />
                                        <span className="font-bold text-xs text-amber-400">Upgrade to VIP - ${vipPrice}</span>
                                    </div>
                                </div>
                                <div style={{ ...glassPanel, padding: "12px", cursor: "pointer" }} onClick={() => confirmPurchase("booth", "Booth Reservation", 300)}>
                                    <div className="flex items-center gap-2">
                                        <span style={{ fontSize: "16px" }}>🛋️</span>
                                        <div>
                                            <span className="font-bold text-xs text-white">Reserve a Booth</span>
                                            <span className="text-amber-400 font-bold ml-2 text-xs">{cs()}300</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {mobileTab === "games" && (
                        <div className="w-full flex-1 min-h-0 overflow-y-auto pb-4 flex flex-col gap-3">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Spin the Bottle</h3>
                                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-black">{cs()}{SPIN_PRICE} PER SPIN</span>
                                </div>
                                <div className="rounded-xl p-6 flex items-center justify-center relative overflow-hidden" style={{ background: `${C.bg}66`, border: `1px solid hsla(0,0%,100%,0.05)` }}>
                                    <div className={`bl-bottle relative z-10 transition-transform ${spinning ? "bl-bottle-spin" : ""}`}>🥂</div>
                                    {spinResult && !spinning && <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm"><div className="text-center p-4"><div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">{spinResult.label}</div><div className="text-[10px] text-white/70 italic">"{spinResult.note}"</div></div></div>}
                                </div>
                                <button style={{ ...btnGoldStyle, width: "100%", padding: "12px", marginTop: "16px", borderRadius: "0.5rem", fontSize: "14px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }} onClick={doSpin} disabled={spinning}>
                                    {spinning ? <><Loader2 className="w-4 h-4 animate-spin" /> SPINNING...</> : <>TRY YOUR LUCK <Zap className="w-4 h-4" /></>}
                                </button>
                            </div>
                        </div>
                    )}

                    {mobileTab === "info" && (
                        <div className="w-full flex-1 min-h-0 overflow-y-auto pb-4 flex flex-col gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 to-pink-500 flex items-center justify-center overflow-hidden border border-white/20">
                                        {hostProfile?.avatar_url ? (
                                            <img src={hostProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="font-bold text-white">{creatorName[0]?.toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-white">{creatorName}</h4>
                                        <span className="text-[9px] text-amber-400 uppercase tracking-widest font-bold">Host</span>
                                    </div>
                                </div>
                                {sessionTitle && (
                                    <p className="text-xs text-white/60 leading-relaxed mt-1">{sessionTitle}</p>
                                )}
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🪙</span>
                                    <div>
                                        <h5 className="text-[9px] text-gray-500 uppercase font-black">My Balance</h5>
                                        <div className="mt-0.5">
                                            <WalletPill />
                                        </div>
                                    </div>
                                </div>
                                {viewState !== 'hosting' && (
                                    <button onClick={() => setViewState("lobby")} className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all">
                                        <LogOut className="w-3.5 h-3.5" />
                                        <span>Exit Lounge</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Tab Bar */}
            <div className="lg:hidden">
                <MobileStudioTabs
                    tabs={BAR_LOUNGE_FAN_TABS}
                    activeTab={mobileTab}
                    onTabChange={setMobileTab}
                    accentHsl="42, 90%, 55%"
                />
            </div>

            {/* Spend Confirm Modal */}
            <SpendConfirmModal
                isOpen={!!pendingPurchase}
                onClose={() => setPendingPurchase(null)}
                title="Confirm Purchase"
                itemLabel={pendingPurchase?.label || ''}
                amount={pendingPurchase?.price || 0}
                walletBalance={walletBalance}
                onConfirm={async () => {
                    if (!pendingPurchase) return;
                    if (pendingPurchase.type === "spin") { setPendingPurchase(null); await executeSpinAfterConfirm(); }
                    else { await handlePurchase(pendingPurchase.type, pendingPurchase.label, pendingPurchase.price, pendingPurchase.meta); setSpentHidden(s => s + pendingPurchase.price); setPendingPurchase(null); }
                }}
            />

            {/* Per-minute billing overlay — charges fan based on admin room settings */}
            <BillingOverlay
                sessionId={sessionId}
                accentHsl="42, 90%, 55%"
                exitRoute="/home"
            />

        </div>
    );
}
