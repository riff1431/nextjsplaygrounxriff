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
        <h2 className="font-tech text-xl font-bold text-foreground">Live Drop Board</h2>
        <button
          onClick={() => setActiveFilter("limited")}
          className={`px-2 py-0.5 rounded text-xs font-body font-semibold border transition-all ${
            activeFilter === "limited"
              ? "neon-border bg-primary/20 neon-text"
              : "border-foreground/30 text-foreground/60 hover:border-primary/50"
          }`}
        >
          Limited Time
        </button>
        <button
          onClick={() => setActiveFilter("whale")}
          className={`px-2 py-0.5 rounded text-xs font-body font-semibold border transition-all ${
            activeFilter === "whale"
              ? "neon-border bg-primary/20 neon-text"
              : "border-foreground/30 text-foreground/60 hover:border-primary/50"
          }`}
        >
          Whale
        </button>
      </div>

      {/* Grid of drops */}
      <div className="grid grid-cols-2 gap-1.5 flex-1 overflow-y-auto pr-1 custom-scroll min-h-0">
        {drops.map((drop) => (
          <button
            key={drop.id}
            className="text-left p-1.5 rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all group"
          >
            <div className="flex items-start justify-between gap-1">
              <span className={`font-body font-semibold text-xs leading-tight neon-text-sm ${rarityColor[drop.rarity]}`}>
                {drop.name}
              </span>
              {drop.price > 0 && (
                <span className="font-tech text-xs font-bold neon-text shrink-0">${drop.price}</span>
              )}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[9px] text-foreground/50 font-body">
                Ends · {formatTime(drop.endTime)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Focused Drop */}
      <div className="mt-2 rounded-lg border border-primary/60 bg-primary/10 p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-tech text-xs font-bold neon-text-sm">Focused Drop</span>
          <span className="text-xs text-foreground/60 font-body">Ctare</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-body font-bold text-foreground text-xs">VIP Backstage - Full Reel</div>
            <div className="text-[10px] text-foreground/50 font-body">Rarity: <span className="text-orange-400">Epic</span></div>
          </div>
          <div className="font-tech text-lg font-black neon-text">$250</div>
        </div>
        <button className="mt-1.5 w-full py-1 rounded border border-yellow-400/80 bg-yellow-400/15 text-yellow-300 font-tech text-xs font-bold hover:bg-yellow-400/25 transition-all"
          style={{ boxShadow: "0 0 10px rgba(250,204,21,0.3), 0 0 25px rgba(250,204,21,0.15)" }}>
          Unlock + Gift: (2x)
        </button>
      </div>
    </div>
  );
}
