"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Video,
    Sparkles,
    Crown,
    Users,
    DollarSign,
    Pin,
    MessageCircle,
    Ban,
    VolumeX,
    Zap,
    Send,
    Loader2,
    Calendar,
    Plus,
    Play
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useBarChat } from "@/hooks/useBarChat";
import dynamic from "next/dynamic";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const supabase = createClient();

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                "shadow-[0_0_22px_rgba(236,72,153,0.14),0_0_52px_rgba(59,130,246,0.08)]",
                "hover:shadow-[0_0_34px_rgba(236,72,153,0.20),0_0_78px_rgba(59,130,246,0.12)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

// --- Types ---

type BadgeTier = "Rookie" | "Rising" | "Star" | "Elite" | "VIP";

type DrinkTone = "pink" | "purple" | "blue" | "green" | "yellow" | "red";
type Drink = {
    id: string;
    name: string;
    price: number;
    icon: string;
    tone: DrinkTone;
    special?: "champagne" | "vipbottle";
};

type Reaction = { id: string; label: string; price: number };

type SpinOutcome = {
    id: string;
    label: string;
    odds: number; // percent
    note: string;
};

type FanRow = {
    id: string;
    handle: string;
    tier: BadgeTier;
    spentTotal: number;
    priorityUntilTs?: number;
    vipDiscountCents?: number;
    muted?: boolean;
};

type RevenueEvent =
    | { id: string; ts: number; kind: "drink"; fanId: string; label: string; amount: number; meta?: any }
    | { id: string; ts: number; kind: "reaction"; fanId: string; label: string; amount: number }
    | { id: string; ts: number; kind: "vip"; fanId: string; label: string; amount: number }
    | { id: string; ts: number; kind: "spin"; fanId: string; label: string; amount: number; outcome: SpinOutcome };

type Room = {
    id: string;
    title: string | null;
    status: string;
    created_at: string;
};

// --- Helpers ---

function tierChip(tier: BadgeTier) {
    const base = "text-[10px] px-2 py-[2px] rounded-full border bg-black/40";
    switch (tier) {
        case "VIP": return cx(base, "border-yellow-400/40 text-yellow-200");
        case "Elite": return cx(base, "border-fuchsia-400/30 text-fuchsia-200");
        case "Star": return cx(base, "border-cyan-300/25 text-cyan-200");
        case "Rising": return cx(base, "border-violet-300/25 text-violet-200");
        default: return cx(base, "border-white/10 text-gray-200");
    }
}

function money(n: number) {
    return `$${n.toFixed(0)}`;
}

