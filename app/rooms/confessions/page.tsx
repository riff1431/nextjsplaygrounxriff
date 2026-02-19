"use client";

import React, { useState, useEffect } from "react";
import {
    ArrowLeft, Video, Lock, Check, X, Mic, UserRound, Menu, Coins,
    MessageSquareText, Flame, Heart, Sparkles, Gift, Search
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { toast as sonnerToast } from "sonner";
import StripePaymentModal from "@/components/live/StripePaymentModal";

/* ----------------------------- Tiny UI helpers ---------------------------- */

function cn(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

/* 
   MODERNIZED ROSE THEME
   - Primary: Rose/Pink/Red with Premium Glassmorphism
   - Bg: Deep Dark Red/Black (#0f0505) with noise texture
   - Borders: Subtle gradients
*/

type BtnVariant = "ghost" | "solid" | "rose" | "chip";

function Btn({
    children,
    className,
    variant = "solid",
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
    const base =
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group";

    const styles: Record<BtnVariant, string> = {
        solid:
            "bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-rose-50 shadow-lg shadow-black/20 backdrop-blur-sm",
        ghost: "bg-transparent hover:bg-rose-500/10 text-rose-200/80 hover:text-white",
        rose:
            "bg-gradient-to-br from-rose-600 to-rose-700 text-white border border-rose-500/30 shadow-[0_4px_20px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_25px_rgba(225,29,72,0.4)] hover:brightness-110",
        chip:
            "bg-rose-950/40 hover:bg-rose-900/50 text-rose-100/90 border border-rose-800/30 px-3 py-1.5 rounded-full backdrop-blur-md hover:border-rose-700/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)]",
    };
    return (
        <button className={cn(base, styles[variant], className)} {...props}>
            {children}
        </button>
    );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-950/40 px-3 py-1 text-[10px] font-bold text-rose-100/90 uppercase tracking-wide backdrop-blur-md shadow-sm",
                className
            )}
        >
            {children}
        </div>
    );
}

function CardShell({
    title,
    right,
    children,
    className,
}: {
    title: string;
    right?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                "group relative overflow-hidden rounded-3xl border border-rose-500/10 bg-[#120205]/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-rose-500/20 hover:bg-[#120205]/80 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1",
                className
            )}
        >
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative flex items-center justify-between px-6 pt-5 pb-3 border-b border-rose-500/10">
                <h3 className="text-sm font-extrabold tracking-tight text-white/90 flex items-center gap-2">
                    {title}
                </h3>
                {right}
            </div>
            <div className="relative p-6">{children}</div>
        </section>
    );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
    const pct = Math.max(0, Math.min(1, max ? value / max : 0));
    return (
        <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden border border-rose-500/10">
            <div
                className="h-full rounded-full bg-gradient-to-r from-rose-600 via-pink-500 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] transition-all duration-1000 ease-out"
                style={{ width: `${pct * 100}%` }}
            />
        </div>
    );
}

// --------------------------------------------------------------------------

// ---- Types -----------------------------------------------------------------

type RequestStatus = 'pending_approval' | 'in_progress' | 'delivered' | 'completed' | 'rejected';

interface ConfessionRequest {
    id: string;
    type: 'Text' | 'Audio' | 'Video';
    amount: number;
    topic: string;
    status: RequestStatus;
    delivery_content?: string;
    created_at: string;
}

interface CreatorInfo {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
}

interface Confession {
    id: string;
    tier: string;
    title: string;
    teaser: string;
    content?: string;
    media_url?: string;
    type: 'Text' | 'Voice' | 'Video';
    price: number;
    unlocked?: boolean;
    creator?: CreatorInfo;
}

// --------------------------------------------------------------------------

