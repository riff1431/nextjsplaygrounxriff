import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";

const categories = [
    { label: "CUTE", emoji: "🎀" },
    { label: "LUXURY", emoji: "💎" },
    { label: "DREAM", emoji: "👑" },
];

const favorites = [
    { name: "Lv Bag", emoji: "💖", price: 2500, reveal: 15 },
    { name: "Diamond Set +", emoji: "💎", price: 3500, reveal: 25 },
    { name: "Bedroom Vibes", emoji: "🌹", price: 1599, reveal: null },
];

const CreatorFavorites = ({ roomId }: { roomId: string | null }) => {
    const { sendGift } = useSuga4U(roomId);
    const { user } = useAuth();

    const handleAction = async (item: typeof favorites[0], type: 'BUY' | 'REVEAL') => {
        if (!roomId) return;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            const amount = type === 'BUY' ? item.price : (item.reveal || 0);
            const label = type === 'BUY' ? `Bought ${item.name}` : `Revealed ${item.name}`;
            await sendGift(amount, fanName, label);
            alert(`${type === 'BUY' ? 'Purchase' : 'Reveal'} successful: ${item.name}`);
        } catch (err) {
            console.error(`Failed to ${type}:`, err);
        }
    };

    return (
        <div className="glass-panel flex flex-col h-full bg-transparent border-gold/20">
            <div className="flex items-center justify-center p-3 border-b border-gold/20">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3">Creator Favorites</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 p-3 pb-0">
                {categories.map((c) => (
                    <button key={c.label} className="flex-1 bg-muted/50 border border-gold/20 rounded-full px-1 py-1.5 text-[11px] font-bold tracking-wider hover:border-pink/50 transition-colors uppercase">
                        {c.emoji} {c.label}
                    </button>
                ))}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 chat-scroll">
                {favorites.map((item) => (
                    <div key={item.name} className="flex items-center gap-3 glass-panel neon-border-pink p-1 bg-transparent">
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                            {item.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm tracking-tight truncate">{item.name} {item.emoji}</p>
                            <p className="text-gold font-bold text-xs">${item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                            {item.reveal && (
                                <button
                                    onClick={() => handleAction(item, 'REVEAL')}
                                    disabled={!roomId}
                                    className="btn-pink px-3 py-1 text-[10px] rounded-full disabled:opacity-50 uppercase"
                                >
                                    REVEAL ${item.reveal}
                                </button>
                            )}
                            <button
                                onClick={() => handleAction(item, 'BUY')}
                                disabled={!roomId}
                                className="btn-gold px-3 py-1 text-[10px] rounded-full disabled:opacity-50 uppercase"
                            >
                                BUY FOR HER
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CreatorFavorites;
