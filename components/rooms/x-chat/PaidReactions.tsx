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
    { label: "Pin my name to top (1 min)", price: 25, type: "pin" },
    { label: "Voice note reply", price: 35, type: "voice_note_boost" },
];

const directAccess = [
    { label: "Private question", price: 20, type: "private_question" },
    { label: "1:1 mini chat (2 min)", price: 60, type: "mini_chat" },
];

interface PaidReactionsProps {
    roomId?: string | null;
}

const PaidReactions = ({ roomId }: PaidReactionsProps) => {
    const { balance, refresh } = useWallet();
    const [pending, setPending] = useState<{ label: string; price: number; reactionType: string; emoji?: string } | null>(null);
    const [animatingEmoji, setAnimatingEmoji] = useState<string | null>(null);
    const [voicePrompt, setVoicePrompt] = useState("");

    const handleSend = async () => {
        if (!pending || !roomId) return;
        try {
            // Voice notes map to incoming requests, NOT reactions!
            if (pending.reactionType === "voice_note_boost") {
                const res = await fetch(`/api/v1/rooms/${roomId}/x-chat/request`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        message: `Voice Note Reply: ${voicePrompt}` 
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    toast.success("Voice note request sent!");
                    setPending(null);
                    setVoicePrompt("");
                } else {
                    toast.error(data.error || "Failed to send request");
                }
                return;
            }

            const res = await fetch(`/api/v1/rooms/${roomId}/x-chat/reaction`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reactionType: pending.reactionType,
                    amount: pending.price,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`${pending.emoji || "✨"} ${pending.label} sent!`);
                refresh?.();
                setPending(null); // Clear pending state so modal closes
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
                            onClick={() => setPending({ label: r.label, price: r.price, reactionType: `reaction_${r.label.toLowerCase()}`, emoji: r.emoji })}
                            className="glass-card-inner px-3 py-2 text-sm text-foreground hover:border-gold/50 hover:bg-gold/5 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <span>{r.emoji}</span>
                            <span>{r.label} ${r.price}</span>
                        </button>
                    ))}
                </div>

            </div>

            {/* Paid Stickers */}
            <div className="glass-card p-4">
                <h3 className="font-display text-gold text-sm mb-3">Paid Stickers</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    {stickers.map((s) => (
                        <button
                            key={s.label}
                            onClick={() => setPending({ label: s.label, price: s.price, reactionType: `sticker_${s.label.toLowerCase()}`, emoji: s.emoji })}
                            className="glass-card-inner px-3 py-2 text-sm text-foreground hover:border-gold/50 hover:bg-gold/5 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <span>{s.emoji}</span>
                            <span>{s.label} ${s.price}</span>
                        </button>
                    ))}
                </div>

            </div>

            {/* Visibility Boosts */}
            <div className="glass-card p-2">
                <h3 className="font-display text-gold text-sm mb-3">Visibility Boosts</h3>
                <div className="space-y-2 mb-2">
                    {boosts.map((b) => (
                        <button
                            key={b.type}
                            onClick={() => setPending({ label: b.label, price: b.price, reactionType: b.type })}
                            className="glass-card-inner w-full flex justify-between px-3 py-2 text-sm text-foreground/80 hover:border-gold/50 hover:bg-gold/5 transition-all active:scale-[0.98]"
                        >
                            <span>{b.label}</span><span className="text-gold">${b.price}</span>
                        </button>
                    ))}
                </div>

            </div>

            {/* Direct Access */}
            <div className="glass-card p-2">
                <h3 className="font-display text-gold text-sm mb-3">Direct Access</h3>
                <div className="space-y-2 mb-2">
                    {directAccess.map((d) => (
                        <button
                            key={d.type}
                            onClick={() => setPending({ label: d.label, price: d.price, reactionType: d.type })}
                            className="glass-card-inner w-full flex justify-between px-3 py-2 text-sm text-foreground/80 hover:border-gold/50 hover:bg-gold/5 transition-all active:scale-[0.98]"
                        >
                            <span>{d.label}</span><span className="text-gold">${d.price}</span>
                        </button>
                    ))}
                </div>

            </div>

            {/* Spend Confirm Modal */}
            <SpendConfirmModal
                isOpen={!!pending}
                onClose={() => { setPending(null); setVoicePrompt(""); }}
                title={pending?.reactionType === "voice_note_boost" ? "Request Voice Note" : "Confirm Purchase"}
                itemLabel={pending ? `${pending.emoji || ""} ${pending.label}` : ""}
                amount={pending?.price || 0}
                walletBalance={balance}
                onConfirm={handleSend}
                requireInput={pending?.reactionType === "voice_note_boost"}
                inputPlaceholder="What should the voice note be about?"
                inputValue={voicePrompt}
                onInputChange={setVoicePrompt}
            />
        </div>
    );
};

export default PaidReactions;
