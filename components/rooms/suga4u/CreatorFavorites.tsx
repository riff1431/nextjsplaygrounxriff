import React from "react";
import { useSuga4U, CreatorFavorite } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";

const categories = [
    { label: "CUTE", emoji: "🎀" },
    { label: "LUXURY", emoji: "💎" },
    { label: "DREAM", emoji: "👑" },
];

const CreatorFavorites = ({ roomId }: { roomId: string | null }) => {
    const { favorites, sendGift } = useSuga4U(roomId);
    const { user } = useAuth();
    const [activeTab, setActiveTab] = React.useState("CUTE");

    const handleAction = async (item: CreatorFavorite, type: 'BUY' | 'REVEAL') => {
        if (!roomId) return;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            const amount = type === 'BUY' ? item.buy_price : (item.reveal_price || 0);
            const label = type === 'BUY' ? `Bought ${item.name}` : `Revealed ${item.name}`;
            await sendGift(amount, fanName, label);
            alert(`${type === 'BUY' ? 'Purchase' : 'Reveal'} successful: ${item.name}`);
        } catch (err) {
            console.error(`Failed to ${type}:`, err);
        }
    };

    const filteredFavorites = favorites.filter(f => f.category === activeTab);

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
                    <button 
                        key={c.label} 
                        onClick={() => setActiveTab(c.label)}
                        className={`flex-1 border rounded-full px-1 py-1.5 text-[11px] font-bold tracking-wider transition-colors ${activeTab === c.label ? 'bg-pink/20 border-pink' : 'bg-muted/50 border-gold/20 hover:border-pink/50'}`}
                    >
                        {c.emoji} {c.label}
                    </button>
                ))}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 chat-scroll">
                {filteredFavorites.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/40 text-sm italic">
                        No items in {activeTab}
                    </div>
                ) : (
                    filteredFavorites.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 glass-panel neon-border-pink p-1 bg-transparent">
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                                {item.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm tracking-tight truncate">{item.name} {item.emoji}</p>
                                <p className="text-gold font-bold text-xs">${item.buy_price.toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col gap-1 flex-shrink-0">
                                {item.reveal_price !== null && (
                                    <button
                                        onClick={() => handleAction(item, 'REVEAL')}
                                        disabled={!roomId}
                                        className="btn-pink px-3 py-1 text-[10px] rounded-full disabled:opacity-50"
                                    >
                                        REVEAL ${item.reveal_price}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleAction(item, 'BUY')}
                                    disabled={!roomId}
                                    className="btn-gold px-3 py-1 text-[10px] rounded-full disabled:opacity-50"
                                >
                                    BUY FOR HER
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CreatorFavorites;
