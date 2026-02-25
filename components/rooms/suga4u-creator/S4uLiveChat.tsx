"use client";

import { Heart, Smile } from "lucide-react";
import { useState } from "react";

const messages = [
    { user: "SugaFan17", avatar: "🌸", text: "Hello beautiful! 💕✨", tip: null },
    { user: "LoveStruck23", avatar: "💜", text: "You look amazing!", tip: null },
    { user: "HottieHunter", avatar: "🔥", text: "Hey Suga! Hope you're having a great day! 🌹", tip: null },
    { user: "Candy4U", avatar: "🍬", text: "Hey Suga! 🥰 🎁", tip: "$50" },
    { user: "DreamyNight", avatar: "🌙", text: "Just dropped by to say hi! 💫", tip: null },
    { user: "RoseQueen", avatar: "🌹", text: "Love the vibe tonight!", tip: "$25" },
    { user: "SweetTalker", avatar: "🍯", text: "You're absolutely glowing 🔥", tip: null },
    { user: "GoldenBoy", avatar: "⭐", text: "Can't stop watching! 💛", tip: "$100" },
    { user: "MidnightRider", avatar: "🌃", text: "What's the song playing?", tip: null },
    { user: "CherryPop", avatar: "🍒", text: "Sending love your way! 💋", tip: "$30" },
    { user: "BlueVelvet", avatar: "💎", text: "You deserve the world 🌍", tip: null },
    { user: "StarlightX", avatar: "✨", text: "First time here, already a fan!", tip: "$15" },
];

const S4uLiveChat = () => {
    const [input, setInput] = useState("");

    return (
        <div className="s4u-creator-glass-panel p-4 flex flex-col h-full">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 s4u-creator-text-primary fill-current" />
                Live Chat
            </h3>
            <div className="flex-1 overflow-y-auto pr-1 mb-3 space-y-3 min-h-0">
                {messages.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2">
                        <span className="text-xl">{msg.avatar}</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold s4u-creator-text-primary">{msg.user}</span>
                                {msg.tip && (
                                    <span className="text-xs bg-pink-500/20 s4u-creator-text-primary px-2 py-0.5 rounded-full font-semibold">
                                        {msg.tip}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-white/80 break-words">{msg.text}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 items-center">
                <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter message"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                    />
                    <Smile className="w-4 h-4 text-white/40 cursor-pointer hover:s4u-creator-text-primary transition-colors" />
                </div>
                <button className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-400 transition-colors">
                    Send
                </button>
            </div>
        </div>
    );
};

export default S4uLiveChat;
