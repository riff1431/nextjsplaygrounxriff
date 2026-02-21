"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useBarChat } from "@/hooks/useBarChat";
import { useAuth } from "@/app/context/AuthContext";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Video, Send, Zap, Star, Sparkles, MessageCircle, Crown,
    Search, Bell, LogOut, User as UserIcon, CreditCard, Users, Settings, Heart,
    Link as LinkIcon, Loader2, Play, DollarSign, Wine, Home
} from "lucide-react";
import Link from "next/link";

import DrinkMenu from "@/components/rooms/bar-lounge/DrinkMenu";
import LoungeChat from "@/components/rooms/bar-lounge/LoungeChat";
import TipsSection from "@/components/rooms/bar-lounge/TipsSection";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const supabase = createClient();

export function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

type Room = {
    id: string;
    title: string | null;
    status: string;
    host_id: string;
    created_at: string;
    profiles?: {
        handle?: string;
        avatar_url?: string;
        full_name?: string;
    };
};

export default function BarLoungeRoom() {
    const onBack = () => window.history.back();
    const ENTRY_FEE = 10;

    const { user, role, isLoading: authLoading } = useAuth();
    const [viewState, setViewState] = useState<"lobby" | "watching" | "hosting">("lobby");
    const [activeSessions, setActiveSessions] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mySession, setMySession] = useState<Room | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const { messages, sendMessage } = useBarChat(roomId);
    const [hostId, setHostId] = useState<string | null>(null);
    const [hostProfile, setHostProfile] = useState<any>(null);
    const [billingActive, setBillingActive] = useState(false);
    const [spentHidden, setSpentHidden] = useState(32);

    const chatEndRef = useRef<HTMLDivElement>(null);

    const [drinks, setDrinks] = useState<any[]>([]);
    const [spinOutcomes, setSpinOutcomes] = useState<any[]>([]);
    const [vipPrice, setVipPrice] = useState(150);
    const [ultraVipPrice, setUltraVipPrice] = useState(400);

    const SPIN_PRICE = 25;
    const [spinning, setSpinning] = useState(false);
    const [spinResult, setSpinResult] = useState<any | null>(null);

    useEffect(() => {
        if (authLoading) return;
        let isMounted = true;
        let roomChannel: any = null;

        const init = async () => {
            try {
                if (user && role === "creator") {
                    const { data: myRoom } = await supabase
                        .from("rooms")
                        .select("*")
                        .eq("host_id", user.id)
                        .eq("status", "live")
                        .eq("type", "bar-lounge")
                        .single();
                    if (isMounted && myRoom) setMySession(myRoom);
                }

                const fetchSessions = async () => {
                    let { data: sessions, error } = await supabase
                        .from("rooms")
                        .select("id, title, status, host_id, created_at, profiles:host_id(handle, avatar_url, full_name, id)")
                        .eq("status", "live")
                        .eq("type", "bar-lounge")
                        .order("created_at", { ascending: false });

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
                if (isMounted) {
                    roomChannel = supabase.channel('public:rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'type=eq.bar-lounge' }, fetchSessions).subscribe();
                }

                const { data: config } = await supabase.from("admin_bar_config").select("*").eq("id", 1).single();
                if (isMounted) {
                    if (config) {
                        if (config.menu_items) setDrinks(config.menu_items);
                        if (config.spin_odds) setSpinOutcomes(config.spin_odds);
                        if (config.vip_price) setVipPrice(config.vip_price);
                        if (config.ultra_vip_price) setUltraVipPrice(config.ultra_vip_price);
                    } else {
                        setDrinks([
                            { id: "d1", name: "Whiskey Shot", price: 8, icon: "🥃", tone: "red" },
                            { id: "d2", name: "Neon Martini", price: 25, icon: "🍸", tone: "pink" },
                            { id: "d3", name: "Blue Lagoon", "price": 25, icon: "🧊", tone: "blue" },
                            { id: "d4", name: "Champagne Bottle", price: 100, icon: "🍾", tone: "yellow", special: "champagne" },
                            { id: "d5", name: "VIP Bottle", price: 250, icon: "👑", tone: "purple", special: "vipbottle" },
                        ]);
                    }
                }
            } catch (error) { console.error(error); } finally { if (isMounted) setIsLoading(false); }
        };
        init();
        return () => { isMounted = false; if (roomChannel) supabase.removeChannel(roomChannel); };
    }, [user, role, authLoading]);

    const joinSession = (room: Room) => {
        setRoomId(room.id);
        setHostId(room.host_id);
        setHostProfile(room.profiles);
        setViewState("watching");
    };

    const startHosting = async () => {
        if (!user || role !== 'creator') return;
        setIsLoading(true);
        if (mySession) {
            setRoomId(mySession.id);
            setHostId(user.id);
            setViewState("hosting");
            setIsLoading(false);
            return;
        }
        const { data } = await supabase.from("rooms").insert({ host_id: user.id, title: `${user.user_metadata?.full_name || user.email?.split('@')[0]}'s Lounge`, status: "live", type: "bar-lounge" }).select().single();
        if (data) { setMySession(data); setRoomId(data.id); setHostId(user.id); setViewState("hosting"); }
        setIsLoading(false);
    };

    const endHosting = async () => {
        if (!confirm("End session?") || !roomId) return;
        const { error } = await supabase.from("rooms").update({ status: "ended" }).eq("id", roomId);
        if (!error) { setMySession(null); setRoomId(null); setHostId(null); setViewState("lobby"); }
    };

    useEffect(() => {
        if (!roomId || viewState !== 'watching') return;
        supabase.rpc('increment_viewer_count', { p_room_id: roomId, p_amount: 1 });
        return () => { supabase.rpc('increment_viewer_count', { p_room_id: roomId, p_amount: -1 }); };
    }, [roomId, viewState]);

    const activateBilling = () => { if (!billingActive && viewState === 'watching') setBillingActive(true); };

    type FX = { id: string; kind: "confetti" | "spotlight"; createdAt: number };
    const [fx, setFx] = useState<FX[]>([]);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (!roomId || (viewState !== "watching" && viewState !== "hosting")) return;
        const channel = supabase.channel("bar_lounge_events_" + roomId)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "revenue_events", filter: `room_key=eq.${roomId}` }, (payload) => {
                const meta = payload.new.metadata || {};
                if (meta.special === "champagne") onChampagneEffect("champagne");
                else if (meta.special === "vipbottle") onChampagneEffect("vipbottle");
                else if (meta.type === 'spin') {
                    const out = meta.outcome;
                    if (out) {
                        if (out.id === "o2" || out.id === "o1") pushFx(["spotlight"], `🎰 ${out.label}`);
                        else if (out.id === "o5") pushFx(["confetti"], `🎰 ${out.label}`);
                        else pushFx([], `🎰 ${out.label}`);
                    }
                } else if (meta.type === 'vip') pushFx(["spotlight"], `👑 ${meta.label} unlocked`);
                else pushFx([], `${meta.label} served`);
            }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, viewState]);

    const pushFx = (kinds: Array<FX["kind"]>, toastMsg?: string) => {
        const now = Date.now();
        const items: FX[] = kinds.map((k) => ({ id: `${k}_${now}_${Math.random().toString(16).slice(2)}`, kind: k, createdAt: now }));
        setFx((rows) => [...rows, ...items]);
        if (toastMsg) setToast(toastMsg);
        window.setTimeout(() => {
            setFx((rows) => rows.filter((x) => now - x.createdAt < 1800));
            setToast((t) => (t === toastMsg ? null : t));
        }, 1600);
    };

    const playPop = () => {
        try {
            const AC = (window.AudioContext || (window as any).webkitAudioContext) as any;
            if (!AC) return;
            const ctx = new AC();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.setValueAtTime(520, ctx.currentTime);
            o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.11);
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
            o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.15);
            window.setTimeout(() => ctx.close?.(), 240);
        } catch { }
    };

    const onChampagneEffect = (tier: "champagne" | "vipbottle") => {
        playPop();
        if (tier === "champagne") pushFx(["confetti", "spotlight"], "🍾 Champagne popped");
        if (tier === "vipbottle") pushFx(["confetti", "spotlight"], "👑 VIP bottle served");
    };

    const handlePurchase = async (type: string, label: string, price: number, meta: any = {}) => {
        if (!roomId) return;
        activateBilling();
        const { error } = await supabase.rpc("purchase_bar_item", { p_room_id: roomId, p_item_type: type, p_item_label: label, p_amount: price, p_metadata: meta });
        if (error) pushFx([], `Purchase failed: ${error.message || "Insufficient funds"}`);
    };

    const doSpin = async () => {
        if (spinning || !roomId) return;
        setSpinning(true);
        activateBilling();
        setSpentHidden((s) => s + SPIN_PRICE);
        const { data, error } = await supabase.rpc("spin_bottle_game", { p_room_id: roomId, p_amount: SPIN_PRICE });
        if (data && data.success) {
            setSpinResult(data.outcome);
            setTimeout(() => setSpinning(false), 1100);
        } else {
            setSpinning(false);
            if (error) pushFx([], `Spin failed: ${error.message || "Insufficient funds"}`);
        }
    };

    if (isLoading || authLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>;

    if (viewState === "lobby") {
        return (
            <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen bg-black text-white">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">Bar Lounge</h1>
                        <p className="text-gray-400 mt-2">Join a live chill session. Vibes only.</p>
                    </div>
                    {user && role === 'creator' && (
                        <div className="flex gap-4">
                            <Link href="/home" className="px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white">
                                <Home className="w-4 h-4" /> Go Back to Home
                            </Link>
                            <button onClick={startHosting} className={cx("px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2", mySession ? "bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse" : "bg-violet-600 shadow-[0_0_20px_rgba(139,92,246,0.4)]")}>
                                <Video className="w-4 h-4" /> {mySession ? "Resume Session" : "Start Lounge"}
                            </button>
                        </div>
                    )}
                    {(!user || role !== 'creator') && (
                        <Link href="/home" className="px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white">
                            <Home className="w-4 h-4" /> Go Back to Home
                        </Link>
                    )}
                </div>
                {activeSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-white/5 rounded-3xl bg-white/5">
                        <Video className="w-12 h-12 text-gray-600 mb-4" />
                        <h3 className="text-xl font-medium text-gray-300">No active sessions</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeSessions.map((session: any) => (
                            <div key={session.id} className="group relative rounded-3xl overflow-hidden border border-white/10 bg-gray-900 cursor-pointer hover:border-violet-500/50 transition-all" onClick={() => joinSession(session)}>
                                <div className="h-48 relative overflow-hidden bg-gray-950">
                                    {session.profiles?.avatar_url ? <img src={session.profiles.avatar_url} className="w-full h-full object-cover blur-sm opacity-50" /> : <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-black" />}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"><Play className="w-12 h-12 text-white animate-pulse" fill="currentColor" /></div>
                                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold uppercase flex items-center gap-1"><div className="w-2 h-2 bg-white rounded-full animate-pulse" />Live</div>
                                </div>
                                <div className="p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden shrink-0 border-2 border-violet-500/30">
                                        {session.profiles?.avatar_url ? <img src={session.profiles.avatar_url} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 m-3" />}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-bold text-white truncate">{session.title || "Untitled Session"}</h3>
                                        <p className="text-sm text-gray-400">Hosted by {session.profiles?.full_name || "Creator"}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden fd-bar-lounge-theme-v2">
            <style>{`
                @keyframes blBottleSpin { 0% { transform: rotate(0deg) scale(1); } 60% { transform: rotate(720deg) scale(1.04); } 100% { transform: rotate(1080deg) scale(1); } }
                @keyframes blSpotlight { 0% { opacity: 0; } 10% { opacity: 1; } 70% { opacity: 0.85; } 100% { opacity: 0; } }
                @keyframes blConfettiFall { 0% { transform: translateY(-10px) rotate(0deg); } 100% { transform: translateY(110vh) rotate(540deg); } }
                .bl-bottle { font-size: 68px; line-height: 1; filter: saturate(1.8) contrast(1.15); text-shadow: 0 0 18px rgba(244,182,37,0.55), 0 0 42px rgba(244,182,37,0.25); transform: translateZ(0); }
                .bl-bottle-spin { animation: blBottleSpin 1.1s cubic-bezier(.18,.9,.2,1) both; }
                .bl-spotlight { background: radial-gradient(circle at 50% 40%, rgba(244,182,37,0.24), transparent 55%), radial-gradient(circle at 60% 52%, rgba(210,9,250,0.18), transparent 62%), radial-gradient(circle at 42% 48%, rgba(0,230,255,0.14), transparent 60%); animation: blSpotlight 1.6s ease-out both; mix-blend-mode: screen; }
                .bl-confetti { position: absolute; width: 10px; height: 12px; border-radius: 3px; background: rgba(244,182,37,0.9); box-shadow: 0 0 14px rgba(244,182,37,0.55); animation-name: blConfettiFall; animation-timing-function: ease-in; animation-fill-mode: both; }
                .chat-scroll::-webkit-scrollbar { width: 4px; }
                .chat-scroll::-webkit-scrollbar-track { background: transparent; }
                .chat-scroll::-webkit-scrollbar-thumb { background: rgba(244,182,37,0.2); border-radius: 10px; }
                .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(244,182,37,0.4); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            <div className="fixed inset-0 z-0" style={{ backgroundImage: "url(/rooms/bar-lounge/lounge-bg-v2.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="fixed inset-0 z-0 bg-black/60" />

            <div className="relative z-20 max-w-[1500px] mx-auto px-4 lg:px-6 py-6 h-full min-h-screen flex flex-col">
                {(fx.length > 0 || toast) && (
                    <div className="fixed inset-0 pointer-events-none z-[60]">
                        {fx.some((x) => x.kind === "spotlight") && <div className="absolute inset-0 bl-spotlight" />}
                        {fx.some((x) => x.kind === "confetti") && (
                            <div className="absolute inset-0 overflow-hidden">
                                {Array.from({ length: 42 }).map((_, i) => (
                                    <span key={i} className="bl-confetti" style={{ left: `${Math.random() * 100}%`, top: `-12px`, animationDelay: `${Math.random() * 0.35}s`, animationDuration: `${1.1 + Math.random() * 0.6}s`, opacity: 0.9, transform: `translateY(0) rotate(${Math.random() * 360}deg)` }} />
                                ))}
                            </div>
                        )}
                        {toast && <div className="absolute top-10 left-1/2 -translate-x-1/2 rounded-full border border-gold/40 bg-black/90 px-8 py-4 text-sm text-gold font-bold shadow-[0_0_40px_rgba(244,182,37,0.3)] z-[70] transition-all animate-in fade-in slide-in-from-top-4 uppercase tracking-widest">{toast}</div>}
                    </div>
                )}

                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        {viewState === 'hosting' ? (
                            <button onClick={endHosting} className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-2 text-xs font-bold text-red-200 hover:bg-red-950/60 transition-all flex items-center gap-2">
                                <LogOut className="w-4 h-4" /> End Session
                            </button>
                        ) : (
                            <button onClick={() => setViewState("lobby")} className="rounded-xl border border-gold/20 bg-white/5 backdrop-blur-md px-4 py-2 text-xs font-bold text-gold/80 hover:bg-white/10 flex items-center gap-2 transition-all">
                                <ArrowLeft className="w-4 h-4" /> Exit Lounge
                            </button>
                        )}
                        <div>
                            <div className="text-gold font-title text-xl font-bold tracking-wider drop-shadow-lg">Bar Lounge</div>
                            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest drop-shadow-md">
                                {viewState === 'hosting' ? "Host Mode Active" : (activeSessions.find(s => s.id === roomId)?.title || "Premium Nightclub Experience")}
                            </div>
                        </div>
                    </div>
                </div>

                {viewState === 'watching' ? (
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_350px] gap-6 overflow-hidden">
                        <div className="order-2 lg:order-1 flex flex-col min-h-0">
                            <DrinkMenu drinks={drinks} creatorName={hostProfile?.full_name || "Creator"} vipPrice={vipPrice} ultraVipPrice={ultraVipPrice} onPurchaseDrink={(name, price, fx) => { handlePurchase("drink", name, price, fx); setSpentHidden(s => s + price); }} onPurchaseVip={(n, p) => { handlePurchase("vip", n, p); setSpentHidden(s => s + p); }} onReserveBooth={(p) => { handlePurchase("booth", "Booth", p); setSpentHidden(s => s + p); }} />
                        </div>
                        <div className="order-1 lg:order-2 flex flex-col gap-6 min-w-0 overflow-y-auto no-scrollbar">
                            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 aspect-video relative shadow-2xl">
                                {roomId && <LiveStreamWrapper role="fan" appId={APP_ID} roomId={roomId} uid={user?.id || 0} hostId={hostId || ""} hostAvatarUrl={hostProfile?.avatar_url || ""} hostName={hostProfile?.full_name || "Creator"} />}
                            </div>
                            <TipsSection onSendTip={(amt) => { handlePurchase("tip", "Tip", amt); setSpentHidden(s => s + amt); }} />
                            <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-gold" /><h2 className="font-title text-2xl font-bold text-gold tracking-wide">Spin the Bottle</h2></div>
                                    <div className="px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-black uppercase tracking-tighter">${SPIN_PRICE} PER SPIN</div>
                                </div>
                                <div className="rounded-2xl bg-black/40 border border-white/5 p-8 flex items-center justify-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className={cx("bl-bottle relative z-10 transition-transform", spinning && "bl-bottle-spin")}>🥂</div>
                                    {spinResult && !spinning && <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"><div className="text-center p-6"><div className="text-xl text-gold font-title font-bold mb-2 uppercase tracking-widest">{spinResult.label}</div><div className="text-sm text-white/70 italic">"{spinResult.note}"</div></div></div>}
                                </div>
                                <button className={cx("mt-6 w-full btn-gold py-4 rounded-xl text-lg font-black tracking-widest flex items-center justify-center gap-3 transition-all", spinning && "opacity-80 cursor-not-allowed")} onClick={doSpin} disabled={spinning}>
                                    {spinning ? <><Loader2 className="w-6 h-6 animate-spin" /> SPINNING...</> : <>TRY YOUR LUCK <Zap className="w-5 h-5 fill-current" /></>}
                                </button>
                            </div>
                        </div>
                        <div className="order-3 flex flex-col min-h-0">
                            <LoungeChat messages={messages as any} onSendMessage={(text) => { if (text.trim()) { sendMessage(text, user?.id, user?.user_metadata?.full_name || "Guest"); if (!billingActive) activateBilling(); } }} />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 space-y-4">
                            <div className="rounded-2xl overflow-hidden border border-gold/20 bg-black/60 aspect-video relative shadow-2xl">
                                {roomId && <LiveStreamWrapper role="host" appId={APP_ID} roomId={roomId} uid={user?.id || 0} hostId={user?.id || ""} hostAvatarUrl={user?.user_metadata?.avatar_url || ""} hostName={user?.user_metadata?.full_name || "You"} />}
                            </div>
                        </div>
                        <div className="lg:col-span-4 flex flex-col min-h-0">
                            <LoungeChat messages={messages as any} onSendMessage={(text) => { if (text.trim()) sendMessage(text, user?.id, user?.user_metadata?.full_name || "You"); }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
