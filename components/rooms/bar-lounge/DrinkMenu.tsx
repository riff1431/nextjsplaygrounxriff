import React from "react";
import { Wine, Crown, Sparkles } from "lucide-react";

interface Drink {
    id: string;
    name: string;
    price: number;
    icon: string | React.ReactNode;
    tone: "pink" | "purple" | "blue" | "green" | "yellow" | "red";
    special?: "none" | "confetti" | "spotlight" | "champagne" | "vipbottle";
}

interface DrinkMenuProps {
    drinks: Drink[];
    creatorName: string;
    vipPrice: number;
    ultraVipPrice: number;
    onPurchaseDrink: (name: string, price: number, fxArgs: object) => void;
    onPurchaseVip: (name: string, price: number) => void;
    onReserveBooth: (price: number) => void;
}

const DrinkMenu: React.FC<DrinkMenuProps> = ({
    drinks,
    creatorName,
    vipPrice,
    ultraVipPrice,
    onPurchaseDrink,
    onPurchaseVip,
    onReserveBooth
}) => {
    return (
        <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-white/10">
            <div className="p-5 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3 mb-1">
                    <Wine className="w-5 h-5 text-gold" />
                    <h2 className="font-title text-2xl font-bold text-gold tracking-wide">
                        Buy a Drink
                    </h2>
                </div>
                <p className="text-white/60 text-xs font-medium tracking-wider uppercase">For {creatorName}</p>
            </div>

            <div className="flex-1 overflow-y-auto chat-scroll">
                <div className="divide-y divide-white/5">
                    {drinks.map((drink) => (
                        <div
                            key={drink.id}
                            className="drink-item group"
                            onClick={() => onPurchaseDrink(drink.name, drink.price, { special: drink.special })}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl group-hover:scale-110 transition-transform">{drink.icon}</span>
                                <span className="text-white/90 font-medium text-sm">{drink.name}</span>
                            </div>
                            <span className="text-gold font-bold text-sm bg-gold/5 px-2 py-1 rounded-lg border border-gold/10 group-hover:bg-gold/10 transition-colors">
                                ${drink.price}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-5 bg-black/40 border-t border-white/5 space-y-4">
                <h3 className="font-title text-xl font-bold text-white text-center tracking-wide">VIP Lounge</h3>

                <button
                    onClick={() => onPurchaseVip("VIP Upgrade", vipPrice)}
                    className="w-full text-left p-4 rounded-xl border border-gold/20 bg-gradient-to-br from-gold/10 to-transparent hover:from-gold/20 transition-all group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-gold animate-pulse" />
                            <span className="font-bold text-gold uppercase tracking-tighter">Upgrade to VIP</span>
                        </div>
                        <span className="text-gold font-black">${vipPrice}</span>
                    </div>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest leading-relaxed flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-gold/60" />
                        Unlock Exclusive Content & Perks
                    </p>
                </button>

                <button
                    onClick={() => onReserveBooth(300)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm group"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xl group-hover:scale-110 transition-transform">🛋️</span>
                        <div>
                            <span className="font-bold text-white block">Reserve a Booth</span>
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">Private (5 mins)</span>
                        </div>
                    </div>
                    <span className="text-gold font-bold">$300</span>
                </button>
            </div>
        </div>
    );
};

export default DrinkMenu;
