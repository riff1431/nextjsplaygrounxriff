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

const rarityProps: Record<string, { color: string; border: string; glow: string }> = {
  Common: {
    color: "text-pink-300",
    border: "border-pink-500/30",
    glow: "shadow-[0_0_15px_rgba(236,72,153,0.1)]"
  },
  Rare: {
    color: "text-yellow-300",
    border: "border-yellow-500/30",
    glow: "shadow-[0_0_15px_rgba(234,179,8,0.1)]"
  },
  Epic: {
    color: "text-orange-400",
    border: "border-orange-500/40",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.15)]"
  },
  Legendary: {
    color: "text-red-400",
    border: "border-red-500/50",
    glow: "shadow-[0_0_25px_rgba(239,68,68,0.2)]"
  },
};

export default function LiveDropBoard() {
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
    <div className="glass-panel neon-border-md rounded-xl p-2.5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-tech text-l font-bold text-foreground">Live Drop Board</h2>
        {/* <button
          onClick={() => setActiveFilter("limited")}
          className={`px-2 py-0.5 rounded text-l font-body font-semibold border transition-all ${
            activeFilter === "limited"
              ? "neon-border bg-primary/20 neon-text"
              : "border-foreground/30 text-foreground/60 hover:border-primary/50"
          }`}
        >
          Limited Time
        </button>
        <button
          onClick={() => setActiveFilter("whale")}
          className={`px-2 py-0.5 rounded text-l font-body font-semibold border transition-all ${
            activeFilter === "whale"
              ? "neon-border bg-primary/20 neon-text"
              : "border-foreground/30 text-foreground/60 hover:border-primary/50"
          }`}
        >
          Whale
        </button> */}
      </div>

      {/* Grid of drops */}
      <div className="grid grid-cols-3 gap-1.5 flex-1 overflow-y-auto pr-1 custom-scroll min-h-0">
        {drops.map((drop) => {
          const isEnded = drop.endTime <= 0;
          const props = rarityProps[drop.rarity];

          return (
            <button
              key={drop.id}
              disabled={isEnded}
              className={`flex flex-col items-center justify-center text-center p-2 rounded-lg border transition-all group min-h-[100px] ${isEnded
                ? "opacity-40 grayscale border-white/10 bg-white/5 cursor-not-allowed"
                : `bg-primary/5 hover:bg-primary/10 ${props.border} ${props.glow} hover:border-primary/80`
                }`}
            >
              <span className={`font-body font-bold text-sm leading-tight mb-1 ${isEnded ? "text-foreground/50" : props.color}`}>
                {drop.name}
              </span>

              {drop.price > 0 && (
                <span className={`font-tech text-base font-bold mb-1 ${isEnded ? "text-foreground/40" : "neon-text"}`}>
                  ${drop.price}
                </span>
              )}

            </button>
          );
        })}
      </div>

      {/* Focused Drop */}
      <div className="mt-2 rounded-lg border border-primary/60 bg-primary/10 p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-tech text-l font-bold neon-text-sm">Focused Drop</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-body font-bold text-foreground text-l">VIP Backstage - Full Reel</div>
            <div className="text-[10px] text-foreground/50 font-body">Rarity: <span className="text-orange-400">Epic</span></div>
          </div>
          <div className="font-tech text-lg font-black neon-text">$250</div>
        </div>
        <button className="mt-1.5 w-full py-1 rounded border border-yellow-400/80 bg-yellow-400/15 text-yellow-300 font-tech text-l font-bold hover:bg-yellow-400/25 transition-all"
          style={{ boxShadow: "0 0 10px rgba(250,204,21,0.3), 0 0 25px rgba(250,204,21,0.15)" }}>
          Unlock This Drop
        </button>
      </div>
    </div>
  );
}
