"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useBarChat } from "@/hooks/useBarChat";
import { useAuth } from "@/app/context/AuthContext";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Video, Send, Zap, Star, Sparkles, MessageCircle, Crown,
    Search, Bell, LogOut, User as UserIcon, CreditCard, Users, Settings, Heart,
    Link as LinkIcon, Loader2, Play, DollarSign, Wine, Home, Eye, Clock, UserPlus
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import WalletPill from "@/components/common/WalletPill";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { useWallet } from "@/hooks/useWallet";
import RoomEntryInfoModal, { isRoomEntryDismissed } from "@/components/rooms/shared/RoomEntryInfoModal";

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

export default function BarLoungeRoom() {
    const ENTRY_FEE = 10;
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();
    const [viewState, setViewState] = useState<"lobby" | "hosting">("lobby");
    const [activeSessions, setActiveSessions] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mySession, setMySession] = useState<Room | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const { messages, sendMessage } = useBarChat(roomId);
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
                    let { data: sessions, error } = await supabase.from("rooms").select("id, title, status, host_id, created_at, viewer_count, profiles:host_id(handle, avatar_url, full_name, id)").eq("status", "live").eq("type", "bar-lounge").order("created_at", { ascending: false });
                    if (error || !sessions) {
                        const { data: rawRooms } = await supabase.from("rooms").select("*").eq("status", "live").eq("type", "bar-lounge");
                        if (rawRooms) {
                            const hostIds = Array.from(new Set(rawRooms.map((r: any) => r.host_id)));
                            const { data: profiles } = await supabase.from("profiles").select("*").in("id", hostIds);
                            sessions = rawRooms.map((r: any) => ({ ...r, profiles: profiles?.find((p: any) => p.id === r.host_id) || null }));
                        }
                    }
                    if (isMounted && sessions) setActiveSessions(sessions as any);
                };
                await fetchSessions();
                if (isMounted) { roomChannel = supabase.channel('public:rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'type=eq.bar-lounge' }, fetchSessions).subscribe(); }
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
                        { id: "d10", name: "Devil's Kiss Shot", price: 50, icon: "💋" },
                    ]);
                }
            } catch (err) { console.error(err); } finally { if (isMounted) setIsLoading(false); }
        };
        init();
        return () => { isMounted = false; if (roomChannel) supabase.removeChannel(roomChannel); };
    }, [user, role, authLoading]);

    const joinSession = (room: Room) => {
        router.push(`/rooms/pgx-page2?roomId=${room.id}&hostId=${room.host_id}`);
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
            setRoomId(mySession.id); setHostId(user.id); setViewState("hosting"); setIsLoading(false); return; 
        }
        const { data } = await supabase.from("rooms").insert({ host_id: user.id, title: `${user.user_metadata?.full_name || user.email?.split('@')[0]}'s Lounge`, status: "live", type: "bar-lounge" }).select().single();
        if (data) { setMySession(data); setRoomId(data.id); setHostId(user.id); setViewState("hosting"); }
        setIsLoading(false);
    };
    const endHosting = async () => { if (!confirm("End session?") || !roomId) return; const { error } = await supabase.from("rooms").update({ status: "ended" }).eq("id", roomId); if (!error) { setMySession(null); setRoomId(null); setHostId(null); setViewState("lobby"); } };

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
        try { const res = await fetch(`/api/v1/rooms/${roomId}/bar-lounge/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, label, amount: price }) }); const data = await res.json(); if (!data.success) pushFx([], `Purchase failed: ${data.error || "Insufficient funds"}`); else pushFx([], `${label} sent!`); } catch { pushFx([], 'Network error'); }
    };
    const doSpin = () => { if (spinning || !roomId) return; confirmPurchase("spin", "Spin the Bottle", SPIN_PRICE); };
    const executeSpinAfterConfirm = async () => {
        if (spinning || !roomId) return; setSpinning(true); activateBilling(); setSpentHidden((s) => s + SPIN_PRICE);
        try { const res = await fetch(`/api/v1/rooms/${roomId}/bar-lounge/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: SPIN_PRICE }) }); const data = await res.json(); if (data.success) { setSpinResult(data.result || data.spin?.result); setTimeout(() => setSpinning(false), 1100); } else { setSpinning(false); pushFx([], `Spin failed: ${data.error || "Insufficient funds"}`); } } catch { setSpinning(false); pushFx([], 'Network error'); }
    };

    const handleTip = (amount: number) => { confirmPurchase("tip", `$${amount} Tip`, amount); };
    const handleCustomTip = () => { const amt = Number(tipAmount); if (amt > 0) confirmPurchase("tip", `$${amt} Tip`, amt); };

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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeSessions.map((session: any) => (
                                    <div key={session.id} className="group relative rounded-2xl overflow-hidden cursor-pointer" onClick={() => interceptJoin(session)} style={{ background: `${C.bg}99`, border: `1px solid hsla(42,90%,55%,0.15)`, transition: "all 0.2s" }}>
                                        <div className="h-44 relative overflow-hidden">
                                            {session.profiles?.avatar_url ? <img src={session.profiles.avatar_url} className="w-full h-full object-cover" style={{ filter: "brightness(0.5) saturate(1.3)" }} /> : <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-black/40 to-transparent" />}
                                            <div className="absolute inset-0 bl-shimmer" />
                                            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3), transparent)" }} />
                                            <div className="absolute top-3 left-3 px-3 py-1 rounded-full flex items-center gap-1.5" style={{ background: "rgba(239,68,68,0.9)", color: "white", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: "0 0 15px rgba(239,68,68,0.5)" }}>
                                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Live
                                            </div>
                                            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: "hsla(0,0%,0%,0.5)", backdropFilter: "blur(8px)", fontSize: "10px", fontWeight: 700, color: "hsla(0,0%,100%,0.8)" }}>
                                                <Eye className="w-3 h-3" /> {session.viewer_count || 0}
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${C.gold}33`, backdropFilter: "blur(4px)", border: `1px solid ${C.gold}4d`, boxShadow: `0 0 30px ${C.gold}4d` }}>
                                                    <Play className="w-7 h-7 ml-1" style={{ color: C.gold }} fill="currentColor" />
                                                </div>
                                            </div>
                                            <div className="absolute bottom-3 right-3 flex items-center gap-1" style={{ fontSize: "10px", color: "hsla(0,0%,100%,0.5)", fontWeight: 500 }}>
                                                <Clock className="w-3 h-3" /> {formatTime(session.created_at)}
                                            </div>
                                        </div>
                                        <div className="p-4 flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-full overflow-hidden shrink-0" style={{ border: `2px solid ${C.gold}4d`, boxShadow: `0 0 12px ${C.gold}33` }}>
                                                {session.profiles?.avatar_url ? <img src={session.profiles.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(to br, hsl(280,60%,30%), hsl(280,60%,15%))" }}><UserIcon className="w-5 h-5" style={{ color: `${C.gold}66` }} /></div>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="truncate" style={{ fontSize: "1rem", fontWeight: 700, color: "white" }}>{session.title || "Untitled Session"}</h3>
                                                <p className="truncate" style={{ fontSize: "12px", color: `${C.gold}80`, marginTop: "2px" }}>Hosted by <span style={{ color: `${C.gold}b3`, fontWeight: 500 }}>{session.profiles?.full_name || session.profiles?.handle || "Creator"}</span></p>
                                            </div>
                                            <div className="shrink-0 px-3 py-1.5 rounded-lg" style={{ fontSize: "10px", fontWeight: 900, color: C.gold, textTransform: "uppercase", letterSpacing: "0.05em", background: `${C.gold}14`, border: `1px solid ${C.gold}33` }}>Join</div>
                                        </div>
                                    </div>
                                ))}
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
                        entryFee={ENTRY_FEE}
                    />
                </div>
            </div>
        );
    }

    // ─── WATCHING / HOSTING VIEW (matching reference UI exactly) ─────────
    const creatorName = hostProfile?.full_name || hostProfile?.handle || "Creator";
    const sessionTitle = activeSessions.find(s => s.id === roomId)?.title || "";

    return (
        <div className="relative min-h-screen overflow-hidden" style={{ fontFamily: "'Montserrat', sans-serif", color: C.fg, background: C.bg }}>
            <style>{`
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
            `}</style>

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
            <div className="relative z-20 min-h-screen p-4 lg:p-6">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto">
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

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr_350px] gap-4 lg:gap-6 lg:h-[calc(100vh-6rem)]">

                    {/* ─── LEFT: Drink Menu ─── */}
                    <div className="order-2 lg:order-1 overflow-y-auto bl-chat-scroll" style={{ ...glassPanel, padding: "16px", display: "flex", flexDirection: "column" }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Wine className="w-5 h-3 bl-glow-pulse" style={{ color: C.neonPurple }} />
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 700, color: C.gold, ...glowTextGold }}>Buy a Drink</h2>
                        </div>
                        <p style={{ color: C.muted, fontSize: "14px", marginBottom: "8px" }}>for {creatorName}</p>

                        <div style={{ borderTop: `1px solid ${C.borderStrong}`, paddingTop: "8px" }}>
                            <h3 style={{ fontSize: "12px", fontWeight: 600, color: C.muted, marginBottom: "8px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Drink Menu</h3>
                            <div className="space-y-0">
                                {drinks.map((drink: any) => (
                                    <div key={drink.id || drink.name} style={drinkItemStyle} onClick={() => confirmPurchase("drink", drink.name, drink.price, { special: drink.special })}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "hsla(280,60%,45%,0.2)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 10px hsla(280,100%,70%,0.2)"; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = C.glassBgStrong; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                                        <div className="flex items-center gap-2">
                                            <span style={{ fontSize: "18px" }}>{drink.icon}</span>
                                            <span style={{ color: C.fg, fontWeight: 500, fontSize: "14px" }}>{drink.name}</span>
                                        </div>
                                        <span style={{ color: C.gold, fontWeight: 600 }}>${drink.price}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* VIP Section */}
                        <div style={{ borderTop: `1px solid ${C.borderStrong}`, paddingTop: "12px", marginTop: "12px" }}>
                            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: 700, color: C.fg, textAlign: "center", marginBottom: "8px" }}>VIP Lounge</h3>
                            <div style={{ ...glassPanel, ...glowGold, padding: "12px" }}>
                                <div className="flex items-center gap-2" style={{ cursor: "pointer" }} onClick={() => confirmPurchase("vip", `VIP Upgrade`, vipPrice)}>
                                    <Crown className="w-5 h-5 bl-glow-pulse" style={{ color: C.gold }} />
                                    <span style={{ fontWeight: 700, color: C.gold, ...glowTextGold }}>Upgrade to VIP - ${vipPrice}</span>
                                </div>
                                <ul style={{ fontSize: "14px", color: C.muted, marginLeft: "28px", marginTop: "4px" }}>
                                    <li className="flex items-center gap-1"><Sparkles className="w-3 h-3" style={{ color: C.neonPink }} /> Exclusive Content</li>
                                </ul>
                            </div>
                            <div className="mt-2" style={{ ...glassPanel, padding: "12px", cursor: "pointer" }} onClick={() => confirmPurchase("booth", "Booth Reservation", 300)}>
                                <div className="flex items-center gap-2">
                                    <span style={{ fontSize: "18px" }}>🛋️</span>
                                    <div>
                                        <span style={{ fontWeight: 700, color: C.fg, fontSize: "14px" }}>Reserve a Booth</span>
                                        <span style={{ color: C.gold, fontWeight: 700, marginLeft: "8px" }}>$300</span>
                                        <p style={{ fontSize: "12px", color: C.muted }}>🎉 Private (5 mins)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── CENTER: Stream + Tips + Spin ─── */}
                    <div className="order-1 lg:order-2 flex flex-col overflow-y-auto bl-chat-scroll">
                        {/* Stream */}
                        <div className="relative" style={{ ...glassPanel, ...glowPurple, overflow: "hidden", borderRadius: "0.75rem" }}>
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
                        <div className="mt-0" style={{ border: `1px solid ${C.borderLight}`, borderRadius: "0.75rem", padding: "24px 64px", paddingTop: "0" }}>
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
                                    <span style={{ color: C.gold }}>$</span>
                                    <input type="number" placeholder="Custom Amount" value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} className="bg-transparent outline-none flex-1 text-sm" style={{ color: C.fg, fontFamily: "'Montserrat', sans-serif" }} />
                                </div>
                                <button style={{ ...btnGoldStyle, padding: "8px 16px", flex: 1, fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }} onClick={handleCustomTip}>
                                    <DollarSign className="w-4 h-4" /> SEND TIP
                                </button>
                            </div>
                        </div>

                        {/* Spin the Bottle */}
                        <div className="mt-4" style={{ ...glassPanel, padding: "24px", borderRadius: "0.75rem" }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-5 h-5" style={{ color: C.gold }} />
                                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: C.gold, ...glowTextGold }}>Spin the Bottle</h2>
                                </div>
                                <div style={{ padding: "4px 12px", borderRadius: "9999px", background: `${C.gold}1a`, border: `1px solid ${C.gold}33`, color: C.gold, fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>${SPIN_PRICE} PER SPIN</div>
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
                    <div className="order-3" style={{ ...glassPanel, padding: "16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div className="flex items-center justify-between mb-3">
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
                                        <span style={{ fontWeight: 700, fontSize: "14px", color: C.fg }}>{msg.handle || "Anonymous"}</span>
                                        {msg.handle && msg.handle.includes("VIP") && <Crown className="w-3 h-3 inline ml-1 mb-0.5" style={{ color: C.gold }} />}
                                        <span style={{ fontSize: "14px", color: C.muted, marginLeft: "4px" }}>{msg.content}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Pin name */}
                        <div style={{ ...chatMsgStyle, ...glowPink, display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }} onClick={() => confirmPurchase("pin", "Pin Name to Top", 25)}>
                            <span style={{ fontSize: "18px" }}>🔥</span>
                            <span className="bl-neon-flicker" style={{ fontSize: "14px", fontWeight: 700, color: C.neonPink }}>PIN NAME TO TOP 10 mins</span>
                            <span style={{ color: C.gold, fontWeight: 700, marginLeft: "auto" }}>+$25</span>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Send a message..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                                style={{ background: "hsla(270,30%,18%,0.3)", border: `1px solid ${C.borderStrong}`, color: C.fg, fontFamily: "'Montserrat', sans-serif" }}
                            />
                            <button onClick={handleSendChat} style={{ ...btnGlowStyle, padding: "8px 16px", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
                                SEND
                            </button>
                        </div>
                    </div>
                </div>
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

        </div>
    );
}