function nowId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function BarLoungeCreatorStudioPage() {
    const router = useRouter();
    const onBack = () => router.push('/creator/dashboard');

    // --- State ---
    const [viewState, setViewState] = useState<"loading" | "history" | "new" | "live">("loading");
    const [roomId, setRoomId] = useState<string | null>(null);
    const [me, setMe] = useState<any>(null);
    const [toast, setToast] = useState<string | null>(null);

    // Session Management
    const [rooms, setRooms] = useState<Room[]>([]);
    const [sessionName, setSessionName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Live Dashboard Types
    const [isLive, setIsLive] = useState(false);
    const [pinnedMsg, setPinnedMsg] = useState<string>("VIP bottles get priority attention.");
    const [chat, setChat] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    const { messages, sendMessage } = useBarChat(roomId);

    const [fans, setFans] = useState<FanRow[]>([]);
    const [events, setEvents] = useState<RevenueEvent[]>([]);

    // Config
    const SPIN_PRICE = 25;
    const [vipPrice, setVipPrice] = useState(150);
    const [ultraVipPrice, setUltraVipPrice] = useState(400);
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [spinOutcomes, setSpinOutcomes] = useState<SpinOutcome[]>([]);

    const [selectedFanId, setSelectedFanId] = useState<string>("f2");
    const [dareText, setDareText] = useState<string>("Tell me your wildest nightlife confession in 10 seconds.");

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setMe(user);

            // Fetch global bar config
            const { data: config } = await supabase.from("admin_bar_config").select("*").eq("id", 1).single();
            if (config) {
                setVipPrice(config.vip_price ?? 150);
                setUltraVipPrice(config.ultra_vip_price ?? 400);
                if (config.spin_odds) setSpinOutcomes(config.spin_odds as SpinOutcome[]);
                if (config.menu_items) setDrinks(config.menu_items as Drink[]);
                else {
                    // Defaults if config missing
                    setDrinks([
                        { id: "d1", name: "Whiskey Shot", price: 8, icon: "🥃", tone: "red" },
                        { id: "d2", name: "Neon Martini", price: 25, icon: "🍸", tone: "pink" },
                        { id: "d3", name: "Blue Lagoon", price: 25, icon: "🧊", tone: "blue" },
                        { id: "d4", name: "Champagne Bottle", price: 100, icon: "🍾", tone: "yellow", special: "champagne" },
                        { id: "d5", name: "VIP Bottle", price: 250, icon: "👑", tone: "purple", special: "vipbottle" },
                    ]);
                    setSpinOutcomes([
                        { id: "o1", label: "Pinned Message (1 min)", odds: 30, note: "Fan’s next message pins above chat." },
                        { id: "o2", label: "Priority Cam (2 min)", odds: 20, note: "Fan badge glows; creator sees first." },
                        { id: "o3", label: "VIP Booth Discount $50", odds: 12, note: "Applies to VIP Booth unlock." },
                        { id: "o4", label: "Free +2 Minutes", odds: 18, note: "Adds 2 minutes of free time." },
                        { id: "o5", label: "Creator Dares You", odds: 10, note: "Creator can send a dare prompt." },
                        { id: "o6", label: "Try Again", odds: 10, note: "No perk, but creator shoutout." },
                    ]);
                }
            }

            // Fetch rooms
            const { data: roomList } = await supabase
                .from("rooms")
                .select("id, title, status, created_at")
                .eq("host_id", user.id)
                .eq("type", "bar-lounge")
                .order("created_at", { ascending: false });

            if (roomList) {
                setRooms(roomList);
            }
            setViewState("history");
        };

        init();
    }, []);

    const loadRoomEvents = async (rId: string) => {
        // Load recent events
        const { data: recentEvents } = await supabase
            .from("revenue_events")
            .select("*")
            .eq("room_key", rId)
            .order("created_at", { ascending: false })
            .limit(20);

        if (recentEvents) {
            const formatted = recentEvents.map(e => ({
                id: e.id,
                ts: new Date(e.created_at).getTime(),
                kind: e.item_type || 'drink',
                fanId: e.sender_id,
                label: e.item_label || 'Item',
                amount: e.amount,
                meta: e.metadata
            })) as RevenueEvent[];
            setEvents(formatted.reverse());
        }

        // Subscribe to events
        const channel = supabase
            .channel("room_events:" + rId)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "revenue_events", filter: `room_key=eq.${rId}` },
                (payload) => {
                    const newEvent = payload.new;
                    const fmt: RevenueEvent = {
                        id: newEvent.id,
                        ts: new Date(newEvent.created_at).getTime(),
                        kind: newEvent.item_type || 'drink',
                        fanId: newEvent.sender_id,
                        label: newEvent.item_label || 'Item',
                        amount: newEvent.amount,
                        meta: newEvent.metadata
                    } as any;

                    setEvents(prev => [fmt, ...prev].slice(0, 50));
                    setToast(`New ${fmt.kind}: ${fmt.label}`);
                    setTimeout(() => setToast(null), 3000);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    // --- Fan Presence ---
    useEffect(() => {
        if (!roomId || viewState !== "live") return;

        const fetchFans = async () => {
            const { data } = await supabase
                .from("room_participants")
                .select(`
                    user_id,
                    profiles:user_id ( handle )
                `)
                .eq("room_id", roomId);

            if (data) {
                const mapped: FanRow[] = data.map((p: any) => ({
                    id: p.user_id,
                    handle: p.profiles?.handle || "Unknown",
                    tier: "Rookie",
                    spentTotal: 0,
                    muted: false
                }));
                setFans(mapped);
            }
        };

        fetchFans();

        const channel = supabase
            .channel("room_presence:" + roomId)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` },
                () => fetchFans()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, viewState]);

    const pushToast = (msg: string) => {
        setToast(msg);
        window.setTimeout(() => setToast(null), 1600);
    };

    const handleCreateSession = async () => {
        if (!sessionName.trim() || !me) return;
        setIsCreating(true);

        // Terminate any other live sessions for hygiene
        await supabase
            .from("rooms")
            .update({ status: "ended" })
            .eq("host_id", me.id)
            .eq("type", "bar-lounge")
            .eq("status", "live");

        const { data: newRoom, error } = await supabase
            .from("rooms")
            .insert({
                host_id: me.id,
                type: "bar-lounge",
                status: "live",
                title: sessionName
            })
            .select()
            .single();

        if (newRoom) {
            setRoomId(newRoom.id);
            setRooms([newRoom, ...rooms]);
            setIsLive(true);
            setViewState("live");
            loadRoomEvents(newRoom.id);
        } else {
            console.error("Failed to create session:", error);
            setToast(`Failed: ${error?.message || "Unknown error"}`);
        }
        setIsCreating(false);
    };

    const endSession = async () => {
        if (roomId) {
            await supabase.from("rooms").update({ status: "ended" }).eq("id", roomId);
        }
        setRoomId(null);
        setIsLive(false);
        setViewState("history");
        // Refresh room list
        const { data: roomList } = await supabase
            .from("rooms")
            .select("id, title, status, created_at")
            .eq("host_id", me.id)
            .eq("type", "bar-lounge")
            .order("created_at", { ascending: false });
        if (roomList) setRooms(roomList);
    };

    const handleEndSpecificRoom = async (id: string) => {
        const { error } = await supabase.from("rooms").update({ status: "ended" }).eq("id", id);
        if (error) {
            pushToast("Failed to end room");
        } else {
            setRooms((prev: Room[]) => prev.map(r => r.id === id ? { ...r, status: "ended" } : r));
            pushToast("Session ended");
        }
    };

    // --- Live Dashboard Logic (Refactored from previous version) ---
    const feedRef = useRef<HTMLDivElement | null>(null);
    const bumpFanSpend = (fanId: string, delta: number) => {
        setFans((rows: FanRow[]) => rows.map((f) => (f.id === fanId ? { ...f, spentTotal: f.spentTotal + delta } : f)));
    };
    const addEvent = (evt: RevenueEvent) => {
        setEvents((rows: RevenueEvent[]) => [evt, ...rows].slice(0, 50));
        window.setTimeout(() => { if (feedRef.current) feedRef.current.scrollTop = 0; }, 0);
    };

    const totals = useMemo(() => {
        let total = 0, drinks = 0, reacts = 0, vip = 0, spin = 0;
        for (const e of events) {
            total += e.amount;
            if (e.kind === "drink") drinks += e.amount;
            if (e.kind === "reaction") reacts += e.amount;
            if (e.kind === "vip") vip += e.amount;
            if (e.kind === "spin") spin += e.amount;
        }
        const top = [...fans].sort((a, b) => b.spentTotal - a.spentTotal)[0];
        return { total, drinks, reacts, vip, spin, topHandle: top?.handle ?? "—", activeFans: fans.length };
    }, [events, fans]);

    const muteFan = (fanId: string) => setFans((rows) => rows.map((f) => (f.id === fanId ? { ...f, muted: true } : f)));
    const unmuteFan = (fanId: string) => setFans((rows) => rows.map((f) => (f.id === fanId ? { ...f, muted: false } : f)));
    const kickFan = (fanId: string) => setFans((rows) => rows.filter((f) => f.id !== fanId));

    const selectedFan = fans.find((f) => f.id === selectedFanId);
    const livePriority = (f: FanRow) => (f.priorityUntilTs && f.priorityUntilTs > Date.now() ? true : false);

    // --- Simulation (Preview) ---
    const simulateDrink = (fanId: string, drinkId: string) => {
        const fan = fans.find((f) => f.id === fanId); const d = drinks.find((x) => x.id === drinkId);
        if (!fan || !d) return;
        bumpFanSpend(fanId, d.price);
        addEvent({ id: nowId("evt"), ts: Date.now(), kind: "drink", fanId, label: d.name, amount: d.price, meta: { special: d.special } });
        if (d.special === "champagne") pushToast("🍾 Champagne moment");
        if (d.special === "vipbottle") pushToast("👑 VIP bottle served");
    };
    // ... (other simulation logic omitted for brevity, logic remains same as simulated events handled by postgres subscription in prod)

    // --- Renders ---

    if (viewState === "loading") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    // --- State: History List ---
    if (viewState === "history") {
        return (
            <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen bg-black text-white">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                            Bar Lounge Studio
                        </h1>
                        <p className="text-gray-400 mt-1">Manage your live bar sessions</p>
                    </div>
                    <button
                        onClick={onBack}
                        className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Dashboard
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* New Session Card */}
                    <div
                        onClick={() => setViewState("new")}
                        className="cursor-pointer group relative overflow-hidden rounded-2xl border border-violet-500/30 bg-violet-900/10 p-8 flex flex-col items-center justify-center gap-4 hover:border-violet-500/60 transition-colors dashed"
                    >
                        <div className="rounded-full bg-violet-600/20 p-4 group-hover:bg-violet-600/30 transition-colors">
                            <Plus className="w-8 h-8 text-violet-300" />
                        </div>
                        <div className="text-lg font-medium text-violet-200">Start New Session</div>
                    </div>

                    {/* Active Session (if any logic fails and we fall back here) */}
                    {rooms.filter(r => r.status === 'live').map(room => (
                        <NeonCard key={room.id} className="p-6 border-emerald-500/40">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-emerald-400 text-sm font-medium tracking-wide uppercase">Live Now</span>
                                    </div>
                                    <div className="text-xl font-semibold text-white">{room.title || "Untitled Session"}</div>
                                    <div className="text-sm text-gray-400 mt-1">Started {new Date(room.created_at).toLocaleString()}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleEndSpecificRoom(room.id)}
                                        className="rounded-xl border border-pink-500/30 bg-pink-900/20 px-4 py-3 text-pink-200 text-sm font-medium hover:bg-pink-900/30 transition-colors"
                                    >
                                        End Session
                                    </button>
                                    <button
                                        onClick={() => {
                                            setRoomId(room.id);
                                            setIsLive(true);
                                            setViewState("live");
                                            loadRoomEvents(room.id);
                                        }}
                                        className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-medium hover:bg-emerald-500 transition-colors flex items-center gap-2"
                                    >
                                        <Play className="w-4 h-4" /> Resume
                                    </button>
                                </div>
                            </div>
                        </NeonCard>
                    ))}

                    {/* History List */}
                    <div className="mt-4">
                        <h2 className="text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Previous Sessions
                        </h2>
                        <div className="space-y-3">
                            {rooms.filter(r => r.status !== 'live').map(room => (
                                <div key={room.id} className="rounded-xl border border-white/5 bg-white/5 p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                                    <div>
                                        <div className="font-medium text-gray-200">{room.title || "Untitled Session"}</div>
                                        <div className="text-xs text-gray-500 mt-1">{new Date(room.created_at).toLocaleString()}</div>
                                    </div>
                                    <div className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400 uppercase tracking-wider">
                                        Ended
                                    </div>
                                </div>
                            ))}
                            {rooms.length === 0 && (
                                <div className="text-center text-gray-500 py-8">No previous sessions found.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- State: New Session Modal ---
    if (viewState === "new") {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <NeonCard className="w-full max-w-md p-6 relative">
                    <button
                        onClick={() => setViewState("history")}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center p-3 rounded-full bg-violet-500/10 mb-4">
                            <Video className="w-8 h-8 text-violet-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Start Bar Lounge</h2>
                        <p className="text-gray-400 text-sm mt-1">Give your session a name to notify fans.</p>
                    </div>

                    <input
                        autoFocus
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="e.g. Friday Night Hangout 🍸"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 mb-6"
                    />

                    <button
                        onClick={handleCreateSession}
                        disabled={!sessionName.trim() || isCreating}
                        className="w-full rounded-xl bg-violet-600 py-3 text-white font-medium hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                        Start Session
                    </button>
                </NeonCard>
            </div>
        );
    }

    // --- State: Live Dashboard ---
    // (This is mostly the original UI, now wrapped in this state)
    return (
        <div className="max-w-7xl mx-auto px-6 py-6 min-h-screen bg-black text-white">
            {/* Top toast */}
            {toast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] rounded-2xl border border-white/10 bg-black/70 px-4 py-2 text-sm text-gray-100 shadow-[0_0_40px_rgba(255,0,200,0.25)]">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <button
                        onClick={endSession}
                        className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> End / Back
                    </button>

                    <div>
                        <div className="text-violet-200 text-sm">Bar Lounge — Creator Studio</div>
                        <div className="text-xs text-gray-500">{rooms.find(r => r.id === roomId)?.title || "Live Session"}</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-3 py-2">
                        <div className="text-[10px] text-yellow-200">Session revenue</div>
                        <div className="text-sm text-yellow-100 font-semibold">{money(totals.total)}</div>
                    </div>
                </div>
            </div>

            {/* KPI Strip */}
            <NeonCard className="p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <Users className="w-3 h-3" /> Active fans
                        </div>
                        <div className="text-sm text-gray-100 font-semibold mt-1">{totals.activeFans}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Drinks
                        </div>
                        <div className="text-sm text-gray-100 font-semibold mt-1">{money(totals.drinks)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Reactions
                        </div>
                        <div className="text-sm text-gray-100 font-semibold mt-1">{money(totals.reacts)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <Crown className="w-3 h-3" /> VIP
                        </div>
                        <div className="text-sm text-gray-100 font-semibold mt-1">{money(totals.vip)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Spin
                        </div>
                        <div className="text-sm text-gray-100 font-semibold mt-1">{money(totals.spin)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400">Top spender</div>
                        <div className="text-sm text-yellow-200 font-semibold mt-1">{totals.topHandle}</div>
                    </div>
                </div>
            </NeonCard>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Stage */}
                <NeonCard className="lg:col-span-7 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-violet-200 text-sm">Creator Stream Preview</div>
                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-violet-300/25 text-violet-200 bg-black/40">
                            Studio
                        </span>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-violet-300/15 bg-black/40 aspect-video relative">
                        <LiveStreamWrapper
                            role="host"
                            appId={APP_ID}
                            roomId={roomId || ""}
                            uid={me?.id || 0}
                            hostId={me?.id || 0}
                            hostAvatarUrl={me?.user_metadata?.avatar_url}
                            hostName={me?.user_metadata?.full_name || "Creator"}
                        />
                    </div>

                    {/* Pinned message */}
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[11px] text-gray-400 inline-flex items-center gap-2">
                            <Pin className="w-3 h-3" /> Pinned message (fans see this at top)
                        </div>
                        <div className="mt-2 text-sm text-gray-100">{pinnedMsg}</div>
                    </div>

                    {/* Quick show controls */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                            className="rounded-2xl border border-violet-300/25 bg-black/35 p-3 hover:bg-white/5"
                            onClick={() => pushToast("🔦 Spotlight pulse (preview)")}
                        >
                            <div className="text-sm text-violet-200 inline-flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Spotlight Pulse
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">Boost hype moment</div>
                        </button>
                        <button
                            className="rounded-2xl border border-fuchsia-300/25 bg-black/35 p-3 hover:bg-white/5"
                            onClick={() => pushToast("🎉 Confetti moment (preview)")}
                        >
                            <div className="text-sm text-fuchsia-200 inline-flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Confetti Moment
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">For big purchases</div>
                        </button>
                        <button
                            className="rounded-2xl border border-yellow-400/25 bg-black/35 p-3 hover:bg-white/5"
                            onClick={() => pushToast("🔊 Pop sound cue (preview)")}
                        >
                            <div className="text-sm text-yellow-200 inline-flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Play Pop Cue
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">Champagne / VIP bottle</div>
                        </button>
                    </div>

                    {/* Creator Actions */}
                    <div className="mt-6 rounded-2xl border border-violet-300/20 bg-black/35 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-violet-200 text-sm">Creator Actions</div>
                            <span className="text-[10px] text-gray-400">Pin • Dare • Highlight</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-5">
                                <div className="text-[11px] text-gray-400 mb-2">Select fan</div>
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
                                    <select
                                        value={selectedFanId}
                                        onChange={(e) => setSelectedFanId(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                                    >
                                        {fans.map((f) => (
                                            <option key={f.id} value={f.id}>{f.handle} ({f.tier})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-sm text-gray-100 font-semibold inline-flex items-center gap-2">
                                        {selectedFan?.handle ?? "—"} <span className={tierChip(selectedFan?.tier ?? "Rookie")}>{selectedFan?.tier ?? "—"}</span>
                                    </div>
                                    <div className="mt-1 text-[11px] text-gray-400">
                                        Total spent (creator-visible): <span className="text-yellow-200">{money(selectedFan?.spentTotal ?? 0)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-7">
                                <div className="text-[11px] text-gray-400 mb-2">Pin message</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        value={pinnedMsg}
                                        onChange={(e) => setPinnedMsg(e.target.value)}
                                        className="flex-1 rounded-xl border border-violet-300/20 bg-black/40 px-3 py-2 text-sm outline-none"
                                        placeholder="Type pinned message…"
                                    />
                                    <button
                                        className="rounded-xl border border-violet-300/30 bg-violet-600 px-3 py-2 text-sm hover:bg-violet-700 inline-flex items-center gap-2"
                                        onClick={() => pushToast("📌 Pinned message updated")}
                                    >
                                        <Pin className="w-4 h-4" /> Set
                                    </button>
                                </div>
                                <div className="mt-4 text-[11px] text-gray-400 mb-2">Send a dare</div>
                                <div className="flex gap-2">
                                    <button className="flex-1 rounded-xl border border-emerald-300/25 bg-emerald-600/20 py-2 text-sm hover:bg-emerald-600/30 inline-flex items-center gap-2 justify-center" onClick={() => pushToast(`🎯 Dare sent to ${selectedFan?.handle ?? "fan"}`)}>
                                        <MessageCircle className="w-4 h-4" /> Dare
                                    </button>
                                    <button className="flex-1 rounded-xl border border-fuchsia-300/25 bg-black/40 py-2 text-sm hover:bg-white/5 inline-flex items-center gap-2 justify-center" onClick={() => pushToast(`✨ Highlighted ${selectedFan?.handle ?? "fan"}`)}>
                                        <Sparkles className="w-4 h-4" /> Highlight
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </NeonCard>

                {/* Right rail: Feed + Fans + Settings */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Chat */}
                    <NeonCard className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-violet-200 text-sm">Lounge Chat</div>
                            <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">Room</span>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 h-[320px] overflow-auto flex flex-col">
                            <div className="flex-1" />
                            {messages.length === 0 && <div className="text-sm text-gray-500 text-center py-4">No messages yet.</div>}
                            {messages.map((m) => {
                                const isMe = m.user_id === me?.id;
                                return (
                                    <div key={m.id} className="text-sm text-gray-200 mb-2">
                                        <span className={cx("font-bold", isMe ? "text-fuchsia-300" : "text-violet-200")}>
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
                                        const myHandle = me?.user_metadata?.username || me?.user_metadata?.full_name || "PinkVibe";
                                        sendMessage(chat, me?.id, myHandle);
                                        setChat("");
                                    }
                                }}
                                className="flex-1 rounded-xl border border-violet-300/20 bg-black/40 px-3 py-2 text-sm outline-none"
                                placeholder="Type message…"
                            />
                            <button
                                className="rounded-xl border border-violet-300/30 bg-violet-600 px-3 py-2 text-sm hover:bg-violet-700 inline-flex items-center gap-2"
                                onClick={() => {
                                    if (chat.trim()) {
                                        const myHandle = me?.user_metadata?.username || me?.user_metadata?.full_name || "PinkVibe";
                                        sendMessage(chat, me?.id, myHandle);
                                        setChat("");
                                    }
                                }}
                            >
                                <Send className="w-4 h-4" /> Send
                            </button>
                        </div>
                    </NeonCard>

                    {/* Live revenue feed */}
                    <NeonCard className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-violet-200 text-sm">Live Revenue Feed</div>
                            <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">Latest first</span>
                        </div>
                        <div ref={feedRef} className="rounded-2xl border border-white/10 bg-black/30 p-3 h-[240px] overflow-auto">
                            {events.map((e) => {
                                const fan = fans.find((f) => f.id === e.fanId);
                                const badge = tierChip(fan?.tier ?? "Rookie");
                                return (
                                    <div key={e.id} className="mb-3 last:mb-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-sm text-gray-100 inline-flex items-center gap-2">
                                                <span className="text-violet-200">{fan?.handle ?? "@fan"}</span>
                                                <span className={badge}>{fan?.tier ?? "—"}</span>
                                                <span className="text-gray-300">{e.kind.toUpperCase()}</span>
                                            </div>
                                            <div className="text-sm text-yellow-200 font-semibold">{money(e.amount)}</div>
                                        </div>
                                        <div className="mt-1 text-[11px] text-gray-300">
                                            {e.kind === "spin" ? <><span className="text-gray-100">{e.outcome.label}</span> — {e.outcome.note}</> : <>{e.label}</>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                            <div className="text-[11px] text-gray-400 mb-2">Preview Simulation</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button className="rounded-xl border border-yellow-400/25 bg-black/40 py-2 text-xs hover:bg-white/5" onClick={() => simulateDrink("f2", "d5")}>Sim VIP Bottle</button>
                                <button className="rounded-xl border border-fuchsia-300/25 bg-black/40 py-2 text-xs hover:bg-white/5" onClick={() => simulateDrink("f1", "d4")}>Sim Champagne</button>
                            </div>
                        </div>
                    </NeonCard>
                </div>
            </div>
        </div>
    );
}
