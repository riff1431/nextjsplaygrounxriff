"use client";

import { Trophy, MapPin, Target, Users, DollarSign, Clock, Palette } from "lucide-react";
import { useState, useEffect } from "react";

const FcCompetitionCard = () => {
    const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 54, seconds: 17 });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                let { hours, minutes, seconds } = prev;
                seconds--;
                if (seconds < 0) { seconds = 59; minutes--; }
                if (minutes < 0) { minutes = 59; hours--; }
                if (hours < 0) { hours = 0; minutes = 0; seconds = 0; }
                return { hours, minutes, seconds };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const pad = (n: number) => n.toString().padStart(2, "0");

    return (
        <div className="fc-glass-card fc-neon-border rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 fc-text-primary" />
                    <h2 className="text-xl font-semibold text-white">Competitions</h2>
                </div>
                <div className="text-right">
                    <p className="text-xs text-white/60 uppercase tracking-wider">Remaining</p>
                    <p className="text-2xl font-bold fc-text-primary fc-neon-text font-body animate-pulse">
                        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 fc-text-primary" />
                    <h3 className="font-semibold text-white">Event Overview</h3>
                </div>
                <div className="space-y-2 pl-6 text-sm text-white/60">
                    <div className="flex items-start gap-2">
                        <Target className="w-3.5 h-3.5 mt-0.5 fc-text-primary/70" />
                        <span>Fixed prizes. Top 25 (1st €7500, 2nd €5500, 3rd €2500, 5th €300, 6-25 €100), Tips are 90/10</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="fc-text-primary/70">∧</span>
                        <span>Tips: Tips as 90/10</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 py-3 border-t border-b border-white/20">
                {[
                    { icon: Users, label: "Fans paid", value: "1200" },
                    { icon: DollarSign, label: "Entry fee", value: "€50" },
                    { icon: Clock, label: "Round", value: "4-up · 20s" },
                    { icon: Palette, label: "Theme", value: "Wet T-Shirt" },
                ].map((item, idx) => (
                    <div key={idx} className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-white/60 flex items-center justify-center gap-1">
                            <item.icon className="w-3 h-3" /> {item.label}
                        </p>
                        <p className="text-white font-semibold mt-1">{item.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FcCompetitionCard;
