import React from "react";

const reactions = [
    { emoji: "🔥", label: "Boost", price: "$2" },
    { emoji: "💎", label: "Shine", price: "$5" },
    { emoji: "🤟", label: "Crown", price: "$10" },
    { emoji: "⚡", label: "Pulse", price: "$15" },
];

const stickers = [
    { emoji: "💋", label: "Kiss", price: "$5" },
    { emoji: "😈", label: "Tease", price: "$10" },
    { emoji: "🌹", label: "Rose", price: "$25" },
    { emoji: "🎁", label: "Gift", price: "$50" },
];

const PaidReactions = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Paid Reactions */}
            <div className="glass-card p-4">
                <h3 className="fd-font-cinzel text-gold text-sm mb-3">Paid Reactions</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    {reactions.map((r) => (
                        <button
                            key={r.label}
                            className="glass-card-inner px-3 py-2 text-sm text-foreground hover:border-gold/50 transition-colors flex items-center gap-2"
                        >
                            <span>{r.emoji}</span>
                            <span>{r.label} {r.price}</span>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground italic">One-tap micro-spend to surface in chat</p>
            </div>

            {/* Paid Stickers */}
            <div className="glass-card p-4">
                <h3 className="fd-font-cinzel text-gold text-sm mb-3">Paid Stickers</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    {stickers.map((s) => (
                        <button
                            key={s.label}
                            className="glass-card-inner px-3 py-2 text-sm text-foreground hover:border-gold/50 transition-colors flex items-center gap-2"
                        >
                            <span>{s.emoji}</span>
                            <span>{s.label} {s.price}</span>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground italic">Stickers can trigger on-stream overlays in production.</p>
            </div>

            {/* Visibility Boosts */}
            <div className="glass-card p-4">
                <h3 className="fd-font-cinzel text-gold text-sm mb-3">Visibility Boosts</h3>
                <div className="space-y-2 mb-2">
                    <button className="glass-card-inner w-full flex justify-between px-3 py-2 text-sm text-foreground/80 hover:border-gold/50 transition-colors">
                        <span>Pin my message (1 min)</span><span className="text-gold">$25</span>
                    </button>
                    <button className="glass-card-inner w-full flex justify-between px-3 py-2 text-sm text-foreground/80 hover:border-gold/50 transition-colors">
                        <span>Highlight badge (2 min)</span><span className="text-gold">$40</span>
                    </button>
                    <button className="glass-card-inner w-full flex justify-between px-3 py-2 text-sm text-foreground/80 hover:border-gold/50 transition-colors">
                        <span>Priority queue (5 min)</span><span className="text-gold">$75</span>
                    </button>
                </div>
                <p className="text-xs text-muted-foreground italic">Boosts can be time-bound and non-refundable.</p>
            </div>

            {/* Direct Access */}
            <div className="glass-card p-4">
                <h3 className="fd-font-cinzel text-gold text-sm mb-3">Direct Access</h3>
                <div className="space-y-2 mb-2">
                    <button className="glass-card-inner w-full flex justify-between px-3 py-2 text-sm text-foreground/80 hover:border-gold/50 transition-colors">
                        <span>Private question</span><span className="text-gold">$20</span>
                    </button>
                    <button className="glass-card-inner w-full flex justify-between px-3 py-2 text-sm text-foreground/80 hover:border-gold/50 transition-colors">
                        <span>Voice note reply</span><span className="text-gold">$35</span>
                    </button>
                    <button className="glass-card-inner w-full flex justify-between px-3 py-2 text-sm text-foreground/80 hover:border-gold/50 transition-colors">
                        <span>1:1 mini chat (2 min)</span><span className="text-gold">$60</span>
                    </button>
                </div>
                <p className="text-xs text-muted-foreground italic">Creates a paid lane that does not depend on chat velocity.</p>
            </div>
        </div>
    );
};

export default PaidReactions;
