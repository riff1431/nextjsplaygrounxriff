import React from 'react';
import { Heart, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CreatorInfo {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
}

export interface Confession {
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

interface ConfessionWallProps {
    confessions: Confession[];
    myUnlocks: Set<string>;
    loadingWall: boolean;
    tierFilter: string;
    handleTierFilter: (tier: string) => void;
    setViewConfession: (c: Confession) => void;
    setPurchaseConfession: (c: Confession) => void;
    handleReaction?: (label: string, amount: number, confessionId?: string) => void;
}

/* ─── Locked Confession Card ─── */
const LockedConfessionCard = ({
    confession,
    onUnlock,
}: {
    confession: Confession;
    onUnlock: (c: Confession) => void;
}) => {
    return (
        <div className="confession-wall-card group">
            {/* Teaser text */}
            <p className="text-xs text-foreground/60 leading-relaxed line-clamp-2 text-center px-2 pt-1">
                {confession.teaser || confession.title}
            </p>

            {/* Lock icon */}
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center my-2 group-hover:scale-110 group-hover:border-primary/40 transition-all duration-300">
                <Lock className="w-7 h-7 text-primary/70 group-hover:text-primary transition-colors" />
            </div>

            {/* Unlock button */}
            <button
                onClick={() => onUnlock(confession)}
                className="w-full py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 mt-auto gradient-pink hover:opacity-90"
            >
                <Heart className="w-3 h-3 fill-current text-white" />
                <span className="text-white font-bold drop-shadow-sm">Unlock for ${confession.price}</span>
            </button>
        </div>
    );
};

/* ─── Unlocked Confession Card ─── */
const UnlockedConfessionCard = ({
    confession,
    onClick,
}: {
    confession: Confession;
    onClick: (c: Confession) => void;
}) => {
    return (
        <div
            onClick={() => onClick(confession)}
            className="confession-wall-card cursor-pointer group hover:border-primary/40"
        >
            <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3 text-center px-2 pt-1 flex-1">
                {confession.content || confession.teaser}
            </p>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 mt-2">
                ✓ Unlocked
            </span>
        </div>
    );
};

/* ─── Main Confession Wall ─── */
const ConfessionWall: React.FC<ConfessionWallProps> = ({
    confessions,
    myUnlocks,
    loadingWall,
    tierFilter,
    handleTierFilter,
    setViewConfession,
    setPurchaseConfession,
    handleReaction
}) => {
    return (
        <div className="neon-glass-card p-4 sm:p-5 space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <h2 className="font-display text-base sm:text-lg font-bold tracking-wide text-foreground">
                    Confession Wall
                </h2>

                {/* Reaction buttons */}
                <div className="flex gap-1.5">
                    {[
                        { icon: "💋", label: "KISS", price: "€10", val: 10 },
                        { icon: "❤️", label: "LOVE", price: "€20", val: 20 },
                        { icon: "🔥", label: "SPICY", price: "€30", val: 30 },
                        { icon: "💎", label: "DARK", price: "€40", val: 40 },
                    ].map((tip, i) => (
                        <button
                            key={i}
                            onClick={() => handleReaction?.(tip.label, tip.val, confessions[0]?.id)}
                            className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border border-primary/15 hover:border-primary/40 transition-all duration-200 hover:scale-105 cursor-pointer"
                            style={{ background: 'rgba(45, 27, 56, 0.8)' }}
                        >
                            <span className="text-base mb-0.5">{tip.icon}</span>
                            <span className="text-[9px] font-bold tracking-wider text-foreground/90">{tip.label}</span>
                            <span className="text-[9px] text-muted-foreground">{tip.price}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter System */}
            <div className="flex flex-wrap items-center gap-2 pt-2 pb-4">
                {['All', 'Spicy', 'Dirty', 'Bedroom', 'Forbidden'].map((tier) => {
                    const isActive = tierFilter === tier;
                    return (
                        <button
                            key={tier}
                            onClick={() => handleTierFilter(tier)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border backdrop-blur-md",
                                isActive
                                    ? "bg-gradient-to-r from-rose-600 to-pink-500 text-white border-transparent shadow-[0_4px_20px_rgba(225,29,72,0.4)] scale-105"
                                    : "bg-black/40 text-rose-100/70 border-white/5 hover:border-rose-500/50 hover:text-white hover:bg-rose-950/40"
                            )}
                        >
                            {tier}
                        </button>
                    );
                })}
            </div>

            {/* Confession grid - 2 columns */}
            <div className="space-y-0">
                {loadingWall && (
                    <div className="text-center py-10">
                        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-muted-foreground mt-3 animate-pulse">Loading secrets...</p>
                    </div>
                )}
                {!loadingWall && confessions.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                        No confessions found.
                    </div>
                )}
                {!loadingWall && confessions.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        {confessions.map((c, i) => {
                            const isUnlocked = myUnlocks.has(c.id);
                            return isUnlocked ? (
                                <UnlockedConfessionCard
                                    key={c.id || i}
                                    confession={c}
                                    onClick={setViewConfession}
                                />
                            ) : (
                                <LockedConfessionCard
                                    key={c.id || i}
                                    confession={c}
                                    onUnlock={setPurchaseConfession}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfessionWall;
