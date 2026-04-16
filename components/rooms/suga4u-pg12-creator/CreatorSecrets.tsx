"use client";

import { Heart, Plus, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const secrets = [
    { user: "Candy4U", text: "Deep kissing story", amount: "€400" },
    { user: "JohnnyBlaze", text: "Spicy fantasy confession", amount: "€500" },
    { user: "MidnightLover", text: "Private dance request", amount: "€300" },
    { user: "SilkDream", text: "Whisper session ASMR", amount: "€250" },
    { user: "GoldenKing", text: "Custom roleplay scenario", amount: "€600" },
    { user: "VelvetTouch", text: "Poetry reading request", amount: "€150" },
    { user: "CrystalGaze", text: "Truth or dare game", amount: "€350" },
    { user: "RubyHeart", text: "Singing a love song", amount: "€200" },
];

const CreatorSecrets = () => {
    return (
        <div className="glass-panel p-4 flex flex-col h-full">
            <h3 className="font-display text-lg font-bold text-foreground mb-3">Creator Secrets</h3>
            <ScrollArea className="flex-1">
                <div className="space-y-3 pr-2">
                    {secrets.map((s, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg px-3 py-2.5">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🌸</span>
                                    <span className="text-sm font-semibold text-foreground">{s.user}</span>
                                </div>
                                <span className="text-sm font-bold text-gold">{s.amount}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 ml-7">{s.text}</p>
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

export default CreatorSecrets;
