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

import FloatingHearts from "@/components/rooms/confessions/FloatingHearts";
import CreatorSpotlight from "@/components/rooms/confessions/CreatorSpotlight";
import MyRequests from "@/components/rooms/confessions/MyRequests";
import ConfessionWall from "@/components/rooms/confessions/ConfessionWall";
import RequestConfession from "@/components/rooms/confessions/RequestConfession";
import RandomConfession from "@/components/rooms/confessions/RandomConfession";

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
            <div className="min-h-screen relative text-foreground font-sans selection:bg-primary/30">
                {/* BACKGROUND */}
                <div className="fixed inset-0 z-0 bg-background pointer-events-none">
                    <img src="/confessions/bg-flames.png" alt="" className="w-full h-full object-cover opacity-[0.85] mix-blend-screen" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/60 to-transparent" />
                </div>
                <FloatingHearts />

                <div className="relative z-10">
                    {/* Header */}
                    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
                        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3">
                            <button className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-secondary hover:bg-secondary/80 text-sm font-bold transition-all" onClick={() => router.push("/home")}>
                                <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
                            </button>

                            <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform">
                                <Heart className="h-5 w-5 fill-primary text-primary drop-shadow-[0_0_8px_rgba(255,42,109,0.5)]" />
                                <div className="text-xl font-black tracking-tighter text-foreground font-display">
                                    PlayGround<span className="text-primary drop-shadow-[0_0_10px_rgba(255,42,109,0.5)]">X</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-1.5 text-xs font-bold text-amber-200 backdrop-blur-md shadow-inner">
                                    <Coins className="h-3.5 w-3.5 text-amber-400" />
                                    <span>${myWalletBalance}</span>
                                </div>
                                <button className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-secondary hover:bg-secondary/80 text-sm font-bold transition-all hidden sm:flex border border-transparent hover:border-border/50">
                                    <UserRound className="h-4 w-4 text-primary" /> Requests
                                </button>
                                <button className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-transparent hover:bg-secondary/80 transition-all text-foreground/80 hover:text-foreground">
                                    <Menu className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Main grid */}
                    <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6">

                            {/* Left Column */}
                            <div className="space-y-4 xl:space-y-6 lg:min-w-[280px]">
                                <CreatorSpotlight
                                    goalTotal={goalTotal}
                                    pay={pay}
                                    isAnon={isAnon}
                                    setIsAnon={setIsAnon}
                                />
                                <MyRequests
                                    requests={requests}
                                    setReviewRequest={setReviewRequest}
                                />
                            </div>

                            {/* Center Column - wider */}
                            <div className="lg:col-span-2 space-y-4 xl:space-y-6 w-full max-w-full">
                                <ConfessionWall
                                    confessions={confessions}
                                    myUnlocks={myUnlocks}
                                    loadingWall={loadingWall}
                                    tierFilter={tierFilter}
                                    handleTierFilter={handleTierFilter}
                                    setViewConfession={setViewConfession}
                                    setPurchaseConfession={setPurchaseConfession}
                                />
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4 xl:space-y-6 lg:min-w-[320px]">
                                <RequestConfession
                                    reqType={reqType}
                                    setReqType={setReqType}
                                    reqAmount={reqAmount}
                                    setReqAmount={setReqAmount}
                                    reqTopic={reqTopic}
                                    setReqTopic={setReqTopic}
                                    isAnon={isAnon}
                                    setIsAnon={setIsAnon}
                                    handleOpenConfirm={handleOpenConfirm}
                                    isSending={isSending}
                                />
                                <RandomConfession
                                    onSpinComplete={() => { showToast('Random Secret Unlocked!', 'success') }}
                                />
                            </div>
                        </div>
                    </main>
                </div>

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
