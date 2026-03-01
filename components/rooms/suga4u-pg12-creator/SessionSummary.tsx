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

const SessionSummary = () => {
    return (
        <div className="glass-panel p-4">
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Summary</h3>
            <div className="grid grid-cols-2 gap-2 mb-0">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-2 flex items-center gap-2">
                        <stat.icon className="w-4 h-4 text-primary" />
                        <div>
                            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                            <p className="text-xs font-bold text-foreground">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SessionSummary;
