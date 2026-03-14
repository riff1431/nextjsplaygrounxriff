import React from "react";
import { useSuga4U, CreatorFavorite } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { Eye, EyeOff, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

const categories = [
    { label: "CUTE", emoji: "🎀" },
    { label: "LUXURY", emoji: "💎" },
    { label: "DREAM", emoji: "👑" },
];

const CreatorFavorites = ({ roomId, hostId }: { roomId: string | null; hostId: string | null }) => {
    const { favorites, sendGift } = useSuga4U(roomId);
    const { user } = useAuth();
    const { balance, pay } = useWallet();
    const [activeTab, setActiveTab] = React.useState("CUTE");
    const [revealedIds, setRevealedIds] = React.useState<Set<string>>(new Set());
    const [confirmItem, setConfirmItem] = React.useState<{ item: CreatorFavorite; type: 'BUY' | 'REVEAL' } | null>(null);
    const [selectedItem, setSelectedItem] = React.useState<CreatorFavorite | null>(null);

    const handleAction = async (item: CreatorFavorite, type: 'BUY' | 'REVEAL') => {
        if (!roomId || !hostId) return;
        const amount = type === 'BUY' ? item.buy_price : (item.reveal_price || 0);
        if (amount <= 0) return;

        // Show confirmation modal
        setConfirmItem({ item, type });
    };

    const handleConfirmPayment = async () => {
        if (!confirmItem || !roomId || !hostId) return;
        const { item, type } = confirmItem;
        const amount = type === 'BUY' ? item.buy_price : (item.reveal_price || 0);
        const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
        const description = type === 'BUY' ? `Bought ${item.name}` : `Revealed ${item.name}`;

        // Deduct from fan wallet and transfer to creator
        const result = await pay(hostId, amount, description, roomId, 'suga_favorite', item.id);

        if (!result.success) {
            toast.error(result.error || "Payment failed");
            throw new Error(result.error);
        }

        // Log activity event
        await sendGift(amount, fanName, description);

        // If REVEAL, mark as revealed
        if (type === 'REVEAL') {
            setRevealedIds(prev => new Set(prev).add(item.id));
            toast.success(`🔓 Revealed: ${item.name}`, { description: item.description || "Item details unlocked!" });
        } else {
            toast.success(`🎁 Bought "${item.name}" for her!`, { description: `$${amount} sent to creator` });
        }
    };

    const filteredFavorites = favorites.filter(f => f.category === activeTab);
    const isRevealed = (id: string) => revealedIds.has(id);

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
                        <div key={item.id} className="glass-panel neon-border-pink p-2 bg-transparent">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                                    {item.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isRevealed(item.id) ? (
                                        <>
                                            <p className="font-bold text-sm tracking-tight truncate text-pink-light">
                                                {item.emoji} {item.name}
                                            </p>
                                            {item.description && (
                                                <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{item.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <button
                                                    onClick={() => setSelectedItem(item)}
                                                    className="flex items-center gap-1.5 px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white font-bold text-[10px] rounded-full transition-colors w-fit shadow-md"
                                                >
                                                    OPEN
                                                </button>
                                                {item.link && (
                                                    <a
                                                        href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-gold/20 hover:bg-gold/40 text-gold font-bold text-[10px] rounded-full transition-colors w-fit border border-gold/50 shadow-md"
                                                    >
                                                        Get Link
                                                    </a>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-bold text-sm tracking-tight truncate text-white/50 flex items-center gap-1">
                                                <EyeOff className="w-3.5 h-3.5 inline" /> Hidden Favorite
                                            </p>
                                            <p className="text-gold font-bold text-xs">${item.buy_price.toLocaleString()}</p>
                                        </>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                    {!isRevealed(item.id) && item.reveal_price !== null && (
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
                        </div>
                    ))
                )}
            </div>

            {/* Spend Confirmation Modal */}
            {confirmItem && (
                <SpendConfirmModal
                    isOpen={true}
                    onClose={() => setConfirmItem(null)}
                    onConfirm={handleConfirmPayment}
                    title={confirmItem.type === 'REVEAL' ? "Reveal Favorite" : "Buy For Her"}
                    itemLabel={confirmItem.type === 'REVEAL' ? `Reveal: ${confirmItem.item.name}` : confirmItem.item.name}
                    amount={confirmItem.type === 'BUY' ? confirmItem.item.buy_price : (confirmItem.item.reveal_price || 0)}
                    walletBalance={balance}
                    description={confirmItem.type === 'REVEAL'
                        ? "This will reveal the item's name and description to you."
                        : `Gift "${confirmItem.item.name}" to the creator.`}
                    confirmLabel={confirmItem.type === 'REVEAL' ? "Reveal Now" : "Buy Now"}
                />
            )}

            {/* Item Details Modal */}
            {selectedItem && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelectedItem(null)}
                >
                    <div 
                        className="relative w-full max-w-sm glass-panel p-5 animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-3 right-3 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="flex flex-col items-center text-center mt-2">
                            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center text-4xl mb-4 border border-white/10 shadow-lg">
                                {selectedItem.emoji}
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-2">{selectedItem.name}</h3>
                            
                            {selectedItem.description && (
                                <p className="text-sm text-white/70 mb-5">{selectedItem.description}</p>
                            )}
                            
                            {selectedItem.link && (
                                <a 
                                    href={selectedItem.link.startsWith('http') ? selectedItem.link : `https://${selectedItem.link}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg transition-colors shadow-lg"
                                >
                                    <ExternalLink className="w-4 h-4" /> Open Link
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreatorFavorites;
