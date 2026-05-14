"use client";

import { Heart, Plus, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cs } from "@/utils/currency";

const items = [
    { emoji: "👙", name: "Pink Lingerie", detail: "I Love You set ✨", price: "${cs()}200" },
    { emoji: "🌸", name: "Chanel #5", detail: "250ml", price: "${cs()}75" },
    { emoji: "💎", name: "Crystal Toy", detail: "${cs()}100 💜", price: "${cs()}100" },
    { emoji: "👠", name: "Red Heels", detail: "Size 7, Louboutin", price: "${cs()}650" },
    { emoji: "🎀", name: "Silk Robe", detail: "Rose gold satin", price: "${cs()}120" },
    { emoji: "💄", name: "MAC Lipstick Set", detail: "Ruby Woo collection", price: "${cs()}85" },
    { emoji: "🧴", name: "Body Oil", detail: "Shimmer gold 200ml", price: "${cs()}45" },
    { emoji: "🌹", name: "Rose Bouquet", detail: "50 red roses 🌹", price: "${cs()}150" },
    { emoji: "📱", name: "Ring Light Pro", detail: "18 inch RGB", price: "${cs()}90" },
];

const CreatorsFavorites = () => {
    return (
        <div className="glass-panel p-4 flex flex-col h-full">
            <h3 className="font-display text-lg font-bold text-foreground mb-3">Creators Favorites</h3>
            <ScrollArea className="flex-1">
                <div className="space-y-3 pr-2">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{item.emoji}</span>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                                </div>
                            </div>
                            <span className="text-sm font-bold text-gold">{item.price}</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <button className="mt-3 flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors">
                <Plus className="w-4 h-4" /> Add item
            </button>
        </div>
    );
};

export default CreatorsFavorites;
