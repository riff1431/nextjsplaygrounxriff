import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";

const gifts = [
    { name: "Diamond", amount: 10, emoji: "💎" },
    { name: "Diamonds", amount: 25, emoji: "💎" },
    { name: "More Diamonds", amount: 50, emoji: "💎" },
    { name: "Big Money", amount: 100, emoji: "💰" },
];

const SendSugarGifts = ({ roomId }: { roomId: string | null }) => {
    const { sendGift } = useSuga4U(roomId);
    const { user } = useAuth();

    const handleGift = async (g: typeof gifts[0]) => {
        if (!roomId) return;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            await sendGift(g.amount, fanName, `Sent ${g.name}`);
            alert(`Gift sent: ${g.name} ($${g.amount})`);
        } catch (err) {
            console.error("Failed to send gift:", err);
        }
    };

    return (
        <div className="glass-panel p-3 bg-transparent border-gold/20">
            <div className="flex items-center justify-center mb-3">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3">Send Sugar Gifts</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
                {gifts.map((g) => (
                    <button
                        key={g.amount}
                        onClick={() => handleGift(g)}
                        disabled={!roomId}
                        className="neon-border-pink glass-panel py-3 text-center hover:bg-muted/50 transition-colors bg-transparent disabled:opacity-50"
                    >
                        <span className="text-lg">{g.emoji}</span>
                        <p className="text-foreground font-bold text-sm">${g.amount}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SendSugarGifts;
