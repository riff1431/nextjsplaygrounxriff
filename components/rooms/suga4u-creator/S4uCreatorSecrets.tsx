"use client";

import { Plus } from "lucide-react";

const secrets = [
    { user: "Candy4U", text: "Deep kissing story", amount: "$400" },
    { user: "JohnnyBlaze", text: "Spicy fantasy confession", amount: "$500" },
    { user: "MidnightLover", text: "Private dance request", amount: "$300" },
    { user: "SilkDream", text: "Whisper session ASMR", amount: "$250" },
    { user: "GoldenKing", text: "Custom roleplay scenario", amount: "$600" },
    { user: "VelvetTouch", text: "Poetry reading request", amount: "$150" },
    { user: "CrystalGaze", text: "Truth or dare game", amount: "$350" },
    { user: "RubyHeart", text: "Singing a love song", amount: "$200" },
];

const S4uCreatorSecrets = () => {
    return (
        <div className="s4u-creator-glass-panel p-4 flex flex-col h-full">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3">Creator Secrets</h3>
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3 pr-2">
                    {secrets.map((s, i) => (
                        <div key={i} className="bg-white/5 rounded-lg px-3 py-2.5">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🌸</span>
                                    <span className="text-sm font-semibold text-white">{s.user}</span>
                                </div>
                                <span className="text-sm font-bold s4u-creator-text-gold">{s.amount}</span>
                            </div>
                            <p className="text-xs text-white/50 mb-2 ml-7">{s.text}</p>
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

export default S4uCreatorSecrets;
