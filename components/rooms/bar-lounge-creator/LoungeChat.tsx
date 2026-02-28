"use client";

import { useState } from "react";
import { Send, Camera } from "lucide-react";

interface ChatMessage {
    user: string;
    message: string;
    time: string;
    color: string;
}

const mockMessages: ChatMessage[] = [
    { user: "DiamondKing", message: "You're stunning! 💎", time: "09:01", color: "text-amber-400" },
    { user: "NightOwl", message: "You're on mon 💜", time: "09:03", color: "text-purple-400" },
    { user: "ChampagnePapi", message: "Can I buy you another drink? 🥂💜", time: "09:18", color: "text-amber-300" },
    { user: "VelvetVibes", message: "Show me that seductive side of you 😏", time: "09:30", color: "text-amber-400" },
    { user: "GoldenHeart", message: "Sent 50 Tips", time: "09:35", color: "text-amber-300" },
    { user: "DiamondKing", message: "You're welcome!! 💜", time: "09:05", color: "text-amber-400" },
    { user: "MoonDancer", message: "Sent 50 Tips", time: "09:01", color: "text-amber-300" },
    { user: "StarGazer", message: "Soo a beer 🍻", time: "09:04", color: "text-purple-400" },
    { user: "NightOwl", message: "Sent 50 Tips", time: "09:06", color: "text-amber-300" },
];

const LoungeChat = () => {
    const [message, setMessage] = useState("");

    return (
        <div className="glass-panel flex flex-col h-full w-full">
            <h2 className="text-lg font-semibold px-4 pt-4 pb-2 text-gold font-title">
                Lounge Chat
            </h2>

            <div className="flex-1 overflow-y-auto px-4 space-y-3 lounge-creator-scrollbar">
                {mockMessages.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                            <span className={`font-medium ${msg.color} text-xs`}>{msg.user}</span>
                            <span className="text-[10px] ml-2" style={{ color: "hsl(280, 15%, 60%)" }}>{msg.time}</span>
                            <p className="text-sm mt-0.5" style={{ color: "hsla(300, 20%, 95%, 0.9)" }}>{msg.message}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 space-y-2">
                <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{
                        background: "hsla(270, 30%, 18%, 0.5)",
                        border: "1px solid hsla(280, 40%, 25%, 0.4)",
                    }}
                >
                    <Camera className="w-4 h-4" style={{ color: "hsl(280, 15%, 60%)" }} />
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="bg-transparent flex-1 text-sm outline-none"
                        style={{ color: "hsl(300, 20%, 95%)" }}
                    />
                    <Send className="w-4 h-4 cursor-pointer hover:opacity-80 transition-colors" style={{ color: "hsl(45, 90%, 55%)" }} />
                </div>
            </div>
        </div>
    );
};

export default LoungeChat;
