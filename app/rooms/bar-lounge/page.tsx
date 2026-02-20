"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useBarChat } from "@/hooks/useBarChat";
import { useAuth } from "@/app/context/AuthContext"; // Integrated Auth Context
import dynamic from "next/dynamic";
import {
    ArrowLeft, Video, Send, Zap, Star, Sparkles, MessageCircle, Crown,
    Search, Bell, LogOut, User as UserIcon, CreditCard, Users, Settings, Heart,
    Link as LinkIcon, Loader2, Play
} from "lucide-react";

import DrinkMenu from "@/components/rooms/bar-lounge/DrinkMenu";
import LoungeChat from "@/components/rooms/bar-lounge/LoungeChat";
import TipsSection from "@/components/rooms/bar-lounge/TipsSection";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const supabase = createClient();

// --- Shared Components ---

export function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-violet-500/25 bg-black",
                "shadow-[0_0_22px_rgba(167,139,250,0.14),0_0_52px_rgba(139,92,246,0.08)]",
                "hover:shadow-[0_0_34px_rgba(167,139,250,0.20),0_0_78px_rgba(139,92,246,0.12)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

export const toneClasses = (tone: "pink" | "purple" | "blue" | "green" | "yellow" | "red") => {
    const map = {
        pink: { border: "border-pink-500/30", text: "text-pink-200", glow: "shadow-[0_0_15px_rgba(236,72,153,0.15)]" },
        purple: { border: "border-purple-500/30", text: "text-purple-200", glow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]" },
        blue: { border: "border-cyan-400/30", text: "text-cyan-200", glow: "shadow-[0_0_15px_rgba(34,211,238,0.15)]" },
        green: { border: "border-emerald-400/30", text: "text-emerald-200", glow: "shadow-[0_0_15px_rgba(52,211,153,0.15)]" },
        yellow: { border: "border-yellow-400/30", text: "text-yellow-200", glow: "shadow-[0_0_15px_rgba(250,204,21,0.15)]" },
        red: { border: "border-red-500/30", text: "text-red-200", glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]" },
    };
    return map[tone] || map.pink;
};

