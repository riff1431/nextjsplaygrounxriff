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

interface ImpulsePanelProps {
    onSpend?: (amount: number, msg: string) => void;
}

export default function ImpulsePanel({ onSpend }: ImpulsePanelProps) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const reqAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
        if (isNaN(reqAmount) || reqAmount <= 0) return;

        setSubmitted(true);
        onSpend?.(reqAmount, `📩 Custom Request Submitted: ${description.substring(0, 20)}...`);
        setTimeout(() => setSubmitted(false), 2000);
        setDescription("");
        setAmount("");
    };

    return (
        <div className="flex flex-col gap-2">
            {/* Impulse Spend */}
            <div className="fd-glass-panel fd-neon-border-md rounded-xl p-3">
                <h2 className="fd-font-tech text-xl font-black text-foreground mb-2.5 tracking-tighter fd-neon-text">Impulse Spend</h2>
                <div className="grid grid-cols-2 gap-2">
                    {impulseButtons.map((btn) => (
                        <button
                            key={btn.label}
                            onClick={() => onSpend?.(btn.price, `⚡ Impulse ${btn.label}: $${btn.price}`)}
                            className="py-2 px-2.5 rounded-xl border border-primary/50 bg-primary/10 hover:bg-primary/20 hover:border-primary/80 transition-all fd-font-body font-bold text-xs text-foreground flex items-center justify-center gap-1.5 group"
                            style={{ boxShadow: "0 0 8px hsl(330 100% 55% / 0.12)" }}
                        >
                            <span className="text-xs opacity-80">{btn.icon}</span>
                            <span>
                                <span className="fd-neon-text-sm italic tracking-tight">{btn.label}:</span>{" "}
                                <span className="fd-font-tech font-black fd-neon-text text-base italic">${btn.price}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* High Roller Packs */}
            <div className="fd-glass-panel fd-neon-border rounded-xl p-3">
                <h2 className="fd-font-tech text-[11px] font-black fd-neon-text-sm mb-2 uppercase tracking-widest">High Roller Packs</h2>
                <div className="space-y-1">
                    {highRollerPacks.map((pack) => (
                        <button
                            key={pack.name}
                            onClick={() => onSpend?.(pack.price, `💎 Purchased Pack: ${pack.name} ($${pack.price})`)}
                            className="w-full flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-primary/15 border border-transparent hover:border-primary/40 transition-all group"
                        >
                            <span className="fd-font-body font-bold text-xs text-foreground/85 group-hover:text-foreground transition-colors">
                                {pack.name}
                            </span>
                            <span className="fd-font-tech font-black text-sm fd-neon-text shrink-0 ml-2">
                                ${pack.price.toLocaleString()}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Request A Drop */}
            <div className="fd-glass-panel fd-neon-border rounded-xl p-3">
                <h2 className="fd-font-tech text-[11px] font-black fd-neon-text-sm mb-1.5 uppercase tracking-widest">Request A Drop</h2>
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="fd-font-body font-bold text-[10px] text-foreground/70">Custom Request</span>
                    <span className="fd-font-tech text-[10px] font-black fd-neon-text uppercase tracking-tighter">$250 min</span>
                </div>
                <form onSubmit={handleSubmit} className="space-y-2">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what you'd like to see..."
                        rows={2}
                        className="w-full bg-black/40 border border-primary/40 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-foreground/30 fd-font-body focus:outline-none focus:border-primary/80 focus:shadow-[0_0_15px_hsl(330_100%_55%/0.25)] transition-all resize-none"
                    />
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Offer Amount $..."
                        className="w-full bg-black/40 border border-primary/40 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-foreground/30 fd-font-body focus:outline-none focus:border-primary/80 focus:shadow-[0_0_15px_hsl(330_100%_55%/0.25)] transition-all"
                    />
                    <button
                        type="submit"
                        className="w-full py-3 rounded-xl fd-font-tech font-black text-sm text-white transition-all uppercase tracking-[0.2em]"
                        style={{
                            background: "linear-gradient(to right, #ff00ff, #ff2e92)",
                            boxShadow: "0 0 20px #ff00ff60, 0 0 40px #ff00ff20, inset 0 1px 0 rgba(255,255,255,0.2)",
                            textShadow: "0 0 8px rgba(255,255,255,0.4)"
                        }}
                    >
                        {submitted ? "✓ Submitted!" : "Submit Request"}
                    </button>
                </form>
            </div>
        </div>
    );
}
