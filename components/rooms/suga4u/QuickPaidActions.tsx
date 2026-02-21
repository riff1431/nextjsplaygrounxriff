import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";

const actions = [
    { name: "Fan of the Day", price: 50, emoji: "🌟" },
    { name: "Sponsor Room", price: 100, emoji: "💎" },
    { name: "VIP Recognition", price: 200, emoji: "🏆" },
];

const QuickPaidActions = ({ roomId }: { roomId: string | null }) => {
    const { sendGift } = useSuga4U(roomId);
    const { user } = useAuth();

    const handleAction = async (a: typeof actions[0]) => {
        if (!roomId) return;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            await sendGift(a.price, fanName, `Unlocked: ${a.name}`);
            alert(`Action triggered: ${a.name}`);
        } catch (err) {
            console.error("Failed to trigger action:", err);
        }
    };

    return (
        <div className="glass-panel p-3 bg-transparent border-gold/20">
            <div className="flex items-center justify-center mb-3">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3">Quick Paid Actions</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>
            <div className="space-y-2">
                {actions.map((a) => (
                    <button
                        key={a.name}
                        onClick={() => handleAction(a)}
                        disabled={!roomId}
                        className="w-full neon-border-pink glass-panel py-2 px-3 text-left hover:bg-muted/50 transition-colors bg-transparent flex items-center justify-between disabled:opacity-50"
                    >
                        <span className="text-[10px]">{a.emoji} {a.name}</span>
                        <span className="text-gold font-bold text-sm">${a.price}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickPaidActions;
