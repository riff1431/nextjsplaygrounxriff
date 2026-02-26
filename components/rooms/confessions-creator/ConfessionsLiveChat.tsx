"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface ChatMessage {
    id: number;
    user: string;
    message: string;
    time: string;
    emoji?: string;
    color?: string;
}

const chatMessages: ChatMessage[] = [
    { id: 1, user: "Mike92", message: "Gorgeous, you look amazing tonight!", time: "1:00", emoji: "💜" },
    { id: 2, user: "JamesLover", message: "How do I submit a confession?", time: "2:00", emoji: "💜" },
    { id: 3, user: "David89", message: "That outfit is doing things to m...", time: "1:00", emoji: "🌸" },
    { id: 4, user: "Max87", message: "Hey, can I share a secret confession?", time: "1:00", emoji: "💜" },
    { id: 5, user: "SamathaLove", message: "You're looking so hott 🔥", time: "1:00", emoji: "💜" },
    { id: 6, user: "Frank_H85", message: "Any confessions that surprised you tonight?", time: "1:00", emoji: "⭐" },
    { id: 7, user: "SeedLover", message: "Sent you a tip! You're so stunning ❤️", time: "1:00", emoji: "💰", color: "gold" },
];

const ConfessionsLiveChat = () => {
    const [message, setMessage] = useState("");

    return (
        <div className="conf-glass-card-strong flex flex-col w-[400px] shrink-0 h-full pb-2">
            {/* Header */}
            <div className="p-4 border-b border-white/20">
                <h2 className="conf-font-cinzel text-white text-lg font-semibold mb-3">Live Chat</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-[hsl(320,50%,15%)] shrink-0 flex items-center justify-center text-xs text-white/60">
                            {msg.user.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-white text-sm font-medium truncate">{msg.user}</span>
                                <span className="text-xs">{msg.emoji}</span>
                                <span className="text-white/60 text-xs ml-auto shrink-0">{msg.time}</span>
                            </div>
                            <p className="text-white/60 text-xs mt-0.5">{msg.message}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/20">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[hsl(330,90%,55%)]"
                    />
                    <button className="bg-[hsl(330,90%,55%)] hover:bg-[hsl(330,90%,55%)]/80 text-white px-3 py-2 rounded-lg transition-colors">
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfessionsLiveChat;
