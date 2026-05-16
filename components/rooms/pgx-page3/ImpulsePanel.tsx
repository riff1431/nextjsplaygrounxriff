import { useState } from "react";
import { Zap, User, Mail } from "lucide-react";
import { cs } from "@/utils/currency";

const impulseButtons = [
  { label: "Quick Like", price: 5, icon: "⚡", color: "from-yellow-400 to-orange-500", glow: "hsl(45, 100%, 50%)" },
  { label: "Hype", price: 10, icon: "👤", color: "from-blue-400 to-indigo-500", glow: "hsl(210, 100%, 50%)" },
  { label: "Boost", price: 25, icon: "🚀", color: "from-purple-500 to-fuchsia-500", glow: "hsl(280, 100%, 50%)" },
  { label: "Flex", price: 50, icon: "✉️", color: "from-emerald-400 to-teal-500", glow: "hsl(150, 100%, 40%)" },
];

const highRollerPacks = [
  { name: "Boost My Rank", price: 150 },
  { name: "Priority Unlock Pass", price: 300 },



  { name: "Legend Crown (Room-wide)", price: 250 },
];

export default function ImpulsePanel() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
    setDescription("");
    setAmount("");
  };

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Reactions */}
      <div className="glass-panel neon-border-md rounded-xl p-2.5 shrink-0">
        <h2 className="font-tech text-xl font-bold text-foreground mb-2">Reactions</h2>
        <div className="grid grid-cols-2 gap-2">
          {impulseButtons.map((btn) => (
            <button
              key={btn.label}
              className="relative overflow-hidden py-2 px-2.5 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 transition-all duration-300 group flex items-center gap-2.5 backdrop-blur-sm hover:scale-[1.02] active:scale-95"
              style={{ boxShadow: `0 4px 15px ${btn.glow.replace('hsl', 'hsla').replace(')', ', 0.15)')}, inset 0 1px 0 rgba(255,255,255,0.1)` }}
            >
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${btn.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 border border-white/20`}>
                  <span className="text-sm drop-shadow-md">{btn.icon}</span>
              </div>
              <div className="flex flex-col items-start leading-none gap-1">
                  <span className="font-body font-bold text-[10px] text-white/70 group-hover:text-white uppercase tracking-wider transition-colors">{btn.label}</span>
                  <span className="font-tech font-bold text-sm text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{cs()}{btn.price}</span>
              </div>
              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-r ${btn.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`} />
            </button>
          ))}
        </div>
      </div>

      {/* High Roller Packs */}
      <div className="glass-panel neon-border rounded-xl p-4 flex-1 flex flex-col justify-center">
        <h2 className="font-tech text-2xl font-bold neon-text-sm mb-4">High Roller Packs</h2>
        <div className="space-y-4">
          {highRollerPacks.map((pack) => (
            <button
              key={pack.name}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all group"
            >
              <span className="font-body font-bold text-base text-foreground/80 group-hover:text-foreground transition-colors">
                {pack.name}
              </span>
              <span className="font-tech font-bold text-base neon-text shrink-0 ml-2">
                ${pack.price.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Request A Drop */}
      <div className="glass-panel neon-border rounded-xl p-2.5 shrink-0">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-tech text-xl font-bold neon-text-sm">Request A Drop</span>
          <span className="font-tech text-l font-bold neon-text">{cs()}250</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you'd like to see..."
            rows={4}
            className="w-full bg-input/30 border border-primary/30 rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-foreground/30 font-body focus:outline-none focus:border-primary/70 focus:shadow-[0_0_10px_hsl(330_100%_55%/0.3)] transition-all resize-none"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Offer Amount $..."
            className="w-full bg-input/30 border border-primary/30 rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-foreground/30 font-body focus:outline-none focus:border-primary/70 focus:shadow-[0_0_10px_hsl(330_100%_55%/0.3)] transition-all"
          />
          <button
            type="submit"
            className="w-full py-2 rounded-lg font-tech font-bold text-xs text-primary-foreground transition-all"
            style={{
              background: "linear-gradient(135deg, hsl(330 100% 40%), hsl(330 100% 55%))",
              boxShadow: "0 0 15px hsl(330 100% 55% / 0.5), 0 0 40px hsl(330 100% 55% / 0.3), inset 0 1px 0 hsl(330 100% 80% / 0.2)",
            }}
          >
            {submitted ? "✓ Submitted!" : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
