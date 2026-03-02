"use client";

import React, { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";

const reactions = [
    { emoji: "🔥", label: "Boost", price: 2 },
    { emoji: "💎", label: "Shine", price: 5 },
    { emoji: "🤟", label: "Crown", price: 10 },
    { emoji: "⚡", label: "Pulse", price: 15 },
];

const stickers = [
    { emoji: "💋", label: "Kiss", price: 5 },
    { emoji: "😈", label: "Tease", price: 10 },
    { emoji: "🌹", label: "Rose", price: 25 },
    { emoji: "🎁", label: "Gift", price: 50 },
];

const boosts = [
    { label: "Pin my message (1 min)", price: 25, type: "pin" },
    { label: "Highlight badge (2 min)", price: 40, type: "highlight" },
    { label: "Priority queue (5 min)", price: 75, type: "priority" },
];

const directAccess = [
    { label: "Private question", price: 20, type: "private_question" },
    { label: "Voice note reply", price: 35, type: "voice_note" },
    { label: "1:1 mini chat (2 min)", price: 60, type: "mini_chat" },
];

interface PaidReactionsProps {
    roomId?: string | null;
}

const PaidReactions = ({ roomId }: PaidReactionsProps) => {
    const { balance } = useWallet();
    const [pending, setPending] = useState<{ label: string; price: number; type: string; emoji?: string } | null>(null);
    const [animatingEmoji, setAnimatingEmoji] = useState<string | null>(null);

    const handleSend = async () => {
        if (!pending || !roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/x-chat/reaction`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: pending.type,
                    label: pending.label,
                    amount: pending.price,
                    emoji: pending.emoji,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`${pending.emoji || "✨"} ${pending.label} sent!`);
                // Show floating animation
                if (pending.emoji) {
                    setAnimatingEmoji(pending.emoji);
                    setTimeout(() => setAnimatingEmoji(null), 1500);
                }
            } else {
                toast.error(data.error || "Failed to send");
            }
        } catch {
            toast.error("Network error");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            {/* Floating emoji animation */}
            {animatingEmoji && (
                <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
                    <span className="text-6xl animate-bounce opacity-80 drop-shadow-lg">{animatingEmoji}</span>
                </div>
            )}

            {/* Paid Reactions */}
            <div className="glass-card p-4">
                <h3 className="font-display text-gold text-sm mb-3">Paid Reactions</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    {reactions.map((r) => (
                        <button
                            key={r.label}
                            onClick={() => setPending({ label: r.label, price: r.price, type: "reaction", emoji: r.emoji })}
                            className="glass-card-inner px-3 py-2 text-sm text-foreground hover:border-gold/50 hover:bg-gold/5 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <span>{r.emoji}</span>
                            <span>{r.label} ${r.price}</span>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground italic">One-tap micro-spend to surface in chat</p>
            </div>

            {/* Paid Stickers */}
            <div className="glass-card p-4">
                <h3 className="font-display text-gold text-sm mb-3">Paid Stickers</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    {stickers.map((s) => (
                        <button
                            key={s.label}
                            onClick={() => setPending({ label: s.label, price: s.price, type: "sticker", emoji: s.emoji })}
                            className="glass-card-inner px-3 py-2 text-sm text-foreground hover:border-gold/50 hover:bg-gold/5 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <span>{s.emoji}</span>
                            <span>{s.label} ${s.price}</span>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground italic">Stickers trigger on-stream overlays.</p>
            </div>

            {/* Visibility Boosts */}
            <div className="glass-card p-2">
                <h3 className="font-display text-gold text-sm mb-3">Visibility Boosts</h3>
                <div className="space-y-2 mb-2">
                    {boosts.map((b) => (
                        <button
                            key={b.type}
                            onClick={() => setPending({ label: b.label, price: b.price, type: b.type })}
                            className="glass-card-inner w-full flex justify-between px-3 py-2 text-sm text-foreground/80 hover:border-gold/50 hover:bg-gold/5 transition-all active:scale-[0.98]"
                        >
                            <span>{b.label}</span><span className="text-gold">${b.price}</span>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground italic">Boosts are time-bound and non-refundable.</p>
            </div>

            {/* Direct Access */}
            <div className="glass-card p-2">
                <h3 className="font-display text-gold text-sm mb-3">Direct Access</h3>
                <div className="space-y-2 mb-2">
                    {directAccess.map((d) => (
                        <button
                            key={d.type}
                            onClick={() => setPending({ label: d.label, price: d.price, type: d.type })}
                            className="glass-card-inner w-full flex justify-between px-3 py-2 text-sm text-foreground/80 hover:border-gold/50 hover:bg-gold/5 transition-all active:scale-[0.98]"
                        >
                            <span>{d.label}</span><span className="text-gold">${d.price}</span>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground italic">Creates a paid lane independent of chat velocity.</p>
            </div>

            {/* Spend Confirm Modal */}
            <SpendConfirmModal
                isOpen={!!pending}
                onClose={() => setPending(null)}
                title="Confirm Purchase"
                itemLabel={pending ? `${pending.emoji || ""} ${pending.label}` : ""}
                amount={pending?.price || 0}
                walletBalance={balance}
                onConfirm={handleSend}
            />
        </div>
    );
};

export default PaidReactions;
