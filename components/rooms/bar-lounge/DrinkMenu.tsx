import React from "react";
import { Wine, Crown, Sparkles } from "lucide-react";
import { cx, toneClasses } from "@/app/rooms/bar-lounge/page"; // We will export these utilities from page.tsx or duplicate them

interface Drink {
    id: string;
    name: string;
    price: number;
    icon: string | React.ReactNode;
    tone: "pink" | "purple" | "blue" | "green" | "yellow" | "red";
    special?: "none" | "confetti" | "spotlight";
}

interface DrinkMenuProps {
    drinks: Drink[];
    creatorName: string;
    vipPrice: number;
    ultraVipPrice: number;
    onPurchaseDrink: (name: string, price: number, fx: object) => void;
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
        <div className="p-4 flex flex-col h-full border border-violet-500/20 rounded-xl bg-black/40 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1">
                <Wine className="w-5 h-5 text-neon-purple animate-bl-glow-pulse" />
                <h2 className="font-display text-xl font-bold bl-glow-text-gold text-yellow-400">
                    Buy a Drink
                </h2>
            </div>
            <p className="text-gray-400 text-sm mb-4">for {creatorName}</p>

            <div className="border-t border-violet-500/30 pt-3">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 tracking-wider uppercase">
                    Drink Menu
                </h3>
                <div className="space-y-2">
                    {drinks.map((drink) => {
                        const t = toneClasses(drink.tone);
                        return (
                            <div
                                key={drink.id}
                                className={cx("bl-drink-item", t.border, t.glow)}
                                onClick={() => onPurchaseDrink(drink.name, drink.price, { special: drink.special })}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{drink.icon}</span>
                                    <span className="text-white font-medium text-sm">{drink.name}</span>
                                </div>
                                <span className="text-yellow-400 font-semibold">${drink.price}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="border-t border-violet-500/30 pt-4 mt-4 space-y-3">
                <h3 className="font-display text-lg font-bold text-white text-center">VIP Lounge</h3>

                <button
                    onClick={() => onPurchaseVip("VIP Booth", vipPrice)}
                    className="w-full text-left bl-glass-panel p-3 bl-glow-gold space-y-2 hover:-translate-y-0.5 transition-transform"
                >
                    <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-400 animate-bl-glow-pulse" />
                        <span className="font-bold text-yellow-400 bl-glow-text-gold">Upgrade to VIP - ${vipPrice}</span>
                    </div>
                    <ul className="text-sm text-gray-300 space-y-1 ml-7">
                        <li className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-pink-400" /> Exclusive Content</li>
                    </ul>
                </button>

                <button
                    onClick={() => onReserveBooth(300)}
                    className="w-full text-left bl-glass-panel p-3 flex items-center justify-between hover:-translate-y-0.5 transition-transform"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🛋️</span>
                        <div>
                            <span className="font-bold text-white text-sm">Reserve a Booth</span>
                            <span className="text-yellow-400 font-bold ml-2">$300</span>
                            <p className="text-xs text-gray-400">🎉 Private (5 mins)</p>
                        </div>
                    </div>
                </button>
            </div>

        </div>
    );
};

export default DrinkMenu;