export default function ConfessionsRoom() {
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();

    // Dynamic room discovery
    const [roomId, setRoomId] = useState<string | null>(null);

    // State
    const [requests, setRequests] = useState<ConfessionRequest[]>([]);
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [loadingWall, setLoadingWall] = useState(false);
    const [myWalletBalance, setMyWalletBalance] = useState(0);

    // Filter & Search
    const [tierFilter, setTierFilter] = useState<string>('All');
    const [creatorSearch, setCreatorSearch] = useState('');
    const [searchDebounce, setSearchDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [isSearchMode, setIsSearchMode] = useState(false);

    // Request Form
    const [reqType, setReqType] = useState<'Text' | 'Audio' | 'Video'>('Text');
    const [reqAmount, setReqAmount] = useState(10);
    const [reqTopic, setReqTopic] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isAnon, setIsAnon] = useState(true);

    // Modals
    const [reviewRequest, setReviewRequest] = useState<ConfessionRequest | null>(null);
    const [purchaseConfession, setPurchaseConfession] = useState<Confession | null>(null);
    const [viewConfession, setViewConfession] = useState<Confession | null>(null);

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'wallet' | 'stripe' | 'paypal' | 'bank'>('stripe');
    const [stripeConfig, setStripeConfig] = useState<{
        amount: number;
        confirmUrl: string;
        metadata: any;
        onSuccess: () => void;
    } | null>(null);

    // Countdown
    const [goalTotal, setGoalTotal] = useState(140);
    const pay = (amount: number) => setGoalTotal(g => g + amount);

    // Discover room on mount
    useEffect(() => {
        if (!user) return;

        async function discoverRoom() {
            const supabase = createClient();
            const { data: confessionRoom } = await supabase.from('confessions').select('room_id').limit(1).maybeSingle();
            if (confessionRoom?.room_id) { setRoomId(confessionRoom.room_id); return; }
            const { data: anyRoom } = await supabase.from('rooms').select('id').limit(1).maybeSingle();
            if (anyRoom?.id) setRoomId(anyRoom.id);
        }
        discoverRoom();
    }, [user]);

    useEffect(() => {
        if (user && roomId) {
            fetchRequests();
            fetchWallet();

            const creatorParam = searchParams?.get('creator');
            if (creatorParam) {
                setCreatorSearch(creatorParam);
                setIsSearchMode(true);
                fetchConfessions(creatorParam, tierFilter);
            } else {
                fetchConfessions();
            }

            const supabase = createClient();
            const channel = supabase
                .channel('fan-notifications')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                    (payload) => {
                        if (payload.new.type === 'request_delivered') {
                            showToast(payload.new.message, 'success');
                            fetchRequests();
                        }
                    }
                )
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [user, roomId]);

    const fetchWallet = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('wallets').select('balance').eq('user_id', user?.id).single();
        if (data) setMyWalletBalance(data.balance);
    };

    const fetchRequests = async () => {
        setLoadingRequests(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/requests`);
            const data = await res.json();
            if (data.requests) setRequests(data.requests);
        } catch (e) {
            console.error("Failed requests", e);
        } finally {
            setLoadingRequests(false);
        }
    };

    const fetchConfessions = async (searchQuery?: string, tier?: string) => {
        setLoadingWall(true);
        try {
            const q = (searchQuery ?? creatorSearch).trim();
            const t = tier ?? tierFilter;
            const supabase = createClient();

            let confessionRows: any[] = [];

            if (q) {
                setIsSearchMode(true);
                const { data: matchedProfiles } = await supabase.from('profiles').select('id, full_name, username, avatar_url').or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).limit(20);
                if (!matchedProfiles || matchedProfiles.length === 0) { setConfessions([]); return; }

                const creatorIds = matchedProfiles.map((p: any) => p.id);
                const { data: rooms } = await supabase.from('rooms').select('id, host_id').in('host_id', creatorIds);
                if (!rooms || rooms.length === 0) { setConfessions([]); return; }

                const roomIds = rooms.map((r: any) => r.id);
                let confQuery = supabase.from('confessions').select('*').in('room_id', roomIds).eq('status', 'Published').order('created_at', { ascending: false });
                if (t && t !== 'All') confQuery = confQuery.eq('tier', t);

                const { data: confData } = await confQuery;
                const roomToCreator = new Map<string, any>();
                for (const room of rooms) {
                    const profile = matchedProfiles.find((p: any) => p.id === room.host_id);
                    if (profile) roomToCreator.set(room.id, profile);
                }
                confessionRows = (confData || []).map((c: any) => ({ ...c, creator: roomToCreator.get(c.room_id) || null }));
            } else if (t !== 'All') {
                setIsSearchMode(true);
                let confQuery = supabase.from('confessions').select('*').eq('status', 'Published').eq('tier', t).order('created_at', { ascending: false }).limit(50);
                const { data: confData } = await confQuery;
                confessionRows = confData || [];
            } else {
                // Default 'All' view: Fetch global confessions (like other filters)
                // Remove roomId restriction to show content initially
                setIsSearchMode(true);
                const { data } = await supabase
                    .from('confessions')
                    .select('*')
                    .eq('status', 'Published')
                    .order('created_at', { ascending: false })
                    .limit(50);
                confessionRows = data || [];
            }

            const mapped = confessionRows.map((c: any) => ({
                id: c.id,
                tier: c.tier || 'Spicy',
                title: c.title,
                teaser: c.teaser || c.title,
                content: c.content,
                media_url: c.media_url,
                type: c.type || 'Text',
                price: c.price || 5,
                creator: c.creator || null,
            }));
            setConfessions(mapped);
        } catch (e) {
            console.error("Failed wall", e);
        } finally {
            setLoadingWall(false);
        }
    };

    const handleCreatorSearch = (value: string) => {
        setCreatorSearch(value);
        if (searchDebounce) clearTimeout(searchDebounce);
        const timeout = setTimeout(() => { fetchConfessions(value, tierFilter); }, 400);
        setSearchDebounce(timeout);
    };

    const handleTierFilter = (tier: string) => {
        setTierFilter(tier);
        fetchConfessions(creatorSearch, tier);
    };

    const [myUnlocks, setMyUnlocks] = useState<Set<string>>(new Set());

    const handleOpenConfirm = () => {
        if (!roomId || !reqTopic.trim() || reqAmount <= 0) return;
        setShowConfirmModal(true);
    };

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleConfirmAndPay = async () => {
        if (!roomId) { showToast('Room not found. Please refresh.', 'error'); return; }
        setIsSending(true);

        if (selectedPaymentMethod === 'stripe') {
            setStripeConfig({
                amount: reqAmount,
                confirmUrl: "/api/v1/payments/stripe/confirm-confession-request",
                metadata: { roomId, type: reqType, topic: reqTopic.slice(0, 400), creatorId: null },
                onSuccess: () => {
                    fetchRequests(); setReqTopic(""); setShowConfirmModal(false); showToast("Request Sent! Payment processed.", 'success'); setIsSending(false);
                }
            });
            return;
        }

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/requests`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: reqType, amount: reqAmount, topic: reqTopic, paymentMethod: selectedPaymentMethod })
            });
            const data = await res.json();
            if (data.success) {
                if (data.request) { setRequests(prev => [data.request, ...prev]); } else { fetchRequests(); }
                fetchWallet(); setReqTopic(""); setShowConfirmModal(false); showToast("Request Sent! Payment processed.", 'success');
            } else { showToast("Failed: " + data.error, 'error'); }
        } catch (e) { showToast("Error sending request", 'error'); } finally { setIsSending(false); }
    };

    const handleUnlockPurchase = async () => {
        if (!purchaseConfession) return;
        if (selectedPaymentMethod === 'stripe') {
            setStripeConfig({
                amount: purchaseConfession.price, confirmUrl: "/api/v1/payments/stripe/confirm-confession-unlock", metadata: { confessionId: purchaseConfession.id },
                onSuccess: () => { setMyUnlocks(prev => new Set(prev).add(purchaseConfession.id)); setPurchaseConfession(null); setViewConfession(purchaseConfession); showToast("Confession Unlocked!", 'success'); }
            });
            return;
        }
        try {
            const res = await fetch(`/api/v1/confessions/${purchaseConfession.id}/unlock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentMethod: selectedPaymentMethod }) });
            const data = await res.json();
            if (data.success || data.message === "Already unlocked") {
                setMyUnlocks(prev => new Set(prev).add(purchaseConfession!.id)); setPurchaseConfession(null); setViewConfession(purchaseConfession); showToast("Confession Unlocked!", 'success');
            } else { showToast("Purchase failed: " + data.error, 'error'); }
        } catch (e) { showToast("Payment error", 'error'); }
    };

    const handleApproveDelivery = async (reqId: string) => {
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/requests/${reqId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
            if (res.ok) { setReviewRequest(null); fetchRequests(); showToast("Approved! Funds Released.", 'success'); }
        } catch (e) { }
    };

    const [spinning, setSpinning] = useState(false);
    const [spinDeg, setSpinDeg] = useState(0);
    const handleSpin = () => {
        if (spinning) return;
        setSpinning(true);
        const extra = 1440 + Math.floor(Math.random() * 360);
        setSpinDeg(d => d + extra);
        setTimeout(() => setSpinning(false), 2200);
    };

    const [bids, setBids] = useState([{ id: "b1", name: "Buzzed_Boi", amount: 50 }, { id: "b2", name: "blurredFan1", amount: 25 }]);
    function placeBid(amount: number) {
        setBids((prev) => {
            const next = [...prev];
            const me = next.find((x) => x.id === "me");
            if (me) me.amount += amount; else next.unshift({ id: "me", name: "TopFan?", amount });
            return next.sort((a, b) => b.amount - a.amount);
        });
    }

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <ProtectRoute allowedRoles={["fan", "creator"]}>
            <div className="min-h-screen text-rose-50 font-sans selection:bg-rose-500/30">
                {/* 
                   BACKGROUND: Deep dark red/rose theme with modern noise texture
                */}
                <div className="fixed inset-0 -z-10 bg-[#0f0505]">
                    <div className="absolute top-[-20%] left-[-10%] h-[800px] w-[800px] rounded-full bg-rose-900/15 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-rose-800/15 blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] brightness-100 contrast-150 mix-blend-overlay"></div>
                </div>

                {/* Header */}
                <header className="sticky top-0 z-30 border-b border-rose-500/10 bg-[#0f0505]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0f0505]/60">
                    <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3">
                        <Btn variant="ghost" className="px-3" onClick={() => router.push("/home")}>
                            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
                        </Btn>

                        <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform">
                            <Heart className="h-5 w-5 fill-rose-600 text-rose-500 drop-shadow-[0_0_8px_rgba(225,29,72,0.5)]" />
                            <div className="text-xl font-black tracking-tighter text-white">
                                PlayGround<span className="text-rose-500 drop-shadow-[0_0_10px_rgba(225,29,72,0.5)]">X</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Pill className="px-3 py-1.5 border-amber-500/20 bg-amber-950/20 text-amber-200">
                                <Coins className="h-3 w-3 text-amber-400" />
                                <span className="font-bold">${myWalletBalance}</span>
                            </Pill>
                            <Btn variant="solid" className="px-3 hidden sm:flex">
                                <UserRound className="h-4 w-4" /> Requests
                            </Btn>
                            <Btn variant="ghost" className="px-2">
                                <Menu className="h-5 w-5 text-white/80" />
                            </Btn>
                        </div>
                    </div>
                </header>

                {/* Main grid */}
                <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid gap-6 lg:grid-cols-[280px_1fr_320px] md:grid-cols-[1fr] grid-cols-1">

                        {/* LEFT COLUMN */}
                        <div className="flex flex-col gap-6 order-2 lg:order-1">

                            {/* Spotlight */}
                            <CardShell
                                title="Creator Spotlight"
                                right={<Pill className="bg-red-500 text-white border-none py-0.5 px-2 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]">LIVE</Pill>}
                            >
                                <div className="relative overflow-hidden rounded-2xl border border-rose-500/10 bg-black/60 aspect-[4/5] shadow-inner group cursor-pointer">
                                    <div className="absolute inset-0 bg-gradient-to-t from-rose-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center text-rose-500/30 group-hover:scale-110 transition-transform duration-500">
                                        <Video className="w-16 h-16 drop-shadow-xl" />
                                    </div>
                                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                        <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping absolute opacity-75" />
                                        <div className="h-2.5 w-2.5 rounded-full bg-red-500 relative shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                        <span className="text-sm font-bold text-white drop-shadow-md">Live Now</span>
                                    </div>
                                </div>
                            </CardShell>

                            {/* Countdown */}
                            <CardShell
                                title="Countdown"
                                right={<span className="text-xs font-bold text-amber-300 drop-shadow-sm">${goalTotal} / $250</span>}
                            >
                                <div className="space-y-5">
                                    <ProgressBar value={goalTotal} max={250} />
                                    <div className="flex gap-3 justify-between">
                                        {[5, 10, 25].map(amt => (
                                            <Btn key={amt} variant="ghost" onClick={() => pay(amt)} className="flex-1 text-xs border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/20">
                                                +${amt}
                                            </Btn>
                                        ))}
                                    </div>

                                    <div className="rounded-xl bg-black/20 p-1.5 flex gap-1 border border-rose-500/10">
                                        <button
                                            onClick={() => setIsAnon(false)}
                                            className={cn("flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all duration-300", !isAnon ? "bg-gradient-to-r from-rose-700 to-rose-600 text-white shadow-lg" : "text-rose-100/40 hover:bg-white/5 hover:text-rose-100/70")}
                                        >
                                            👤 Public
                                        </button>
                                        <button
                                            onClick={() => setIsAnon(true)}
                                            className={cn("flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all duration-300", isAnon ? "bg-gradient-to-r from-rose-700 to-rose-600 text-white shadow-lg" : "text-rose-100/40 hover:bg-white/5 hover:text-rose-100/70")}
                                        >
                                            🕵️ Anon
                                        </button>
                                    </div>
                                </div>
                            </CardShell>

                            {/* My Requests (Hidden on mobile initially if empty?) */}
                            <CardShell
                                title="My Requests"
                                right={<Pill>{requests.length} Active</Pill>}
                                className="hidden lg:block"
                            >
                                <div className="space-y-3">
                                    {requests.length === 0 && (
                                        <div className="text-center text-rose-100/40 text-xs py-6 italic">No active requests</div>
                                    )}
                                    {requests.map((r, idx) => (
                                        <div key={r.id || idx} className="rounded-xl border border-rose-500/10 bg-black/20 px-4 py-3 hover:bg-black/40 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="text-xs font-bold text-rose-100 truncate max-w-[140px]">{r.topic}</div>
                                                <span className={cn("text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shadow-sm", r.status === 'delivered' ? "bg-green-500/20 text-green-300" : "bg-amber-500/20 text-amber-300")}>
                                                    {r.status === 'delivered' ? 'Ready' : 'Pending'}
                                                </span>
                                            </div>
                                            {r.status === 'delivered' && (
                                                <Btn variant="rose" className="w-full mt-2 py-1.5 text-xs" onClick={() => setReviewRequest(r)}>Review Delivery</Btn>
                                            )}
                                        </div>
                                    ))}
                                    <div className="mt-5 pt-4 border-t border-rose-500/10">
                                        <div className="text-[10px] font-bold text-rose-100/60 uppercase tracking-widest mb-3">Reactions</div>
                                        <div className="flex gap-2 justify-between">
                                            {["🔥", "💋", "🎁", "💍"].map((emoji, i) => (
                                                <button key={i} className="text-xl hover:scale-125 transition-transform grayscale opacity-50 hover:grayscale-0 hover:opacity-100 active:scale-95">{emoji}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardShell>
                        </div>

                        {/* MIDDLE COLUMN - WALL */}
                        <div className="flex flex-col gap-6 order-3 lg:order-2">
                            <CardShell
                                title="Confession Wall"
                                right={
                                    <div className="flex gap-2">
                                        <Btn variant="chip" className="text-[10px] px-3 h-8" onClick={() => { setIsSearchMode(!isSearchMode) }}>
                                            <Search className="w-3 h-3 mr-1" /> Search
                                        </Btn>
                                        <Btn variant="chip" className="text-[10px] px-3 h-8 bg-rose-600/20 text-rose-200 border-rose-500/30">Tell More $10</Btn>
                                    </div>
                                }
                            >
                                {/* Metrics */}
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-rose-200/60 font-medium mb-5 px-1">
                                    <span className="flex items-center gap-1.5"><Coins className="w-3 h-3 text-amber-400" /> Pot <span className="text-white font-bold text-sm">$265</span></span>
                                    <span className="flex items-center gap-1.5 text-rose-200/40">•</span>
                                    <span className="flex items-center gap-1.5">🎯 Goal</span>
                                    <span className="flex items-center gap-1.5 text-rose-200/40">•</span>
                                    <span className="flex items-center gap-1.5">👥 47 Fans</span>
                                </div>

                                {/* Filters */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {['All', 'Soft', 'Spicy', 'Dirty', 'Dark', 'Forbidden'].map(t => (
                                        <button key={t} onClick={() => handleTierFilter(t)}
                                            className={cn("px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase transition-all duration-300",
                                                tierFilter === t
                                                    ? "bg-rose-600 border-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] scale-105"
                                                    : "bg-transparent border-rose-500/20 text-rose-200/50 hover:border-rose-500/50 hover:text-rose-100")}>
                                            {t === 'All' ? '✨ All' : t}
                                        </button>
                                    ))}
                                </div>

                                {/* Search Input */}
                                {isSearchMode && (
                                    <div className="mb-6 relative animate-in fade-in slide-in-from-top-2">
                                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-rose-400/50" />
                                        <input
                                            type="text"
                                            placeholder="Search creator name or username..."
                                            value={creatorSearch}
                                            onChange={(e) => handleCreatorSearch(e.target.value)}
                                            className="w-full bg-black/40 border border-rose-500/20 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-rose-100/20 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all font-medium"
                                        />
                                    </div>
                                )}

                                {/* Confession List */}
                                <div className="space-y-5">
                                    {loadingWall && <div className="text-center text-rose-100/30 py-12 animate-pulse">Loading confessions...</div>}
                                    {!loadingWall && confessions.length === 0 && <div className="text-center text-rose-100/30 py-12">No confessions found.</div>}

                                    {confessions.map((c) => {
                                        const isUnlocked = myUnlocks.has(c.id);
                                        const fakePot = Math.floor(Math.random() * 200) + 100;
                                        const fakeGoal = fakePot + Math.floor(Math.random() * 200) + 100;

                                        return (
                                            <div key={c.id} className="relative group rounded-3xl border border-rose-500/10 bg-[#0f0406] p-6 hover:border-rose-500/30 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5">

                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center border shadow-inner", isUnlocked ? "bg-rose-950/40 border-rose-500/30 shadow-rose-900/20" : "bg-black/40 border-rose-900/30")}>
                                                            {isUnlocked ? <UserRound className="h-5 w-5 text-rose-400" /> : <Lock className="h-5 w-5 text-rose-700/80" />}
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-bold text-rose-100 group-hover:text-white transition-colors">{c.title}</div>
                                                            {c.creator && <div className="text-[11px] text-rose-100/40 font-medium">@{c.creator.username}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xl font-black text-amber-400 drop-shadow-sm">${fakePot}</div>
                                                        <div className="text-[10px] text-rose-100/40 font-mono tracking-tight text-right">TARGET ${fakeGoal}</div>
                                                    </div>
                                                </div>

                                                <div className={cn("mb-5 text-lg font-serif italic leading-relaxed text-rose-50/90", !isUnlocked && "blur-[6px] opacity-40 select-none grayscale transition-all duration-500 group-hover:blur-[4px] group-hover:opacity-60")}>
                                                    {isUnlocked ? (c.content || c.teaser) : "This is a hidden confession content that is very spicy and extremely secret..."}
                                                </div>

                                                <ProgressBar value={fakePot} max={fakeGoal} />

                                                <div className="flex justify-between items-center mt-3 mb-5">
                                                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                                                        {[1, 2, 3].map(i => <div key={i} className="inline-block h-5 w-5 rounded-full ring-2 ring-black bg-rose-900/20" />)}
                                                        <span className="ml-3 text-[10px] font-bold text-rose-100/50 tracking-wide uppercase">34 Contributors</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 pt-4 border-t border-rose-500/10">
                                                    <div className="flex gap-2">
                                                        <Btn variant="chip" className="text-xs h-9 px-4 hover:scale-105 active:scale-95">+$5</Btn>
                                                        <Btn variant="chip" className="text-xs h-9 px-4 hover:scale-105 active:scale-95">+$10</Btn>
                                                    </div>

                                                    {isUnlocked ? (
                                                        <Btn variant="rose" className="h-10 px-6 shadow-none bg-rose-800/20 border-rose-500/30 hover:bg-rose-700" onClick={() => setViewConfession(c)}>Open</Btn>
                                                    ) : (
                                                        <Btn variant="rose" className="h-10 px-6 shadow-[0_0_20px_rgba(225,29,72,0.3)] animate-pulse hover:animate-none" onClick={() => setPurchaseConfession(c)}>
                                                            <Lock className="w-3.5 h-3.5 mr-2" /> Unlock ${c.price}
                                                        </Btn>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardShell>

                            <CardShell title="Follow-Up Question Bidding">
                                <div className="flex items-center gap-4 p-4 rounded-2xl border border-rose-500/10 bg-black/40 hover:bg-black/60 transition-colors cursor-pointer group">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-sm shadow-lg shrink-0 group-hover:scale-110 transition-transform">🥇</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-white font-bold truncate group-hover:text-rose-200 transition-colors">Who was it? Did/Do you miss them?</div>
                                        <div className="text-[11px] text-rose-100/40 mt-0.5 font-medium">TopFan? · <span className="text-amber-400">$50 Lead</span></div>
                                    </div>
                                    <Btn variant="chip" className="bg-rose-600/20 text-rose-100 border-rose-500/30 text-[10px] px-3 h-8 group-hover:bg-rose-600 group-hover:text-white transition-all" onClick={() => placeBid(5)}>Bid $55</Btn>
                                </div>
                            </CardShell>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex flex-col gap-6 order-1 lg:order-3">

                            {/* Request Form */}
                            <CardShell title="Request Confession" right={<Pill className="border-rose-500/30 text-[9px] bg-rose-500/10">Custom</Pill>}>
                                <div className="space-y-6">
                                    {/* Tabs */}
                                    <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-rose-500/10">
                                        {['Text', 'Audio', 'Video'].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setReqType(type as any)}
                                                className={cn("flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all duration-300",
                                                    reqType === type ? "bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-lg" : "text-rose-100/40 hover:bg-white/5 hover:text-white")}
                                            >
                                                {type === 'Text' && <MessageSquareText className="w-3.5 h-3.5" />}
                                                {type === 'Audio' && <Mic className="w-3.5 h-3.5" />}
                                                {type === 'Video' && <Video className="w-3.5 h-3.5" />}
                                                {type}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Amount */}
                                    <div>
                                        <div className="text-[10px] font-extrabold text-rose-100/40 uppercase tracking-widest mb-2 ml-1">My Offer</div>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-100/30 font-bold group-focus-within:text-rose-500 transition-colors">$</div>
                                            <input
                                                type="number"
                                                value={reqAmount}
                                                onChange={e => setReqAmount(Number(e.target.value))}
                                                className="w-full bg-black/40 border border-rose-500/20 rounded-2xl pl-8 pr-4 py-3.5 text-xl font-black text-white focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Topic */}
                                    <div>
                                        <div className="text-[10px] font-extrabold text-rose-100/40 uppercase tracking-widest mb-2 ml-1">Topic Prompt</div>
                                        <textarea
                                            value={reqTopic}
                                            onChange={e => setReqTopic(e.target.value)}
                                            placeholder="What should they confess?"
                                            className="w-full h-32 bg-black/40 border border-rose-500/20 rounded-2xl p-4 text-sm text-white placeholder:text-rose-100/20 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none transition-all leadling-relaxed"
                                        />
                                    </div>

                                    {/* Visibility */}
                                    <div>
                                        <div className="text-[10px] font-extrabold text-rose-100/40 uppercase tracking-widest mb-2 ml-1">Identity</div>
                                        <div className="flex gap-3">
                                            <button onClick={() => setIsAnon(false)} className={cn("flex-1 py-3 rounded-2xl border text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2", !isAnon ? "bg-rose-500/10 border-rose-500/60 text-white shadow-[0_0_15px_rgba(225,29,72,0.15)]" : "bg-black/20 border-rose-500/10 text-rose-100/40 hover:bg-white/5")}>
                                                <UserRound className="w-3.5 h-3.5" /> Public
                                            </button>
                                            <button onClick={() => setIsAnon(true)} className={cn("flex-1 py-3 rounded-2xl border text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2", isAnon ? "bg-rose-500/10 border-rose-500/60 text-white shadow-[0_0_15px_rgba(225,29,72,0.15)]" : "bg-black/20 border-rose-500/10 text-rose-100/40 hover:bg-white/5")}>
                                                <span className="text-sm">🎭</span> Anon
                                            </button>
                                        </div>
                                    </div>

                                    <Btn variant="rose" onClick={handleOpenConfirm} disabled={isSending} className="w-full py-4 text-sm shadow-[0_8px_25px_rgba(225,29,72,0.35)] hover:shadow-[0_12px_35px_rgba(225,29,72,0.5)] active:scale-[0.98]">
                                        🚀 Send Request
                                    </Btn>
                                </div>
                            </CardShell>

                            {/* Random Wheel - Enhanced Deluxe UI */}
                            <CardShell title="Random Confession" right={<Pill className="bg-amber-500/10 text-amber-200 border-amber-500/20 shadow-none">$8</Pill>}>
                                <div className="relative flex flex-col items-center">
                                    {/* Gold/Coin Particles Background (Simple CSS implementation) */}
                                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                        <div className="absolute top-2 left-4 text-xs animate-bounce delay-700 opacity-60">💰</div>
                                        <div className="absolute top-10 right-2 text-xs animate-pulse delay-300 opacity-50">✨</div>
                                        <div className="absolute bottom-4 left-2 text-xs animate-ping delay-500 opacity-40">🪙</div>
                                        <div className="absolute top-1/3 left-1 text-[8px] text-amber-300 animate-spin-slow opacity-30">✦</div>
                                    </div>

                                    <div className="relative w-48 h-48 my-6 group perspective-[1000px]">
                                        {/* Outer Glow Ring */}
                                        <div className="absolute inset-[-10px] rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 blur-xl animate-pulse-slow pointer-events-none" />

                                        {/* The Wheel */}
                                        <div
                                            className="w-full h-full rounded-full border-[6px] border-[#d4af37] shadow-[0_0_40px_rgba(212,175,55,0.4),inset_0_0_20px_rgba(0,0,0,0.5)] overflow-hidden transition-transform duration-[3s] ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform relative z-10"
                                            style={{
                                                transform: `rotate(${spinDeg}deg)`,
                                                background: "conic-gradient(from 0deg, #b91c1c 0deg 60deg, #991b1b 60deg 120deg, #b91c1c 120deg 180deg, #991b1b 180deg 240deg, #b91c1c 240deg 300deg, #991b1b 300deg 360deg)"
                                            }}
                                        >
                                            {/* Wheel Segments Overlays/Texture */}
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.4)_100%)]" />
                                            {/* Divider Lines */}
                                            {[0, 60, 120, 180, 240, 300].map(deg => (
                                                <div key={deg} className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-[#d4af37]/60 origin-bottom" style={{ transform: `translateX(-50%) rotate(${deg}deg)` }} />
                                            ))}
                                        </div>

                                        {/* Center Peg */}
                                        <div className="absolute inset-0 m-auto w-16 h-16 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 rounded-full flex items-center justify-center border-4 border-[#5b2c08] shadow-[0_4px_10px_rgba(0,0,0,0.6)] z-20">
                                            <div className="text-center leading-none">
                                                <div className="text-[9px] font-bold text-[#3f1d04] uppercase">Spin</div>
                                                <div className="text-lg font-black text-white drop-shadow-md">$8</div>
                                            </div>
                                        </div>

                                        {/* Indicator Triangle */}
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-lg">
                                            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-amber-400" />
                                        </div>
                                    </div>

                                    <div className="text-center relative z-10">
                                        <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-200 mb-2 tracking-wide drop-shadow-sm">Unlock a Secret</div>
                                        <div className="text-[10px] text-rose-200/50 mb-4 px-4 leading-tight">Spin to get a random confession at a discounted price!</div>

                                        <Btn variant="solid" onClick={handleSpin} disabled={spinning} className="w-full bg-gradient-to-r from-amber-700 to-amber-600 border-amber-500/30 text-amber-50 hover:from-amber-600 hover:to-amber-500 shadow-[0_4px_15px_rgba(245,158,11,0.3)] h-11 text-sm uppercase tracking-wider font-extrabold group-hover:scale-105 transition-transform">
                                            {spinning ? "Spinning..." : "🎰 Spin Now"}
                                        </Btn>
                                    </div>
                                </div>
                            </CardShell>
                        </div>
                    </div>
                </main>

                {/* ── MODALS (Stripe, Toast, Confirm, Unlock, View, Review) ── */}
                {/* Same logic, just modernized styles */}

                {/* Stripe Modal */}
                {stripeConfig && (
                    <StripePaymentModal
                        amount={stripeConfig.amount}
                        onClose={() => { setStripeConfig(null); setIsSending(false); }}
                        onSuccess={() => { stripeConfig.onSuccess(); setStripeConfig(null); }}
                        confirmUrl={stripeConfig.confirmUrl}
                        metadata={stripeConfig.metadata}
                    />
                )}

                {/* Toast */}
                {toast && (
                    <div className="fixed bottom-10 left-1/2 z-[70] -translate-x-1/2 px-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className={cn("flex items-center gap-3 rounded-2xl border px-6 py-4 text-sm backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] font-bold",
                            toast.type === 'success' ? "border-green-500/30 bg-[#0a200f]/90 text-green-400" : "border-red-500/30 bg-[#2b0808]/90 text-red-400")}>
                            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            {toast.message}
                        </div>
                    </div>
                )}

                {/* ── MODAL: Confirm Request ── */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-[360px] rounded-[32px] border border-rose-500/20 bg-[#120205] p-6 shadow-[0_0_50px_rgba(225,29,72,0.25)] relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-rose-900/10 to-transparent pointer-events-none" />
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                                    <h3 className="text-lg font-black text-white tracking-tight">Confirm Request</h3>
                                    <button onClick={() => setShowConfirmModal(false)} className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"><X className="w-4 h-4" /></button>
                                </div>

                                <div className="bg-black/20 rounded-2xl p-4 border border-white/5 mb-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] text-rose-200/40 uppercase tracking-widest font-extrabold">Message</span>
                                        <span className="text-[10px] font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">{reqType}</span>
                                    </div>
                                    <div className="text-rose-50 font-medium italic text-sm leading-relaxed">"{reqTopic}"</div>
                                </div>

                                <div className="flex items-center justify-between mb-6 px-1">
                                    <span className="text-sm font-medium text-rose-200/60">Total to pay</span>
                                    <span className="text-2xl font-black text-white tracking-tight">${reqAmount}</span>
                                </div>

                                <Btn variant="rose" onClick={handleConfirmAndPay} disabled={isSending} className="w-full py-4 text-sm rounded-2xl shadow-lg">
                                    {isSending ? "Processing..." : "Confirm & Pay"}
                                </Btn>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODAL: Unlock Confession ── */}
                {purchaseConfession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-[360px] rounded-[32px] border border-rose-500/20 bg-[#120205] p-6 shadow-[0_0_50px_rgba(225,29,72,0.25)] relative text-center">
                            <button onClick={() => setPurchaseConfession(null)} className="absolute top-5 right-5 h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10"><X className="w-4 h-4" /></button>
                            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30 text-rose-400 mb-4"><Lock className="w-5 h-5" /></div>
                            <h3 className="text-xl font-black text-white mb-2">Unlock Confession</h3>
                            <p className="text-rose-200/60 text-sm mb-8 px-4">See the full spicy details of this secret.</p>
                            <Btn variant="rose" onClick={handleUnlockPurchase} className="w-full py-4 rounded-2xl shadow-lg">
                                Pay ${purchaseConfession.price} to Unlock
                            </Btn>
                        </div>
                    </div>
                )}

                {/* ── MODAL: View Confession ── */}
                {viewConfession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in zoom-in-95 duration-200">
                        <div className="w-full max-w-lg rounded-[32px] border border-rose-500/20 bg-[#120205] p-8 shadow-2xl relative">
                            <button onClick={() => setViewConfession(null)} className="absolute top-6 right-6 h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10"><X className="w-4 h-4" /></button>
                            <h3 className="text-2xl font-black text-white mb-1.5">{viewConfession.title}</h3>
                            <Pill className="mb-6 bg-green-500/10 text-green-400 border-green-500/20 animate-pulse">Unlocked Secret</Pill>

                            <div className="text-lg font-serif font-medium italic text-rose-50/90 leading-loose border-l-2 border-rose-500/30 pl-6 py-2">
                                {viewConfession.content || viewConfession.teaser}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODAL: Review Delivery ── */}
                {reviewRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
                        <div className="w-full max-w-lg rounded-[32px] border border-rose-500/20 bg-[#120205] p-8 relative">
                            <button onClick={() => setReviewRequest(null)} className="absolute top-6 right-6 text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                            <h3 className="text-xl font-black text-green-400 mb-6 flex items-center gap-2"><Check className="w-6 h-6" /> Review Delivery</h3>
                            <div className="bg-black/30 rounded-2xl p-6 border border-white/5 mb-6 text-center">
                                <p className="text-rose-100 text-lg">{reviewRequest.delivery_content}</p>
                            </div>
                            <Btn variant="solid" onClick={() => handleApproveDelivery(reviewRequest.id)} className="w-full py-4 bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30 rounded-2xl font-black">
                                Approve & Release Funds
                            </Btn>
                        </div>
                    </div>
                )}

            </div>
        </ProtectRoute>
    );
}
