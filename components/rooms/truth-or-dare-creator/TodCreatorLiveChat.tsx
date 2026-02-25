"use client";

import { Heart, Search, Send } from "lucide-react";
import { useState } from "react";

const messages = [
    { user: "KittyKat 💕", text: "Hey cuties! 😘😘", color: "text-[hsl(320_80%_65%)]" },
    { user: "Alex99", text: "Truth or dare?! Spin the bottle!", color: "text-[hsl(220_85%_65%)]" },
    { user: "GamerBro Tips5", text: "$5 xcool! Deaks!", color: "text-[hsl(45_90%_60%)]" },
    { user: "MaxPower", text: "Dare King is unbeatable tonight!🤴", color: "text-[hsl(160_80%_55%)]" },
    { user: "CoolDude 🎭", text: "Spin the bottle! 🎉🍾", color: "text-white/90" },
    { user: "Emma45 🦋", text: "I dare you to do something crazy!", color: "text-[hsl(320_80%_65%)]" },
];

const TodCreatorLiveChat = () => {
    const [msg, setMsg] = useState("");

    return (
        <div className="tod-creator-panel-bg rounded-xl tod-creator-neon-border-blue p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="tod-creator-text-neon-yellow text-sm">✕</span>
                    <h3 className="font-bold text-white">Live Chat</h3>
                </div>
                <div className="flex items-center gap-1.5 tod-creator-text-neon-pink">
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="font-semibold text-sm">4,532</span>
                </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-0">
                {messages.map((m, i) => (
                    <div key={i} className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-pink-500 to-blue-500 rounded-full" />
                        </div>
                        <div>
                            <span className={`font-bold text-sm ${m.color}`}>{m.user}</span>
                            <p className="text-sm text-white/60">{m.text}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                <input
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                    placeholder="Send a message..."
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                />
                <Search className="w-4 h-4 text-white/40 cursor-pointer" />
                <Send className="w-4 h-4 tod-creator-text-neon-blue cursor-pointer" />
            </div>
        </div>
    );
};

export default TodCreatorLiveChat;
