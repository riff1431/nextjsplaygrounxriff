"use client";

import { useState } from "react";
import { Heart, DollarSign, Users, Clock, TrendingUp, Gift, X, BarChart2 } from "lucide-react";

const stats = [
    { icon: DollarSign, label: "Total Earned", value: "$2,450" },
    { icon: Users, label: "Viewers", value: "1,247" },
    { icon: Clock, label: "Duration", value: "2h 34m" },
    { icon: TrendingUp, label: "Peak Viewers", value: "892" },
    { icon: Gift, label: "Tips Received", value: "38" },
    { icon: Heart, label: "Likes", value: "4,521" },
];

const S4uSessionSummary = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-400 font-bold text-xs hover:bg-pink-500/30 transition-colors"
            >
                <BarChart2 className="w-4 h-4" /> View Session Stats
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
                    
                    <div className="relative s4u-creator-glass-panel p-6 w-full max-w-sm rounded-2xl border border-pink-500/20 shadow-2xl">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 p-1 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-white/50" />
                        </button>

                        <div className="flex items-center gap-2 mb-6">
                            <BarChart2 className="w-5 h-5 text-pink-500" />
                            <h3 className="s4u-creator-font-display text-xl font-bold text-white">Session Summary</h3>
                            <div className="flex gap-1 ml-auto mr-4">
                                {[1, 2, 3].map((i) => (
                                    <span
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-pink-400 s4u-creator-animate-pulse"
                                        style={{ animationDelay: `${i * 0.3}s` }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {stats.map((stat, i) => (
                                <div key={i} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-white/50">
                                        <stat.icon className="w-3.5 h-3.5 s4u-creator-text-primary" />
                                        <p className="text-[10px] uppercase font-bold tracking-wider">{stat.label}</p>
                                    </div>
                                    <p className="text-lg font-bold text-white">{stat.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default S4uSessionSummary;
