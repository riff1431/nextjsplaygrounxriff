import { useState } from "react";
import { Zap, User, Mail } from "lucide-react";

const impulseButtons = [
  { label: "Quick Like", price: 5, icon: "⚡" },
  { label: "Hype", price: 10, icon: "👤" },
  { label: "Boost", price: 25, icon: "🚀" },
  { label: "Flex", price: 50, icon: "✉️" },
];

const highRollerPacks = [
  { name: "Boost My Rank", price: 150 },
  { name: "Priority Unlock Pass", price: 300 },
  { name: "Golden Key (Vault Access)", price: 750 },
  { name: "Diamond Patron", price: 1500 },
  { name: "Private Drop Sponsor", price: 2500 },
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
    <div className="flex flex-col gap-2 h-full">
      {/* Impulse Spend */}
      <div className="glass-panel neon-border-md rounded-xl p-2.5">
        <h2 className="font-tech text-xl font-bold text-foreground mb-2">Impulse Spend</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {impulseButtons.map((btn) => (
            <button
              key={btn.label}
              className="py-1.5 px-2 rounded-lg border border-primary/50 bg-primary/10 hover:bg-primary/20 hover:border-primary/80 transition-all font-body font-semibold text-xs text-foreground flex items-center justify-center gap-1.5 group"
              style={{ boxShadow: "0 0 8px hsl(330 100% 55% / 0.2)" }}
            >
              <span className="text-xs opacity-70">{btn.icon}</span>
              <span>
                <span className="neon-text-sm italic">{btn.label}:</span>{" "}
                <span className="font-tech font-bold neon-text">${btn.price}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* High Roller Packs */}
      <div className="glass-panel neon-border rounded-xl p-2.5 flex-1">
        <h2 className="font-tech text-xs font-bold neon-text-sm mb-2">High Roller Packs</h2>
        <div className="space-y-1">
          {highRollerPacks.map((pack) => (
            <button
              key={pack.name}
              className="w-full flex items-center justify-between py-1 px-2 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all group"
            >
              <span className="font-body font-semibold text-xs text-foreground/80 group-hover:text-foreground transition-colors">
                {pack.name}
              </span>
              <span className="font-tech font-bold text-xs neon-text shrink-0 ml-2">
                ${pack.price.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Request A Drop */}
      <div className="glass-panel neon-border rounded-xl p-2.5">
        <h2 className="font-tech text-xs font-bold neon-text-sm mb-1.5">Request A Drop</h2>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-body font-semibold text-xs text-foreground/70">Request A Drop</span>
          <span className="font-tech text-xs font-bold neon-text">$250</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-1.5">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you'd like to see..."
            rows={2}
            className="w-full bg-input/30 border border-primary/30 rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-foreground/30 font-body focus:outline-none focus:border-primary/70 focus:shadow-[0_0_10px_hsl(330_100%_55%/0.3)] transition-all resize-none"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Offer Amount $..."
            className="w-full bg-input/30 border border-primary/30 rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-foreground/30 font-body focus:outline-none focus:border-primary/70 focus:shadow-[0_0_10px_hsl(330_100%_55%/0.3)] transition-all"
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
