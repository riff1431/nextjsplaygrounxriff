"use client";

import { useState, useEffect, useCallback } from "react";
import { Image, Video, Play, Lock, Unlock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

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
}

export default function LiveDropBoard({ roomId, onSpend }: LiveDropBoardProps) {
    const supabase = createClient();
    const { user } = useAuth();
    const [drops, setDrops] = useState<FlashDrop[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<"all" | "limited" | "whale">("all");
    const [, setTick] = useState(0);
    const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
    const [unlockingId, setUnlockingId] = useState<string | null>(null);

    // Tick every second to update countdown display
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const fetchDrops = useCallback(async () => {
        if (!roomId) return;
        const { data } = await supabase
            .from("flash_drops")
            .select("*")
            .eq("room_id", roomId)
            .eq("status", "Live")
            .order("created_at", { ascending: false });
        if (data) setDrops(data as FlashDrop[]);
        setLoading(false);
    }, [roomId]);

    // Fetch user's unlocked drops
    const fetchUnlocked = useCallback(async () => {
        if (!roomId || !user) return;
        const { data } = await supabase
            .from("flash_drop_unlocks")
            .select("drop_id")
            .eq("user_id", user.id);
        if (data) {
            setUnlockedIds(new Set(data.map((u: any) => u.drop_id)));
        }
    }, [roomId, user]);

    useEffect(() => {
        if (!roomId) return;
        fetchDrops();
        fetchUnlocked();

        const channel = supabase
            .channel(`fan-drops-${roomId}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "flash_drops",
                filter: `room_id=eq.${roomId}`,
            }, fetchDrops)
            .subscribe((status) => {
                if (status === "CHANNEL_ERROR") {
                    console.warn("⚠️ Fan drop board realtime failed");
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchDrops, fetchUnlocked]);

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
                    toast.success(`🔓 Unlocked "${drop.title}" for $${drop.price}!`);
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
        if (activeFilter === "limited") return isLimitedTime(drop.ends_at);
        if (activeFilter === "whale") return drop.price >= 500;
        return true;
    });

    // Find the most expensive drop for the "Focused Drop" feature
    const featuredDrop = drops.length > 0
        ? [...drops].sort((a, b) => b.price - a.price)[0]
        : null;

    return (
        <div className="fd-glass-panel fd-neon-border-md rounded-xl p-3 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <h2 className="fd-font-tech text-xl font-bold text-foreground">Live Drop Board</h2>
                <button
                    onClick={() => setActiveFilter(activeFilter === "limited" ? "all" : "limited")}
                    className={`px-2 py-0.5 rounded text-xs fd-font-body font-semibold border transition-all ${activeFilter === "limited"
                        ? "fd-neon-border bg-primary/20 fd-neon-text"
                        : "border-foreground/30 text-foreground/60 hover:border-primary/50"
                        }`}
                >
                    Limited Time
                </button>
                <button
                    onClick={() => setActiveFilter(activeFilter === "whale" ? "all" : "whale")}
                    className={`px-2 py-0.5 rounded text-xs fd-font-body font-semibold border transition-all ${activeFilter === "whale"
                        ? "fd-neon-border bg-primary/20 fd-neon-text"
                        : "border-foreground/30 text-foreground/60 hover:border-primary/50"
                        }`}
                >
                    Whale
                </button>
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
                <div className="grid grid-cols-3 gap-2.5">
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
                                    }
                                }}
                                disabled={isUnlocking || (!isLocked && isPaid)}
                                className={`text-left rounded-xl border bg-black/40 transition-all group overflow-hidden flex flex-col ${isLocked
                                        ? "border-primary/40 hover:border-primary/80 cursor-pointer hover:shadow-[0_0_20px_hsl(330_100%_55%/0.3)]"
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
                                                        <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center shadow-[0_0_15px_hsl(330_100%_55%/0.5)]">
                                                            <Play size={14} className="text-white ml-0.5" fill="white" />
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
                                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5">
                                                {isUnlocking ? (
                                                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                                ) : (
                                                    <>
                                                        <div className="w-10 h-10 rounded-full bg-primary/30 border border-primary/60 flex items-center justify-center shadow-[0_0_20px_hsl(330_100%_55%/0.4)]">
                                                            <Lock size={18} className="text-primary drop-shadow-[0_0_6px_hsl(330_100%_55%)]" />
                                                        </div>
                                                        <span className="text-[10px] font-black fd-font-tech text-primary tracking-wider drop-shadow-[0_0_6px_hsl(330_100%_55%/0.6)]">
                                                            TAP TO UNLOCK
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Unlocked badge */}
                                        {isPaid && isUnlocked && (
                                            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/80 backdrop-blur-sm">
                                                <Unlock size={9} className="text-white" />
                                                <span className="text-[8px] font-black text-white uppercase tracking-wider">Unlocked</span>
                                            </div>
                                        )}

                                        {/* Rarity badge */}
                                        <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-sm ${rarityColor[drop.rarity]}`}>
                                            {drop.rarity}
                                        </span>
                                        {/* Price badge */}
                                        {isPaid && (
                                            <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-black fd-font-tech text-white shadow-[0_0_10px_hsl(330_100%_55%/0.4)] ${isUnlocked ? "bg-green-500/80" : "bg-primary/80"}`}>
                                                {isUnlocked ? "✓" : `$${drop.price}`}
                                            </span>
                                        )}
                                        {/* Kind icon */}
                                        {!isLocked && (
                                            <span className="absolute bottom-1.5 right-1.5 p-1 rounded bg-black/60 backdrop-blur-sm">
                                                {drop.kind === "Video" ? <Video size={10} className="text-white/70" /> : <Image size={10} className="text-white/70" />}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    /* No media — compact fallback */
                                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                        {isLocked ? (
                                            <div className="flex flex-col items-center gap-1.5">
                                                <Lock size={24} className="text-primary/50" />
                                                <span className="text-[9px] font-bold text-primary/50 fd-font-tech">LOCKED</span>
                                            </div>
                                        ) : (
                                            drop.kind === "Video" ? <Video size={28} className="text-primary/30" /> : <Image size={28} className="text-primary/30" />
                                        )}
                                        <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-sm ${rarityColor[drop.rarity]}`}>
                                            {drop.rarity}
                                        </span>
                                        {isPaid && (
                                            <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-black fd-font-tech text-white ${isUnlocked ? "bg-green-500/80" : "bg-primary/80"}`}>
                                                {isUnlocked ? "✓" : `$${drop.price}`}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Card info footer */}
                                <div className="p-2 flex flex-col gap-0.5">
                                    <span className="fd-font-body font-bold text-xs leading-tight text-foreground truncate">
                                        {drop.title}
                                    </span>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-foreground/50 fd-font-body">
                                            Ends · {formatCountdown(drop.ends_at)}
                                        </span>
                                        {drop.inventory_remaining < drop.inventory_total && (
                                            <span className="text-[9px] text-orange-400/70 fd-font-body">
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

            {/* Focused / Featured Drop */}
            {featuredDrop && featuredDrop.price > 0 && (
                <div className="mt-4 rounded-xl border-2 border-yellow-400/60 bg-black/80 p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 left-0 bottom-0 pointer-events-none rounded-xl shadow-[0_0_40px_rgba(250,204,21,0.3)] ring-1 ring-yellow-400/40" />
                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />
                            <span className="fd-font-tech text-xs font-black uppercase tracking-[0.2em] text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
                                Featured Drop
                            </span>
                        </div>
                        <span className="text-[10px] text-yellow-400/60 fd-font-tech uppercase font-bold">
                            {formatCountdown(featuredDrop.ends_at)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between relative z-10 mb-3">
                        <div>
                            <div className="fd-font-body font-black text-white text-sm leading-tight">{featuredDrop.title}</div>
                            <div className="text-[10px] text-yellow-400/50 fd-font-tech uppercase font-bold tracking-tighter mt-0.5">
                                Type: <span className="text-yellow-400/80">{featuredDrop.kind}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="fd-font-tech text-2xl font-black text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]">
                                ${featuredDrop.price}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => onSpend?.(featuredDrop.price * 2, `🎁 Unlocked + Gifted ${featuredDrop.title} (2x)`)}
                        className="relative z-10 w-full py-2.5 rounded-xl border-2 border-yellow-400/80 bg-yellow-400/20 text-yellow-400 fd-font-tech text-xs font-black hover:bg-yellow-400/30 transition-all uppercase tracking-[0.2em]"
                        style={{
                            boxShadow: "0 0 15px rgba(250,204,21,0.3), 0 0 40px rgba(250,204,21,0.15), inset 0 0 10px rgba(250,204,21,0.1)",
                            textShadow: "0 0 6px rgba(250,204,21,0.5)"
                        }}
                    >
                        Unlock + Gift: (2x)
                    </button>
                </div>
            )}
        </div>
    );
}
