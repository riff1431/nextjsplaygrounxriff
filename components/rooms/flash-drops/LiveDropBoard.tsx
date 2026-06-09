"use client";

import { useState, useEffect, useCallback } from "react";
import { Image, Video, Play, Lock, Unlock, X, Expand, Download } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import { cs } from "@/utils/currency";
import { AnimatePresence, motion } from "framer-motion";

interface FlashDrop {
    id: string;
    title: string;
    kind: string;
    rarity: "Common" | "Rare" | "Epic" | "Legendary";
    price: number;
    ends_at: string;
    status: string;
    inventory_remaining: number;
    inventory_total: number;
    media_url?: string;
}

const rarityColor: Record<string, string> = {
    Common: "text-pink-300",
    Rare: "text-yellow-300",
    Epic: "text-orange-400",
    Legendary: "text-red-400",
};

function formatCountdown(endsAt: string): string {
    const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
    if (diff === 0) return "ENDED";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function isLimitedTime(endsAt: string): boolean {
    const diff = (new Date(endsAt).getTime() - Date.now()) / 1000;
    return diff > 0 && diff < 300; // under 5 minutes
}

interface LiveDropBoardProps {
    roomId: string | null;
    onSpend?: (amount: number, msg: string) => void;
    drops: FlashDrop[];
    loading: boolean;
}

export default function LiveDropBoard({ roomId, onSpend, drops, loading }: LiveDropBoardProps) {
    const supabase = createClient();
    const { user } = useAuth();
    const [activeFilter, setActiveFilter] = useState<"all" | "photos" | "videos">("all");
    const [, setTick] = useState(0);
    const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
    const [unlockingId, setUnlockingId] = useState<string | null>(null);
    const [viewingDrop, setViewingDrop] = useState<FlashDrop | null>(null);

    // Tick every second to update countdown display
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    // Fetch user's unlocked drops
    const fetchUnlocked = useCallback(async () => {
        if (!roomId || !user) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/flash-drops/unlocks`);
            if (res.ok) {
                const data = await res.json();
                if (data.unlocks) {
                    setUnlockedIds(new Set(data.unlocks));
                }
            }
        } catch (error) {
            console.error("Failed to fetch unlocks:", error);
        }
    }, [roomId, user]);

    useEffect(() => {
        if (!roomId) return;
        fetchUnlocked();

        const channel = supabase
            .channel(`fan-unlocks-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "flash_drop_unlocks",
                filter: `user_id=eq.${user?.id}`,
            }, fetchUnlocked)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchUnlocked, user?.id]);

    // Handle unlock: instant deduction from wallet, credit to creator
    const handleUnlock = async (drop: FlashDrop) => {
        if (!roomId || unlockingId) return;
        setUnlockingId(drop.id);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/flash-drops/unlock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dropId: drop.id }),
            });
            const data = await res.json();
            if (data.success) {
                setUnlockedIds(prev => new Set([...prev, drop.id]));
                if (data.alreadyUnlocked) {
                    toast.info(`Already unlocked "${drop.title}"`);
                } else {
                    toast.success(`🔓 Unlocked "${drop.title}" for ${cs()}${drop.price}!`);
                }
            } else {
                toast.error(data.error || "Failed to unlock");
            }
        } catch {
            toast.error("Network error");
        }
        setUnlockingId(null);
    };

    const filteredDrops = drops.filter(drop => {
        if (activeFilter === "photos") return drop.kind === "Photo";
        if (activeFilter === "videos") return drop.kind === "Video";
        return true;
    });

    return (
        <>
        <div className="fd-glass-panel fd-neon-border-md rounded-xl p-3 flex flex-col">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="fd-font-tech text-xl font-bold text-foreground">Live Drop Board</h2>
                {(["all", "photos", "videos"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveFilter(tab)}
                        className={`px-2 py-0.5 rounded text-xs fd-font-body font-semibold border transition-all ${activeFilter === tab
                            ? "fd-neon-border bg-primary/20 fd-neon-text"
                            : "border-foreground/30 text-foreground/60 hover:border-primary/50"
                            }`}
                    >
                        {tab === "all" ? "All" : tab === "photos" ? "Photos" : "Videos"}
                    </button>
                ))}
            </div>

            {/* Loading / Empty state */}
            {!roomId && (
                <p className="text-center text-foreground/40 text-xs py-4">Connecting to session...</p>
            )}
            {roomId && loading && (
                <p className="text-center text-foreground/40 text-xs py-4">Loading drops...</p>
            )}
            {roomId && !loading && drops.length === 0 && (
                <div className="text-center text-foreground/40 text-xs py-4">
                    <p>⚡ Waiting for the creator to drop something amazing...</p>
                </div>
            )}
            {roomId && !loading && drops.length > 0 && filteredDrops.length === 0 && (
                <p className="text-center text-foreground/40 text-xs py-4">No drops match this filter.</p>
            )}

            {/* Grid of drops */}
            {filteredDrops.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filteredDrops.map((drop) => {
                        const isPaid = drop.price > 0;
                        const isUnlocked = unlockedIds.has(drop.id);
                        const isLocked = isPaid && !isUnlocked;
                        const isUnlocking = unlockingId === drop.id;

                        return (
                            <button
                                key={drop.id}
                                onClick={() => {
                                    if (isLocked) {
                                        handleUnlock(drop);
                                    } else if (drop.media_url) {
                                        setViewingDrop(drop);
                                    }
                                }}
                                disabled={isUnlocking}
                                className={`text-left rounded-xl border bg-black/40 transition-all group overflow-hidden flex flex-col ${isLocked
                                    ? "border-primary/40 hover:border-primary/80 cursor-pointer hover:shadow-[0_0_20px_hsl(330_100%_55%/0.3)]"
                                    : drop.media_url
                                        ? "border-primary/25 cursor-pointer hover:border-primary/50 hover:shadow-[0_0_15px_hsl(330_100%_55%/0.15)]"
                                        : "border-primary/25 cursor-default"
                                    }`}
                            >
                                {/* Media thumbnail */}
                                {drop.media_url ? (
                                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-black/60">
                                        {drop.kind === "Video" ? (
                                            <>
                                                <video
                                                    src={drop.media_url}
                                                    className={`w-full h-full object-cover transition-all duration-300 ${isLocked ? "blur-lg scale-110" : ""}`}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                />
                                                {!isLocked && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                        <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center shadow-[0_0_15px_hsl(330_100%_55%/0.5)]">
                                                            <Play size={10} className="text-white ml-0.5" fill="white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <img
                                                src={drop.media_url}
                                                alt={drop.title}
                                                className={`w-full h-full object-cover transition-all duration-300 ${isLocked ? "blur-lg scale-110" : "group-hover:scale-105"}`}
                                            />
                                        )}

                                        {/* Lock overlay for paid locked drops */}
                                        {isLocked && (
                                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-1">
                                                {isUnlocking ? (
                                                    <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                                ) : (
                                                    <>
                                                        <div className="w-8 h-8 rounded-full bg-primary/30 border border-primary/60 flex items-center justify-center shadow-[0_0_20px_hsl(330_100%_55%/0.4)]">
                                                            <Lock size={12} className="text-primary drop-shadow-[0_0_6px_hsl(330_100%_55%)]" />
                                                        </div>
                                                        <span className="text-[8px] font-black fd-font-tech text-primary tracking-wider drop-shadow-[0_0_6px_hsl(330_100%_55%/0.6)]">
                                                            TAP TO UNLOCK
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Unlocked badge */}
                                        {isPaid && isUnlocked && (
                                            <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1 py-0.5 rounded bg-green-500/80 backdrop-blur-sm">
                                                <Unlock size={8} className="text-white" />
                                                <span className="text-[7px] font-black text-white uppercase tracking-wider">Unlocked</span>
                                            </div>
                                        )}

                                        {/* Badges container */}
                                        <div className="absolute top-1 left-0 right-0 px-1 flex items-center justify-between gap-1 z-10">
                                            {/* Rarity badge */}
                                            <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-sm truncate max-w-[55%] ${rarityColor[drop.rarity]}`}>
                                                {drop.rarity}
                                            </span>
                                            {/* Price badge */}
                                            {isPaid && (
                                                <span className={`px-1 py-0.5 rounded text-[8px] font-black fd-font-tech text-white shadow-[0_0_10px_hsl(330_100%_55%/0.4)] shrink-0 ${isUnlocked ? "bg-green-500/80" : "bg-primary/80"}`}>
                                                    {isUnlocked ? "✓" : `${cs()}${drop.price}`}
                                                </span>
                                            )}
                                        </div>
                                        {/* Kind icon */}
                                        {!isLocked && (
                                            <span className="absolute bottom-1 right-1 p-0.5 rounded bg-black/60 backdrop-blur-sm">
                                                {drop.kind === "Video" ? <Video size={8} className="text-white/70" /> : <Image size={8} className="text-white/70" />}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    /* No media — compact fallback */
                                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                        {isLocked ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <Lock size={16} className="text-primary/50" />
                                                <span className="text-[8px] font-bold text-primary/50 fd-font-tech">LOCKED</span>
                                            </div>
                                        ) : (
                                            drop.kind === "Video" ? <Video size={16} className="text-primary/30" /> : <Image size={16} className="text-primary/30" />
                                        )}
                                        {/* Badges container */}
                                        <div className="absolute top-1 left-0 right-0 px-1 flex items-center justify-between gap-1 z-10">
                                            {/* Rarity badge */}
                                            <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-sm truncate max-w-[55%] ${rarityColor[drop.rarity]}`}>
                                                {drop.rarity}
                                            </span>
                                            {/* Price badge */}
                                            {isPaid && (
                                                <span className={`px-1 py-0.5 rounded text-[8px] font-black fd-font-tech text-white shrink-0 ${isUnlocked ? "bg-green-500/80" : "bg-primary/80"}`}>
                                                    {isUnlocked ? "✓" : `${cs()}${drop.price}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Card info footer */}
                                <div className="p-1.5 flex flex-col gap-0.5">
                                    <span className="fd-font-body font-bold text-xs leading-tight text-foreground truncate">
                                        {drop.title}
                                    </span>
                                    <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-0.5">
                                        <span className="text-[9px] text-foreground/50 fd-font-body whitespace-nowrap">
                                            Ends · {formatCountdown(drop.ends_at)}
                                        </span>
                                        {drop.inventory_remaining < drop.inventory_total && (
                                            <span className="text-[9px] text-orange-400/70 fd-font-body whitespace-nowrap">
                                                {drop.inventory_remaining} left
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {viewingDrop && viewingDrop.media_url && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
                        onClick={() => setViewingDrop(null)}
                        onKeyDown={(e) => e.key === 'Escape' && setViewingDrop(null)}
                        tabIndex={0}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                            className="relative max-w-3xl w-full max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
                            style={{
                                background: 'linear-gradient(145deg, hsl(270 30% 8%), hsl(330 20% 6%))',
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px hsl(330 100% 55% / 0.1)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/50 ${rarityColor[viewingDrop.rarity]}`}>
                                        {viewingDrop.rarity}
                                    </span>
                                    <span className="font-bold text-sm text-white/90 truncate">{viewingDrop.title}</span>
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-white/40 shrink-0">
                                        {viewingDrop.kind === "Video" ? <Video size={10} /> : <Image size={10} />}
                                        {viewingDrop.kind}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <a
                                        href={viewingDrop.media_url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Download"
                                    >
                                        <Download size={15} />
                                    </a>
                                    <button
                                        onClick={() => setViewingDrop(null)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Media content */}
                            <div className="flex-1 flex items-center justify-center min-h-0 p-2 bg-black/40">
                                {viewingDrop.kind === "Video" ? (
                                    <video
                                        src={viewingDrop.media_url}
                                        className="max-w-full max-h-[70vh] rounded-lg"
                                        controls
                                        autoPlay
                                        playsInline
                                    />
                                ) : (
                                    <img
                                        src={viewingDrop.media_url}
                                        alt={viewingDrop.title}
                                        className="max-w-full max-h-[70vh] object-contain rounded-lg"
                                    />
                                )}
                            </div>

                            {/* Modal footer */}
                            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-white/30">Ends in</span>
                                    <span className="text-[11px] font-mono font-bold text-white/50 tabular-nums">{formatCountdown(viewingDrop.ends_at)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {viewingDrop.price > 0 && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">
                                            <Unlock size={9} />
                                            Unlocked
                                        </span>
                                    )}
                                    <span className="text-[10px] text-white/25">
                                        {viewingDrop.inventory_remaining}/{viewingDrop.inventory_total} left
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
