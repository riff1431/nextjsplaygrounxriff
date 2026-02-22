import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";

const actions = [
    { name: "Say My Name", price: 20, emoji: "💋" },
    { name: "Sponsor Room", price: 100, emoji: "💎" },
    { name: "Voice Note", price: 35, emoji: "🎙️" },
    { name: "Photo Drop", price: 45, emoji: "📸" },
    { name: "Private 1-on-1", price: 500, emoji: "👑", full: true },
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
            <div className="grid grid-cols-2 gap-2">
                {actions.filter(a => !a.full).map((a) => (
                    <button
                        key={a.name}
                        onClick={() => handleAction(a)}
                        disabled={!roomId}
                        className="neon-border-pink glass-panel py-2 px-2 text-center hover:bg-muted/50 transition-colors bg-transparent disabled:opacity-50"
                    >
                        <span className="text-[11px] block mb-1 uppercase tracking-tight">{a.emoji} {a.name}</span>
                        <p className="text-pink font-bold text-sm">${a.price}</p>
                    </button>
                ))}
            </div>
            {actions.filter(a => a.full).map((a) => (
                <button
                    key={a.name}
                    onClick={() => handleAction(a)}
                    disabled={!roomId}
                    className="w-full mt-2 btn-pink py-2 text-sm glow-pink disabled:opacity-50 uppercase font-bold"
                >
                    {a.emoji} {a.name} <span className="font-bold ml-1">${a.price}</span>
                </button>
            ))}
        </div>
    );
};

export default QuickPaidActions;
