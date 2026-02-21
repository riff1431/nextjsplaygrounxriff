import { useState, useEffect } from "react";

interface DropItem {
    id: number;
    name: string;
    price: number;
    endTime: number; // seconds remaining
    type: string;
    rarity: "Common" | "Rare" | "Epic" | "Legendary";
    slots?: string;
}

const initialDrops: DropItem[] = [
    { id: 1, name: "Tease Set", price: 25, endTime: 180, type: "Live May", rarity: "Common", slots: "Clean · Clams" },
    { id: 2, name: "After Dark", price: 35, endTime: 600, type: "Live May", rarity: "Common", slots: "Clean · Clear" },
    { id: 3, name: "Extra Common", price: 50, endTime: 300, type: "Live May", rarity: "Common", slots: "Clean · Clear" },
    { id: 4, name: "Sneak Peek", price: 25, endTime: 300, type: "Live May", rarity: "Common", slots: "Clean · Clpts" },
    { id: 5, name: "Lux Dungeon — Preview", price: 0, endTime: 120, type: "Live May", rarity: "Rare", slots: "Clean · Clmk" },
    { id: 6, name: "Mid Replay", price: 250, endTime: 300, type: "Close • Up", rarity: "Rare", slots: "Clean · Clrx" },
    { id: 7, name: "Mid Replay", price: 250, endTime: 120, type: "Close • Up", rarity: "Rare", slots: "Clean · Clare" },
    { id: 8, name: "Rare Replay:", price: 250, endTime: 600, type: "Close • Up", rarity: "Rare", slots: "Clean · Clrx" },
    { id: 9, name: "Nare Replay", price: 400, endTime: 180, type: "Ends • Up", rarity: "Epic", slots: "Close · Cluts" },
    { id: 10, name: "Nare Deck", price: 60, endTime: 600, type: "Epic", rarity: "Epic", slots: "Clean · Clear" },
    { id: 11, name: "Neon Confeti —", price: 800, endTime: 1920, type: "Epic", rarity: "Legendary", slots: "Clean · Crome" },
    { id: 12, name: "Vault Drop:", price: 1000, endTime: 600, type: "Epic", rarity: "Legendary", slots: "" },
];

function formatTime(seconds: number): string {
    if (seconds <= 0) return "ENDED";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
    return `${m}m ${s}s`;
}

const rarityColor: Record<string, string> = {
    Common: "text-pink-300",
    Rare: "text-yellow-300",
    Epic: "text-orange-400",
    Legendary: "text-red-400",
};

interface LiveDropBoardProps {
    onSpend?: (amount: number, msg: string) => void;
}

export default function LiveDropBoard({ onSpend }: LiveDropBoardProps) {
    const [drops, setDrops] = useState(initialDrops);
    const [activeFilter, setActiveFilter] = useState<"all" | "limited" | "whale">("all");

    useEffect(() => {
        const interval = setInterval(() => {
            setDrops((prev) =>
                prev.map((d) => ({ ...d, endTime: Math.max(0, d.endTime - 1) }))
            );
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fd-glass-panel fd-neon-border-md rounded-xl p-3 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <h2 className="fd-font-tech text-xl font-bold text-foreground">Live Drop Board</h2>
                <button
                    onClick={() => setActiveFilter("limited")}
                    className={`px-2 py-0.5 rounded text-xs fd-font-body font-semibold border transition-all ${activeFilter === "limited"
                        ? "fd-neon-border bg-primary/20 fd-neon-text"
                        : "border-foreground/30 text-foreground/60 hover:border-primary/50"
                        }`}
                >
                    Limited Time
                </button>
                <button
                    onClick={() => setActiveFilter("whale")}
                    className={`px-2 py-0.5 rounded text-xs fd-font-body font-semibold border transition-all ${activeFilter === "whale"
                        ? "fd-neon-border bg-primary/20 fd-neon-text"
                        : "border-foreground/30 text-foreground/60 hover:border-primary/50"
                        }`}
                >
                    Whale
                </button>
            </div>

            {/* Grid of drops */}
            <div className="grid grid-cols-2 gap-2.5 flex-1 overflow-y-auto pr-1 min-h-0 min-h-[300px] max-h-[500px] custom-scroll">
                {drops.map((drop) => (
                    <button
                        key={drop.id}
                        onClick={() => onSpend?.(drop.price, `🎁 Unlocked ${drop.name}`)}
                        className="text-left p-2 rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/20 hover:border-primary/60 transition-all group"
                    >
                        <div className="flex items-start justify-between gap-1">
                            <span className={`fd-font-body font-bold text-xs leading-tight fd-neon-text-sm ${rarityColor[drop.rarity]}`}>
                                {drop.name}
                            </span>
                            {drop.price > 0 && (
                                <span className="fd-font-tech text-xs font-black fd-neon-text shrink-0">${drop.price}</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[9px] text-foreground/50 fd-font-body">
                                Ends · {formatTime(drop.endTime)}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Focused Drop */}
            <div className="mt-4 rounded-xl border-2 border-yellow-400/60 bg-black/80 p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 bottom-0 pointer-events-none rounded-xl shadow-[0_0_40px_rgba(250,204,21,0.3)] ring-1 ring-yellow-400/40" />
                <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="fd-font-tech text-xs font-black uppercase tracking-[0.2em] text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">Focused Drop</span>
                    </div>
                    <span className="text-[10px] text-yellow-400/60 fd-font-tech uppercase font-bold cursor-pointer hover:text-yellow-400 transition-colors">Close</span>
                </div>
                <div className="flex items-center justify-between relative z-10 mb-3">
                    <div>
                        <div className="fd-font-body font-black text-white text-sm leading-tight">VIP Backstage - Full Reel</div>
                        <div className="text-[10px] text-yellow-400/50 fd-font-tech uppercase font-bold tracking-tighter mt-0.5">Type: <span className="text-yellow-400/80">Premium Access</span></div>
                    </div>
                    <div className="text-right">
                        <div className="fd-font-tech text-2xl font-black text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]">$250</div>
                    </div>
                </div>
                <button
                    onClick={() => onSpend?.(250 * 2, "🎁 Unlocked + Gifted VIP Backstage (2x)")}
                    className="relative z-10 w-full py-2.5 rounded-xl border-2 border-yellow-400/80 bg-yellow-400/20 text-yellow-400 fd-font-tech text-xs font-black hover:bg-yellow-400/30 transition-all uppercase tracking-[0.2em]"
                    style={{
                        boxShadow: "0 0 15px rgba(250,204,21,0.3), 0 0 40px rgba(250,204,21,0.15), inset 0 0 10px rgba(250,204,21,0.1)",
                        textShadow: "0 0 6px rgba(250,204,21,0.5)"
                    }}
                >
                    Unlock + Gift: (2x)
                </button>
            </div>
        </div>
    );
}