// --- Types ---
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

    // Auth Context
    const { user, role, isLoading: authLoading } = useAuth();

    // State
    const [viewState, setViewState] = useState<"lobby" | "watching" | "hosting">("lobby");
    const [activeSessions, setActiveSessions] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // My Session State
    const [mySession, setMySession] = useState<Room | null>(null);

    // Selected Room State
    const [roomId, setRoomId] = useState<string | null>(null);
    const { messages, sendMessage } = useBarChat(roomId);
    const [hostId, setHostId] = useState<string | null>(null);
    const [hostProfile, setHostProfile] = useState<any>(null);
    const [billingActive, setBillingActive] = useState(false);
    const [spentHidden, setSpentHidden] = useState(32);
    const [chat, setChat] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Config
    const [drinks, setDrinks] = useState<any[]>([]);
    const [spinOutcomes, setSpinOutcomes] = useState<any[]>([]);
    const [vipPrice, setVipPrice] = useState(150);
    const [ultraVipPrice, setUltraVipPrice] = useState(400);

    // Init Logic
    useEffect(() => {
        if (authLoading) return;

        let isMounted = true;
        let roomChannel: any = null;

        const init = async () => {
            try {
                // 1. If I am a creator, check if I have an active session
                if (user && role === "creator") {
                    const { data: myRoom } = await supabase
                        .from("rooms")
                        .select("*")
                        .eq("host_id", user.id)
                        .eq("status", "live")
                        .eq("type", "bar-lounge")
                        .single();

                    if (isMounted && myRoom) {
                        setMySession(myRoom);
                    }
                }

                // 2. Fetch ALL active sessions (for Lobby)
                const fetchSessions = async () => {
                    try {
                        // Try optimized join first
                        let { data: sessions, error } = await supabase
                            .from("rooms")
                            .select(`
                                id, title, status, host_id, created_at,
                                profiles:host_id ( handle, avatar_url, full_name, id )
                            `)
                            .eq("status", "live")
                            .eq("type", "bar-lounge")
                            .order("created_at", { ascending: false });

                        // Fallback if join fails (e.g. FK missing)
                        if (error || !sessions) {
                            console.warn("Join failed, trying fallback fetch...", error);
                            const { data: rawRooms } = await supabase
                                .from("rooms")
                                .select("*")
                                .eq("status", "live")
                                .eq("type", "bar-lounge");

                            if (rawRooms && rawRooms.length > 0) {
                                const hostIds = Array.from(new Set(rawRooms.map((r: any) => r.host_id)));
                                const { data: profiles } = await supabase.from("profiles").select("*").in("id", hostIds);

                                sessions = rawRooms.map((r: any) => ({
                                    ...r,
                                    profiles: profiles?.find((p: any) => p.id === r.host_id) || null
                                }));
                            }
                        }

                        if (isMounted && sessions) {
                            // @ts-ignore
                            setActiveSessions(sessions);
                        }
                    } catch (err) {
                        console.error("Error in fetchSessions:", err);
                    }
                };

                await fetchSessions();

                // Realtime subscription for Lobby
                if (isMounted) {
                    roomChannel = supabase.channel('public:rooms')
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'type=eq.bar-lounge' }, () => {
                            fetchSessions();
                        })
                        .subscribe();
                }

                // 3. Fetch Config
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

            } catch (error) {
                console.error("BarLounge init error:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        init();

        return () => {
            isMounted = false;
            if (roomChannel) supabase.removeChannel(roomChannel);
        };
    }, [user, role, authLoading]);

    const joinSession = (room: Room) => {
        setRoomId(room.id);
        setHostId(room.host_id);
        // @ts-ignore
        setHostProfile(room.profiles);
        setViewState("watching");
    };

    const startHosting = async () => {
        if (!user || role !== 'creator') {
            alert("Only creators can start a session.");
            return;
        }
        setIsLoading(true);

        // Resume existing or create new?
        if (mySession) {
            setRoomId(mySession.id);
            setHostId(user.id);
            setViewState("hosting");
            setIsLoading(false);
            return;
        }

        // Create new room
        const { data, error } = await supabase
            .from("rooms")
            .insert({
                host_id: user.id,
                title: `${user.user_metadata?.full_name || user.email?.split('@')[0]}'s Lounge`,
                status: "live",
                type: "bar-lounge"
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to start session:", error);
            alert("Failed to start session. Please try again.");
            setIsLoading(false);
            return;
        }

        if (data) {
            setMySession(data);
            setRoomId(data.id);
            setHostId(user.id);
            setViewState("hosting");
        }
        setIsLoading(false);
    };

    const endHosting = async () => {
        if (!confirm("Are you sure you want to end your Bar Lounge session?")) return;
        if (!roomId) return;

        const { error } = await supabase
            .from("rooms")
            .update({ status: "ended" })
            .eq("id", roomId);

        if (!error) {
            setMySession(null);
            setRoomId(null);
            setHostId(null);
            setViewState("lobby");
        }
    };

    // --- Watching/Hosting View Logic ---
    useEffect(() => {
        if (!roomId || viewState !== 'watching') return;

        // Increment viewer count on join
        supabase.rpc('increment_viewer_count', { p_room_id: roomId, p_amount: 1 }).then(({ error }) => {
            if (error) console.warn("Error incrementing view count:", error.message);
        });

        return () => {
            // Decrement on leave
            supabase.rpc('increment_viewer_count', { p_room_id: roomId, p_amount: -1 }).then(({ error }) => {
                if (error) console.warn("Error decrementing view count:", error.message);
            });
        };
    }, [roomId, viewState]);

    const activateBilling = () => { if (!billingActive && viewState === 'watching') setBillingActive(true); };

    // Effects for champagne/VIP
    type FX = { id: string; kind: "confetti" | "spotlight"; createdAt: number };
    const [fx, setFx] = useState<FX[]>([]);
    const [toast, setToast] = useState<string | null>(null);

    // Listen to revenue events (for both Host and Fan)
    useEffect(() => {
        if (!roomId || (viewState !== "watching" && viewState !== "hosting")) return;

        const channel = supabase.channel("bar_lounge_events_" + roomId)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "revenue_events", filter: `room_key=eq.${roomId}` }, (payload) => {
                const meta = payload.new.metadata || {};
                const itemType = meta.type;
                const itemLabel = meta.label;

                // Trigger effects based on item type/special
                if (meta.special === "champagne") onChampagneEffect("champagne");
                else if (meta.special === "vipbottle") onChampagneEffect("vipbottle");
                else if (itemType === 'spin') {
                    // Spin outcome effect
                    const out = meta.outcome;
                    if (out) {
                        if (out.id === "o2" || out.id === "o1") pushFx(["spotlight"], `🎰 ${out.label}`);
                        else if (out.id === "o5") pushFx(["confetti"], `🎰 ${out.label}`);
                        else pushFx([], `🎰 ${out.label}`);
                    }
                } else if (itemType === 'vip') {
                    pushFx(["spotlight"], `👑 ${itemLabel} unlocked`);
                } else {
                    // Regular drink
                    pushFx([], `${itemLabel} served`);
                }
            })
            .subscribe();

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
            if (typeof window === "undefined") return;
            const AC = (window.AudioContext || (window as any).webkitAudioContext) as any;
            if (!AC) return;
            const ctx = new AC();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(520, ctx.currentTime);
            o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.11);
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
            o.connect(g);
            g.connect(ctx.destination);
            o.start();
            o.stop(ctx.currentTime + 0.15);
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
        const { error } = await supabase.rpc("purchase_bar_item", {
            p_room_id: roomId, p_item_type: type, p_item_label: label, p_amount: price, p_metadata: meta
        });
        if (error) {
            pushFx([], `Purchase failed: ${error.message || "Insufficient funds"}`);
        }
    };

    // Spin Logic
    const [spinning, setSpinning] = useState(false);
    const [spinResult, setSpinResult] = useState<any | null>(null);
    const SPIN_PRICE = 25;

    const doSpin = async () => {
        if (spinning || !roomId) return;
        setSpinning(true);
        activateBilling();
        setSpentHidden((s) => s + SPIN_PRICE);
        const { data, error } = await supabase.rpc("spin_bottle_game", { p_room_id: roomId, p_amount: SPIN_PRICE });
        if (data && data.success) {
            setSpinResult(data.outcome);
            setTimeout(() => setSpinning(false), 1100);
            // Effect handled by subscription
        } else {
            setSpinning(false);
            if (error) {
                pushFx([], `Spin failed: ${error.message || "Insufficient funds"}`);
            }
        }
    };

    const endSessionById = async (sid: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("End this session?")) return;
        await supabase.from("rooms").update({ status: "ended" }).eq("id", sid);
        // Realtime will update list
    };

    // --- Render: Lobby ---

    if (isLoading || authLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    if (viewState === "lobby") {
        return (
            <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen bg-black text-white">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                            Bar Lounge
                        </h1>
                        <p className="text-gray-400 mt-2">Join a live chill session. Vibes only.</p>
                    </div>
                    {/* Host Actions - ONLY IF CREATOR */}
                    {user && role === 'creator' && (
                        <div className="flex gap-4">
                            {mySession ? (
                                <button
                                    onClick={startHosting}
                                    className="px-6 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse hover:scale-105 transition-transform"
                                >
                                    Resume Session
                                </button>
                            ) : (
                                <button
                                    onClick={startHosting}
                                    className="px-6 py-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-105 transition-transform flex items-center gap-2"
                                >
                                    <Video className="w-4 h-4" /> Start Lounge
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {activeSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-white/5 rounded-3xl bg-white/5">
                        <Video className="w-12 h-12 text-gray-600 mb-4" />
                        <h3 className="text-xl font-medium text-gray-300">No active sessions</h3>
                        <p className="text-gray-500 mt-2">Check back later for live bar streams.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeSessions.map((session: any) => (
                            <div
                                key={session.id}
                                className="group relative rounded-3xl overflow-hidden border border-white/10 bg-gray-900 cursor-pointer hover:border-violet-500/50 transition-all duration-300 transform hover:-translate-y-1"
                                onClick={() => joinSession(session)}
                            >
                                {/* Thumbnail / Cover (Modern Avatar Blur) */}
                                <div className="h-48 relative overflow-hidden bg-gray-950">
                                    {session.profiles?.avatar_url ? (
                                        <>
                                            <div
                                                className="absolute inset-0 bg-cover bg-center blur-xl opacity-50 scale-125 transition-transform duration-700 group-hover:scale-150"
                                                style={{ backgroundImage: `url(${session.profiles.avatar_url})` }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
                                            {/* Subtle vignette/shadow inner ring */}
                                            <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] pointer-events-none" />
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-black" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-10">
                                        <Play className="w-12 h-12 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] animate-pulse" fill="currentColor" />
                                    </div>
                                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold uppercase tracking-wide flex items-center gap-1 z-10 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                                        Live
                                    </div>
                                    <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-1 backdrop-blur-md z-10 border border-white/10">
                                        <Users className="w-3 h-3 text-violet-300" />
                                        <span className="font-semibold">{session.viewer_count || 0}</span>
                                    </div>
                                    {/* Cleanup Button for Host */}
                                    {user && session.host_id === user.id && (
                                        <div className="absolute bottom-4 right-4 z-20">
                                            <button
                                                onClick={(e) => endSessionById(session.id, e)}
                                                className="px-3 py-1 rounded-lg bg-red-600/80 text-white text-xs hover:bg-red-700 backdrop-blur-md border border-red-500/50 shadow-lg"
                                            >
                                                End Session
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden border-2 border-violet-500/30">
                                            {session.profiles?.avatar_url ? (
                                                <img src={session.profiles.avatar_url} alt="Host" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-violet-800 text-white font-bold">
                                                    {session.profiles?.full_name?.[0] || session.profiles?.handle?.[0] || <UserIcon className="w-6 h-6" />}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                                                {session.title || "Untitled Session"}
                                            </h3>
                                            <p className="text-sm text-gray-400 truncate">
                                                Hosted by {session.profiles?.full_name || session.profiles?.handle || "Creator"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- Render: Watching / Hosting ---

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            <style>{`
                @keyframes blBottleSpin { 0% { transform: rotate(0deg) scale(1); } 60% { transform: rotate(720deg) scale(1.04); } 100% { transform: rotate(1080deg) scale(1); } }
                @keyframes blSpotlight { 0% { opacity: 0; } 10% { opacity: 1; } 70% { opacity: 0.85; } 100% { opacity: 0; } }
                @keyframes blConfettiFall { 0% { transform: translateY(-10px) rotate(0deg); } 100% { transform: translateY(110vh) rotate(540deg); } }
                .bl-bottle { font-size: 68px; line-height: 1; filter: saturate(1.8) contrast(1.15); text-shadow: 0 0 18px rgba(170,80,255,0.55), 0 0 42px rgba(255,0,200,0.25); transform: translateZ(0); }
                .bl-bottle-spin { animation: blBottleSpin 1.1s cubic-bezier(.18,.9,.2,1) both; }
                .bl-spotlight { background: radial-gradient(circle at 50% 40%, rgba(255,215,0,0.24), transparent 55%), radial-gradient(circle at 60% 52%, rgba(255,0,200,0.18), transparent 62%), radial-gradient(circle at 42% 48%, rgba(0,230,255,0.14), transparent 60%); animation: blSpotlight 1.6s ease-out both; mix-blend-mode: screen; }
                .bl-confetti { position: absolute; width: 10px; height: 12px; border-radius: 3px; background: rgba(255,0,200,0.9); box-shadow: 0 0 14px rgba(255,0,200,0.55); animation-name: blConfettiFall; animation-timing-function: ease-in; animation-fill-mode: both; }
                .vip-glow { box-shadow: 0 0 16px rgba(255, 215, 0, 0.55), 0 0 44px rgba(255, 215, 0, 0.28), 0 0 22px rgba(255, 0, 200, 0.20); }
            `}</style>

            {/* Background image & FX */}
            <div
                className="fixed inset-0 z-0"
                style={{
                    backgroundImage: "url(/bar-lounge/lounge-bg.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            />
            {/* Dark overlay */}
            <div className="fixed inset-0 z-0 bg-black/50" />

            {/* Sparkle particles */}
            {viewState === 'watching' && Array.from({ length: 20 }).map((_, i) => (
                <div
                    key={i}
                    className="fixed w-1 h-1 rounded-full bg-yellow-400 animate-bl-sparkle z-10 pointer-events-none"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 4}s`,
                        animationDuration: `${2 + Math.random() * 3}s`,
                    }}
                />
            ))}

            <div className="relative z-20 max-w-[1400px] mx-auto px-4 lg:px-6 py-6 h-full min-h-screen flex flex-col">
                {/* Effects overlay */}
                {(fx.length > 0 || toast) && (
                    <div className="fixed inset-0 pointer-events-none z-[60]">
                        {fx.length > 0 && (
                            <>
                                {fx.some((x) => x.kind === "spotlight") && <div className="absolute inset-0 bl-spotlight" />}
                                {fx.some((x) => x.kind === "confetti") && (
                                    <div className="absolute inset-0 overflow-hidden">
                                        {Array.from({ length: 42 }).map((_, i) => (
                                            <span key={i} className="bl-confetti" style={{ left: `${Math.random() * 100}%`, top: `-12px`, animationDelay: `${Math.random() * 0.35}s`, animationDuration: `${1.1 + Math.random() * 0.6}s`, opacity: 0.9, transform: `translateY(0) rotate(${Math.random() * 360}deg)` }} />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                        {toast && <div className="absolute top-10 left-1/2 -translate-x-1/2 rounded-full border border-pink-500/40 bg-black/90 px-6 py-3 text-sm text-pink-100 font-medium shadow-[0_0_40px_rgba(255,0,200,0.3)] z-[70] transition-all animate-in fade-in slide-in-from-top-4">{toast}</div>}
                    </div>
                )}

                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        {viewState === 'hosting' ? (
                            <button onClick={endHosting} className="rounded-xl border border-red-500/25 bg-red-900/20 px-3 py-2 text-sm text-red-200 hover:bg-red-900/40 inline-flex items-center gap-2">
                                <LogOut className="w-4 h-4" /> End Session
                            </button>
                        ) : (
                            <button onClick={() => setViewState("lobby")} className="rounded-xl border border-fuchsia-500/25 bg-black/60 backdrop-blur-md px-3 py-2 text-sm text-fuchsia-200 hover:bg-white/10 inline-flex items-center gap-2 transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Leave Room
                            </button>
                        )}
                        <div>
                            <div className="text-violet-200 text-sm font-semibold drop-shadow-md">Bar Lounge</div>
                            <div className="text-xs text-gray-300 drop-shadow-md">
                                {viewState === 'hosting' ? "You are Live" : (activeSessions.find(s => s.id === roomId)?.title || "Live Session")}
                            </div>
                        </div>
                    </div>
                </div>

                {viewState === 'watching' ? (
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] lg:grid-rows-[minmax(0,1fr)] gap-4 lg:gap-6">
                        {/* LEFT COLUMN: Drink Menu */}
                        <div className="order-2 lg:order-1 flex flex-col min-h-0 lg:max-h-[calc(100vh-8rem)]">
                            <DrinkMenu
                                drinks={drinks}
                                creatorName={hostProfile?.full_name || hostProfile?.handle || "Creator"}
                                vipPrice={vipPrice}
                                ultraVipPrice={ultraVipPrice}
                                onPurchaseDrink={(name, price, fxArgs) => {
                                    handlePurchase("drink", name, price, fxArgs);
                                    setSpentHidden((s) => s + price);
                                }}
                                onPurchaseVip={(name, price) => {
                                    handlePurchase("vip", name, price);
                                    setSpentHidden((s) => s + price);
                                    if (price >= ultraVipPrice) playPop();
                                }}
                                onReserveBooth={(price) => {
                                    handlePurchase("booth", "Reserve Booth", price);
                                    setSpentHidden((s) => s + price);
                                }}
                            />
                        </div>

                        {/* CENTER COLUMN: Stream & Tips */}
                        <div className="order-1 lg:order-2 flex flex-col min-w-0 min-h-0">
                            <div className="rounded-2xl overflow-hidden border-2 border-fuchsia-500/30 bg-black backdrop-blur-md aspect-video relative shadow-[0_0_30px_rgba(217,70,239,0.15)] glow-pink flex-shrink-0">
                                {/* LIVE STREAM WRAPPER */}
                                {roomId && (
                                    <LiveStreamWrapper
                                        role="fan"
                                        appId={APP_ID}
                                        roomId={roomId}
                                        uid={user?.id || 0}
                                        hostId={hostId || ""}
                                        hostAvatarUrl={hostProfile?.avatar_url || "/avatars/creator.jpg"}
                                        hostName={hostProfile?.full_name || hostProfile?.handle || "Creator"}
                                    />
                                )}
                            </div>

                            <TipsSection
                                onTip={(amt) => {
                                    handlePurchase("tip", "Tip", amt);
                                    setSpentHidden((s) => s + amt);
                                }}
                                onCustomTip={(amt) => {
                                    handlePurchase("tip", "Custom Tip", amt);
                                    setSpentHidden((s) => s + amt);
                                }}
                            />

                            {/* Spin the Bottle */}
                            <div className="mt-4 border border-violet-500/20 rounded-xl p-4 bg-black/40 backdrop-blur-md">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-violet-200 text-sm font-semibold">Spin the Bottle</div>
                                    <span className="text-[10px] text-gray-400 font-bold">${SPIN_PRICE}/spin</span>
                                </div>
                                <div className="rounded-xl bg-black/30 p-4 flex items-center justify-center min-h-[140px] relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5" />
                                    <div className={cx("bl-bottle relative z-10", spinning && "bl-bottle-spin")}>🍾</div>
                                </div>
                                <button
                                    className={cx("mt-3 w-full rounded-xl border border-fuchsia-500/40 bg-fuchsia-600/30 py-2.5 text-sm font-bold text-white hover:bg-fuchsia-600/50 transition-colors", spinning && "opacity-80 cursor-not-allowed")}
                                    onClick={doSpin}
                                    disabled={spinning}
                                >
                                    {spinning ? "Spinning…" : `Spin Bottle — $${SPIN_PRICE}`}
                                </button>
                                {spinResult && (
                                    <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 animate-in fade-in zoom-in spin-result-anim">
                                        <div className="text-sm text-yellow-300 font-bold bl-glow-text-gold">{spinResult.label}</div>
                                        <div className="mt-1 text-xs text-gray-300">{spinResult.note}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Chat */}
                        <div className="order-3 flex flex-col min-min lg:max-h-[calc(100vh-8rem)]">
                            <LoungeChat
                                messages={messages as any}
                                chatValue={chat}
                                hostId={hostId || ""}
                                currentUserId={user?.id}
                                onChangeChat={setChat}
                                onSendMessage={() => {
                                    if (chat.trim()) {
                                        const myHandle = user?.user_metadata?.username || user?.user_metadata?.full_name || "Guest";
                                        sendMessage(chat, user?.id, myHandle);
                                        setChat("");
                                        if (!billingActive) activateBilling();
                                    }
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <NeonCard className="lg:col-span-8 p-4">
                            <div className="rounded-2xl overflow-hidden border border-violet-300/15 bg-black/40 aspect-video relative">
                                {/* LIVE STREAM WRAPPER */}
                                {roomId && (
                                    <LiveStreamWrapper
                                        role={viewState === 'hosting' ? 'host' : 'fan'}
                                        appId={APP_ID}
                                        roomId={roomId}
                                        uid={user?.id || 0}
                                        hostId={hostId || ""}
                                        hostAvatarUrl={viewState === 'hosting' ? user?.user_metadata?.avatar_url : hostProfile?.avatar_url || "/avatars/creator.jpg"}
                                        hostName={viewState === 'hosting' ? (user?.user_metadata?.full_name || "You") : (hostProfile?.full_name || hostProfile?.handle || "Creator")}
                                    />
                                )}
                            </div>

                            {/* Host sees Activity/Events placeholder or just enjoys the view */}
                            {viewState === 'hosting' && (
                                <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <h3 className="text-sm text-gray-300 mb-2">Live Session Controls</h3>
                                    <p className="text-xs text-gray-500">Wait for fans to send drinks or spin the bottle. Effects will appear on screen automatically.</p>
                                </div>
                            )}
                        </NeonCard>

                        <div className="lg:col-span-4 space-y-6">
                            <NeonCard className="p-4">
                                <div className="flex items-center justify-between mb-3"><div className="text-violet-200 text-sm">Lounge Chat</div></div>
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 h-[420px] overflow-auto flex flex-col">
                                    <div className="flex-1" />
                                    {messages.map((m) => {
                                        const isHost = m.handle === "Host" || m.user_id === hostId;
                                        return (
                                            <div key={m.id} className="text-sm text-gray-200 mb-2">
                                                <span className={cx(
                                                    "font-bold",
                                                    isHost ? "text-fuchsia-300" : "text-violet-200"
                                                )}>
                                                    {m.handle || "Start"}
                                                </span>: {m.content}
                                            </div>
                                        );
                                    })}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        value={chat}
                                        onChange={(e) => setChat(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && chat.trim()) {
                                                const myHandle = user?.user_metadata?.username || user?.user_metadata?.full_name || "PinkVibe";
                                                sendMessage(chat, user?.id, myHandle);
                                                setChat("");
                                            }
                                        }}
                                        className="flex-1 rounded-xl border border-violet-300/20 bg-black/40 px-3 py-2 text-sm outline-none placeholder:text-gray-600"
                                        placeholder="Type message…"
                                    />
                                    <button
                                        className="rounded-xl border border-violet-300/30 bg-violet-600 px-3 py-2 text-sm hover:bg-violet-700 inline-flex items-center gap-2 transition-colors"
                                        onClick={() => {
                                            if (chat.trim()) {
                                                const myHandle = user?.user_metadata?.username || user?.user_metadata?.full_name || "PinkVibe";
                                                sendMessage(chat, user?.id, myHandle);
                                                setChat("");
                                            }
                                        }}
                                    >
                                        <Send className="w-4 h-4" /> Send
                                    </button>
                                </div>
                            </NeonCard>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
