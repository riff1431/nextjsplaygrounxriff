"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSuga4U } from "@/hooks/useSuga4U";

const categories = [
    { label: "CUTE", emoji: "🎀" },
    { label: "LUXURY", emoji: "💎" },
    { label: "DREAM", emoji: "👑" },
];

const S4uCreatorsFavorites = ({ roomId }: { roomId?: string }) => {
    const { favorites, createFavorite, deleteFavorite } = useSuga4U(roomId || null);
    const [isAdding, setIsAdding] = useState(false);
    
    // Form state
    const [emoji, setEmoji] = useState("💖");
    const [name, setName] = useState("");
    const [detail, setDetail] = useState("");
    const [link, setLink] = useState("");
    const [category, setCategory] = useState("CUTE");
    const [buyPrice, setBuyPrice] = useState("");
    const [revealPrice, setRevealPrice] = useState("");

    const handleAdd = async () => {
        if (!name || !buyPrice) return;
        await createFavorite(name, detail, category, emoji, Number(buyPrice), revealPrice ? Number(revealPrice) : null, link || null);
        setIsAdding(false);
        setName("");
        setDetail("");
        setLink("");
        setCategory("CUTE");
        setBuyPrice("");
        setRevealPrice("");
    };

    return (
        <div className="s4u-creator-glass-panel p-4 flex flex-col h-full">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3">Creators Favorites</h3>
            <div className="flex-1 overflow-y-auto min-h-0 chat-scroll">
                <div className="space-y-3 pr-2">
                    {favorites.length === 0 && !isAdding && (
                        <p className="text-xs text-white/50 text-center py-4">No favorites created yet</p>
                    )}
                    {favorites.map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 relative group">
                            <div className="flex items-center gap-3 w-[70%]">
                                <span className="text-xl shrink-0">{item.emoji}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">{item.category}</span>
                                    </div>
                                    {item.description && <p className="text-[11px] text-white/50 truncate mt-0.5">{item.description}</p>}
                                    {item.link && <p className="text-[10px] text-pink-400/80 truncate mt-0.5">🔗 {item.link}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-auto pl-2">
                                <span className="text-sm font-bold s4u-creator-text-gold">${item.buy_price}</span>
                                <button 
                                    onClick={() => deleteFavorite(item.id)}
                                    className="text-white/40 hover:text-red-400 transition-colors p-1"
                                    title="Delete favorite"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {isAdding && (
                        <div className="bg-white/10 border border-gold/30 rounded-lg p-3 space-y-2 mt-2">
                            {/* Category selector */}
                            <div className="flex gap-1 mb-1">
                                {categories.map((c) => (
                                    <button
                                        key={c.label}
                                        onClick={() => setCategory(c.label)}
                                        className={`flex-1 border rounded-full px-1 py-1 text-[10px] font-bold tracking-wider transition-colors ${
                                            category === c.label
                                                ? 'bg-pink-500/30 border-pink-500 text-white'
                                                : 'bg-white/5 border-white/10 text-white/50 hover:border-pink-500/50'
                                        }`}
                                    >
                                        {c.emoji} {c.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Emoji" value={emoji} onChange={e => setEmoji(e.target.value)} className="w-12 bg-black/20 rounded px-2 py-1 text-center text-sm text-white border border-white/5 focus:border-pink-500/50 outline-none" />
                                <input type="text" placeholder="Item Name" value={name} onChange={e => setName(e.target.value)} className="flex-1 bg-black/20 rounded px-2 py-1 text-sm text-white border border-white/5 focus:border-pink-500/50 outline-none" />
                            </div>
                            <input type="text" placeholder="Description (optional)" value={detail} onChange={e => setDetail(e.target.value)} className="w-full bg-black/20 rounded px-2 py-1 text-xs text-white border border-white/5 focus:border-pink-500/50 outline-none" />
                            <input type="url" placeholder="Secret Link (optional, e.g. mega.nz/...)" value={link} onChange={e => setLink(e.target.value)} className="w-full bg-black/20 rounded px-2 py-1 text-xs text-pink-200 placeholder:text-pink-200/40 border border-white/5 focus:border-pink-500/50 outline-none" />
                            <div className="flex gap-2">
                                <input type="number" placeholder="Buy Price ($)" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} className="flex-1 bg-black/20 rounded px-2 py-1 text-sm text-white border border-white/5 focus:border-gold/50 outline-none" />
                                <input type="number" placeholder="Reveal Price (opt)" value={revealPrice} onChange={e => setRevealPrice(e.target.value)} className="flex-1 bg-black/20 rounded px-2 py-1 text-sm text-white border border-white/5 focus:border-gold/50 outline-none" />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={handleAdd} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold py-1.5 rounded">Save</button>
                                <button onClick={() => setIsAdding(false)} className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1.5 rounded">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {!isAdding && (
                <button onClick={() => setIsAdding(true)} className="mt-3 flex items-center gap-1 text-sm s4u-creator-text-primary hover:opacity-80 transition-opacity">
                    <Plus className="w-4 h-4" /> Add item
                </button>
            )}
        </div>
    );
};

export default S4uCreatorsFavorites;
