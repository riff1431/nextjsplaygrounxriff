"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    ArrowLeft, Lock, Search, Heart, Flame, Sparkles, Eye, EyeOff,
    MessageSquareText, Mic, Video, RefreshCw, ChevronRight, User, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import WalletPill from "@/components/common/WalletPill";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";


/* ─── Types ─────────────────────────────────────────────────── */
interface ActiveConfession {
    id: string;
    tier: string;
    title: string;
    teaser: string;
    content?: string;
    media_url?: string;
    type: "Text" | "Voice" | "Video";
    price: number;
    creator?: {
        id: string;
        full_name?: string;
        username?: string;
        avatar_url?: string;
    } | null;
    created_at?: string;
    room_id?: string;
}

/* ─── Constants ─────────────────────────────────────────────── */
const TIERS = ["All", "Spicy", "Dirty", "Bedroom", "Forbidden"];

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    All:       { bg: "bg-white/10", text: "text-white", border: "border-white/20", glow: "" },
    Spicy:     { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/30", glow: "shadow-[0_0_12px_rgba(249,115,22,0.3)]" },
    Dirty:     { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/30", glow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]" },
    Bedroom:   { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30", glow: "shadow-[0_0_12px_rgba(168,85,247,0.3)]" },
    Forbidden: { bg: "bg-rose-900/30", text: "text-rose-300", border: "border-rose-500/40", glow: "shadow-[0_0_16px_rgba(244,63,94,0.4)]" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
    Text:  <MessageSquareText className="w-3 h-3" />,
    Voice: <Mic className="w-3 h-3" />,
    Video: <Video className="w-3 h-3" />,
};

function cn(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

/* ─── Confession Card ────────────────────────────────────────── */
function ConfessionCard({
    confession,
    isUnlocked,
    onUnlock,
}: {
    confession: ActiveConfession;
    isUnlocked: boolean;
    onUnlock: (c: ActiveConfession) => void;
}) {
    const tier = TIER_COLORS[confession.tier] ?? TIER_COLORS["Spicy"];
    const [isViewing, setIsViewing] = useState(false);

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border bg-black/40 backdrop-blur-md",
                "transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group",
                tier.border,
                tier.glow
            )}
        >
            {/* Top accent gradient */}
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />

            {/* Tier Badge */}
            <div className="p-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border", tier.bg, tier.text, tier.border)}>
                        {confession.tier} {confession.type !== "Text" && <span className="ml-1 opacity-70">{confession.type}</span>}
                    </span>
                    <div className="flex items-center gap-1.5 text-white/40">
                        {TYPE_ICONS[confession.type]}
                        <span className="text-[10px]">{confession.type}</span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-white font-bold text-sm leading-snug mb-2 line-clamp-2">
                    {confession.title}
                </h3>

                {/* Teaser / Content */}
                <p className="text-white/50 text-xs leading-relaxed line-clamp-3 mb-4">
                    {isUnlocked || isViewing ? (confession.content || confession.teaser) : confession.teaser}
                    {!isUnlocked && !isViewing && (
                        <span className="ml-1 text-rose-400/60">...</span>
                    )}
                </p>

                {/* Creator */}
                {confession.creator && (
                    <div className="flex items-center gap-2 mb-4">
                        {confession.creator.avatar_url ? (
                            <img
                                src={confession.creator.avatar_url}
                                alt=""
                                className="w-5 h-5 rounded-full object-cover border border-white/10"
                            />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                                <User className="w-3 h-3 text-rose-300" />
                            </div>
                        )}
                        <span className="text-white/40 text-[11px]">
                            {confession.creator.full_name || confession.creator.username || "Creator"}
                        </span>
                    </div>
                )}

                {/* Action Row */}
                <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold text-sm">
                        ${confession.price}
                    </span>

                    {isUnlocked ? (
                        <button
                            onClick={() => setIsViewing(v => !v)}
                            className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl transition hover:bg-emerald-500/20"
                        >
                            {isViewing ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {isViewing ? "Hide" : "View"}
                        </button>
                    ) : (
                        <button
                            onClick={() => onUnlock(confession)}
                            className="inline-flex items-center gap-1.5 text-white text-xs font-bold bg-gradient-to-r from-rose-600 to-rose-700 border border-rose-500/30 px-3 py-1.5 rounded-xl transition hover:brightness-110 shadow-[0_4px_14px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.45)]"
                        >
                            <Lock className="w-3 h-3" />
                            Unlock
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Skeleton Card ─────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div className="rounded-2xl border border-white/5 bg-black/30 p-4 animate-pulse">
            <div className="h-4 w-20 bg-white/10 rounded-full mb-3" />
            <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
            <div className="h-3 w-full bg-white/5 rounded mb-1" />
            <div className="h-3 w-5/6 bg-white/5 rounded mb-4" />
            <div className="flex justify-between">
                <div className="h-5 w-12 bg-white/10 rounded" />
                <div className="h-7 w-20 bg-rose-500/20 rounded-xl" />
            </div>
        </div>
    );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function FanConfessionsBrowsePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { balance: walletBalance } = useWallet();

    const [confessions, setConfessions] = useState<ActiveConfession[]>([]);
    const [loading, setLoading] = useState(true);
    const [tier, setTier] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [myUnlocks, setMyUnlocks] = useState<Set<string>>(new Set());
    const [unlockTarget, setUnlockTarget] = useState<ActiveConfession | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);


    /* Fetch confessions */
    const fetchConfessions = useCallback(async (q: string, t: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (q.trim()) params.set("q", q.trim());
            if (t !== "All") params.set("tier", t);
            const res = await fetch(`/api/v1/confessions/search?${params.toString()}`);
            const data = await res.json();
            if (data.confessions) {
                const mapped: ActiveConfession[] = data.confessions.map((c: any) => ({
                    id: c.id,
                    tier: c.tier || "Spicy",
                    title: c.title || "Untitled Confession",
                    teaser: c.teaser || c.title || "",
                    content: c.content,
                    media_url: c.media_url,
                    type: c.type || "Text",
                    price: c.price || 5,
                    creator: c.creator || null,
                    created_at: c.created_at,
                    room_id: c.room_id,
                }));
                setConfessions(mapped);
            } else {
                setConfessions([]);
            }
        } catch (e) {
            console.error("Failed to fetch confessions", e);
            setConfessions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    /* Initial fetch + real-time */
    useEffect(() => {
        fetchConfessions(searchQuery, tier);

        const supabase = createClient();
        const channel = supabase
            .channel("fan-confessions-browse")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "confessions",
            }, () => {
                fetchConfessions(searchQuery, tier);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [tier, searchQuery]);

    const handleSearch = (val: string) => {
        setSearchInput(val);
        if (debounceTimer) clearTimeout(debounceTimer);
        const t = setTimeout(() => setSearchQuery(val), 400);
        setDebounceTimer(t);
    };

    const handleTierChange = (t: string) => {
        setTier(t);
    };

    /* Unlock flow */
    const handleUnlockConfirm = async () => {
        if (!unlockTarget || !user) return;
        setIsConfirming(true);
        try {
            // Find the room ID from confession or look it up
            const roomId = unlockTarget.room_id;
            if (!roomId) {
                alert("Room not available.");
                return;
            }
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/unlock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confessionId: unlockTarget.id }),
            });
            const data = await res.json();
            if (data.success || data.message === "Already unlocked") {
                setMyUnlocks(prev => new Set(prev).add(unlockTarget.id));
                setUnlockTarget(null);
            } else {
                alert("Unlock failed: " + (data.error || "Unknown error"));
            }
        } catch (e) {
            alert("Network error");
        } finally {
            setIsConfirming(false);
        }
    };

    /* Stats */
    const softCount = confessions.filter(c => c.tier === "Soft").length;
    const spicyCount = confessions.filter(c => c.tier === "Spicy").length;
    const darkCount = confessions.filter(c => ["Dirty", "Dark", "Forbidden"].includes(c.tier)).length;

    return (
        <ProtectRoute allowedRoles={["fan", "creator"]}>
            <div className="min-h-screen bg-[#0a0005] relative text-white font-sans">

                {/* ── BG ─────────────────────────────────────────────── */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    {/* Flames background image */}
                    <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{
                        backgroundImage: "url('/assets/bg-flames.png')"
                    }} />
                    {/* Dark overlay for readability */}
                    <div className="absolute inset-0 bg-black/50" />
                    {/* Ambient glows */}
                    <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-rose-900/15 blur-[120px]" />
                    <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-purple-900/10 blur-[100px]" />
                    <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] rounded-full bg-rose-950/15 blur-[90px]" />
                </div>

                <div className="relative z-10">
                    {/* ── HEADER ─────────────────────────────────────── */}
                    <header className="sticky top-0 z-30 border-b border-rose-500/10 bg-black/60 backdrop-blur-xl">
                        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
                            <button
                                onClick={() => router.push("/home")}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold transition-all border border-white/10 hover:border-white/20"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Back</span>
                            </button>

                            <div className="flex items-center gap-2.5">
                                {/* Animated heart icon */}
                                <div className="relative">
                                    <div className="absolute inset-0 bg-rose-500/30 rounded-full blur-lg animate-pulse" />
                                    <Heart className="relative w-5 h-5 text-rose-400 fill-rose-500/40" />
                                </div>
                                <div>
                                    <h1 className="text-base font-black tracking-tight leading-none">
                                        Confessions
                                        <span className="text-rose-400 ml-1">Wall</span>
                                    </h1>
                                    <p className="text-[10px] text-white/30 mt-0.5">Active secrets from your creators</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <WalletPill />
                                <button
                                    onClick={() => fetchConfessions(searchQuery, tier)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition border border-white/10"
                                    title="Refresh"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

                        {/* ── Enter Session CTA (Top) ────────────────── */}
                        <div className="mb-8 rounded-3xl border border-rose-500/15 bg-gradient-to-br from-rose-950/40 via-black/40 to-purple-950/30 p-8 text-center backdrop-blur-sm">
                            <div className="flex justify-center mb-4 gap-2">
                                <Heart className="w-5 h-5 text-rose-400 fill-rose-500/30 animate-pulse" />
                                <Flame className="w-5 h-5 text-orange-400" />
                            </div>
                            <h3 className="text-white font-black text-lg mb-2">Want to make your own confession?</h3>
                            <p className="text-white/40 text-sm mb-5 max-w-sm mx-auto">
                                Join a live creator session and send your private confession directly.
                            </p>
                            <button
                                onClick={() => router.push("/rooms/confessions-sessions")}
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:brightness-110 text-white font-bold px-6 py-3 rounded-2xl border border-rose-500/30 shadow-[0_4px_20px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_28px_rgba(225,29,72,0.45)] transition"
                            >
                                <Heart className="w-4 h-4" />
                                Browse Live Sessions
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* ── HERO STATS ─────────────────────────────── */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[
                                { label: "Soft & Spicy", count: softCount + spicyCount, icon: <Sparkles className="w-4 h-4" />, color: "text-pink-300", bg: "bg-pink-500/10", border: "border-pink-500/20" },
                                { label: "Dark & Dirty", count: darkCount, icon: <Flame className="w-4 h-4" />, color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/20" },
                                { label: "Total Active", count: confessions.length, icon: <Lock className="w-4 h-4" />, color: "text-purple-300", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                            ].map((stat) => (
                                <div key={stat.label} className={cn("rounded-2xl border p-3 text-center", stat.bg, stat.border)}>
                                    <div className={cn("flex items-center justify-center gap-1 mb-1", stat.color)}>
                                        {stat.icon}
                                        <span className="text-xl font-black">{loading ? "–" : stat.count}</span>
                                    </div>
                                    <p className="text-[10px] text-white/40 font-medium">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── SEARCH + FILTERS ───────────────────────── */}
                        <div className="mb-6 space-y-3">
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Search by creator name…"
                                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rose-500/50 focus:bg-white/8 transition"
                                />
                                {searchInput && (
                                    <button
                                        onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Tier Filters (scrollable) */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-scrollbar:none]">
                                {TIERS.map(t => {
                                    const tc = TIER_COLORS[t];
                                    const isActive = tier === t;
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => handleTierChange(t)}
                                            className={cn(
                                                "shrink-0 text-xs font-bold px-4 py-1.5 rounded-full border transition-all",
                                                isActive
                                                    ? cn(tc.bg, tc.text, tc.border, tc.glow, "scale-105")
                                                    : "bg-white/5 text-white/40 border-white/10 hover:text-white/70 hover:bg-white/8"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── CONFESSION GRID ─────────────────────────── */}
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : confessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="relative mb-6">
                                    <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
                                        <Lock className="w-8 h-8 text-rose-400/40" />
                                    </div>
                                    <div className="absolute inset-0 rounded-full bg-rose-500/5 blur-2xl animate-pulse" />
                                </div>
                                <h2 className="text-white/60 text-lg font-bold mb-2">No Confessions Found</h2>
                                <p className="text-white/30 text-sm max-w-xs">
                                    {searchInput ? `No confessions match "${searchInput}". Try a different creator name.` : "No active confessions published yet. Check back soon!"}
                                </p>
                                {searchInput && (
                                    <button
                                        onClick={() => { setSearchInput(""); setSearchQuery(""); setTier("All"); }}
                                        className="mt-6 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-sm font-bold border border-rose-500/20 transition"
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-white/40 text-sm">
                                        <span className="text-white font-bold">{confessions.length}</span>{" "}
                                        {tier !== "All" ? `${tier} ` : ""}confession{confessions.length !== 1 ? "s" : ""}
                                    </p>
                                    <button
                                        onClick={() => router.push("/rooms/confessions")}
                                        className="inline-flex items-center gap-1.5 text-rose-400 text-xs font-bold hover:text-rose-300 transition"
                                    >
                                        Enter Room
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {confessions.map(c => (
                                        <ConfessionCard
                                            key={c.id}
                                            confession={c}
                                            isUnlocked={myUnlocks.has(c.id)}
                                            onUnlock={setUnlockTarget}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </main>
                </div>

                {/* ── UNLOCK MODAL ────────────────────────────────── */}
                <SpendConfirmModal
                    isOpen={!!unlockTarget}
                    onClose={() => setUnlockTarget(null)}
                    title="Unlock Confession"
                    itemLabel={unlockTarget?.title || "Secret Confession"}
                    description={`Unlock this ${unlockTarget?.tier?.toLowerCase() || "secret"} confession and see the full details.`}
                    amount={unlockTarget?.price || 0}
                    walletBalance={walletBalance}
                    onConfirm={handleUnlockConfirm}
                />


            </div>
        </ProtectRoute>
    );
}
