"use client";

import { Plus } from "lucide-react";

const items = [
    { emoji: "👙", name: "Pink Lingerie", detail: "I Love You set ✨", price: "$200" },
    { emoji: "🌸", name: "Chanel #5", detail: "250ml", price: "$75" },
    { emoji: "💎", name: "Crystal Toy", detail: "$100 💜", price: "$100" },
    { emoji: "👠", name: "Red Heels", detail: "Size 7, Louboutin", price: "$650" },
    { emoji: "🎀", name: "Silk Robe", detail: "Rose gold satin", price: "$120" },
    { emoji: "💄", name: "MAC Lipstick Set", detail: "Ruby Woo collection", price: "$85" },
    { emoji: "🧴", name: "Body Oil", detail: "Shimmer gold 200ml", price: "$45" },
    { emoji: "🌹", name: "Rose Bouquet", detail: "50 red roses 🌹", price: "$150" },
    { emoji: "📱", name: "Ring Light Pro", detail: "18 inch RGB", price: "$90" },
];

const S4uCreatorsFavorites = () => {
    return (
        <div className="s4u-creator-glass-panel p-4 flex flex-col h-full">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3">Creators Favorites</h3>
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3 pr-2">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{item.emoji}</span>
                                <div>
                                    <p className="text-sm font-semibold text-white">{item.name}</p>
                                    <p className="text-xs text-white/50">{item.detail}</p>
                                </div>
                            </div>
                            <span className="text-sm font-bold s4u-creator-text-gold">{item.price}</span>
                        </div>
                    ))}
                </div>
            </div>
            <button className="mt-3 flex items-center gap-1 text-sm s4u-creator-text-primary hover:opacity-80 transition-opacity">
                <Plus className="w-4 h-4" /> Add item
            </button>
        </div>
    );
};

export default S4uCreatorsFavorites;
