import React from 'react';
import { Users, Heart } from "lucide-react";

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
}

const ConfessionCard = ({
    confession,
    isUnlocked,
    setViewConfession,
    setPurchaseConfession
}: {
    confession: Confession;
    isUnlocked: boolean;
    setViewConfession: (c: Confession) => void;
    setPurchaseConfession: (c: Confession) => void;
}) => {
    // Fake data for display purposes to match design
    const amount = Math.floor(Math.random() * 200) + 100;
    const goal = amount + Math.floor(Math.random() * 200) + 100;
    const fans = Math.floor(Math.random() * 60) + 10;
    const progress = (amount / goal) * 100;
    const author = confession.creator?.username || "Anonymous";

    return (
        <div className="neon-glass-card p-4 space-y-3 group hover:border-primary/50 transition-all duration-300">
            <div className="flex items-start justify-between gap-3">
                <p className={`text-sm leading-relaxed flex-1 italic ${!isUnlocked ? 'blur-[4px] select-none opacity-60' : 'text-foreground/90'}`}>
                    "{isUnlocked ? (confession.content || confession.teaser) : "This is a hidden confession content that is very spicy and extremely secret..."}"
                </p>
                <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground mr-1">@{author}</span>
                    <span className="gold-text text-xs font-bold">${confession.price}</span>
                    <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
                </div>
            </div>

            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {fans} Fans contributed <span className="font-bold text-foreground">{fans}</span>
                </div>
                <span className="gold-text font-display text-lg font-bold">${amount}</span>
            </div>

            <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gold progress-bar-glow transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
                <div className="flex justify-end text-xs text-muted-foreground uppercase tracking-widest text-[9px] mt-1">
                    TARGET ${goal}
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/30 mt-2">
                <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-semibold uppercase tracking-wider text-muted-foreground">Top Fans</span>
                    <span className="text-muted-foreground truncate max-w-[100px]">TopFan?, User12</span>
                </div>
                <div className="flex gap-1.5 items-center">
                    {[5, 10].map((val) => (
                        <button
                            key={val}
                            className="px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-semibold transition-colors border border-border hover:border-primary/50"
                        >
                            <span className="gold-text">+${val}</span>
                        </button>
                    ))}
                    {isUnlocked ? (
                        <button
                            onClick={() => setViewConfession(confession)}
                            className="px-4 py-1.5 rounded-md border border-primary/50 text-primary text-xs font-bold hover:bg-primary/10 ml-2"
                        >
                            Open
                        </button>
                    ) : (
                        <button
                            onClick={() => setPurchaseConfession(confession)}
                            className="px-4 py-1.5 rounded-md gradient-pink text-primary-foreground text-xs font-bold neon-border hover:opacity-90 ml-2 animate-pulse hover:animate-none"
                        >
                            Unlock ${confession.price}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ConfessionWall: React.FC<ConfessionWallProps> = ({
    confessions,
    myUnlocks,
    loadingWall,
    tierFilter,
    handleTierFilter,
    setViewConfession,
    setPurchaseConfession
}) => {
    return (
        <div className="neon-glass-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-sm sm:text-base font-semibold tracking-wide">Confession Wall</h2>
                <div className="flex gap-1.5">
                    {["❤️", "🔥", "👀", "💀", "😈", "💋"].map((e, i) => (
                        <span key={i} className="text-sm cursor-pointer hover:scale-125 transition-transform opacity-80 hover:opacity-100">{e}</span>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span>Current Pot <span className="gold-text font-display font-bold text-base md:text-lg ml-1">$265</span></span>
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold tracking-wider">RECEIVED GOAL</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 41 Fans</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
                {['All', 'Soft', 'Spicy', 'Dirty', 'Dark', 'Forbidden'].map(t => (
                    <button key={t} onClick={() => handleTierFilter(t)}
                        className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase transition-all duration-300 ${tierFilter === t || (t === 'All' && tierFilter === '')
                            ? "gradient-pink border-transparent text-primary-foreground shadow-[0_0_15px_rgba(255,42,109,0.4)] scale-105"
                            : "bg-secondary border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            }`}>
                        {t === 'All' ? '✨ All' : t}
                    </button>
                ))}
            </div>

            <div className="space-y-4 mt-4">
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
                {confessions.map((c, i) => (
                    <ConfessionCard
                        key={c.id || i}
                        confession={c}
                        isUnlocked={myUnlocks.has(c.id)}
                        setViewConfession={setViewConfession}
                        setPurchaseConfession={setPurchaseConfession}
                    />
                ))}
            </div>

        </div>
    );
};

export default ConfessionWall;
