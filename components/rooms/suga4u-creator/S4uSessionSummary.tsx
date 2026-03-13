"use client";

import { Heart, DollarSign, Users, Clock, TrendingUp, Gift } from "lucide-react";

const stats = [
    { icon: DollarSign, label: "Total Earned", value: "$2,450" },
    { icon: Users, label: "Viewers", value: "1,247" },
    { icon: Clock, label: "Duration", value: "2h 34m" },
    { icon: TrendingUp, label: "Peak Viewers", value: "892" },
    { icon: Gift, label: "Tips Received", value: "38" },
    { icon: Heart, label: "Likes", value: "4,521" },
];

const S4uSessionSummary = () => {
    return (
        <div className="s4u-creator-glass-panel p-4">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3">Summary</h3>
            <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4].map((i) => (
                    <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-pink-400 s4u-creator-animate-pulse"
                        style={{ animationDelay: `${i * 0.3}s` }}
                    />
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2 flex items-center gap-2">
                        <stat.icon className="w-4 h-4 s4u-creator-text-primary" />
                        <div>
                            <p className="text-[10px] text-white/50">{stat.label}</p>
                            <p className="text-xs font-bold text-white">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default S4uSessionSummary;
