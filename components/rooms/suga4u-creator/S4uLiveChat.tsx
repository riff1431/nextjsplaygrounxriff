"use client";

import { Heart, Smile } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSuga4U, ActivityEvent } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";

const S4uLiveChat = ({ roomId }: { roomId?: string }) => {
    const [input, setInput] = useState("");
    const { activity, sendMessage } = useSuga4U(roomId || null);
    const { user } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activity]);

    const handleSend = async () => {
        if (!input.trim() || !roomId) return;
        try {
            const senderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Creator";
            await sendMessage(input, senderName);
            setInput("");
        } catch (err) {
            console.error("Failed to send message:", err);
        }
    };

    const formatActivityText = (a: ActivityEvent) => {
        if (a.type === 'TIP') return "tipped you!";
        if (a.type === 'PAID_REQUEST') return `requested: ${a.label}`;
        if (a.type === 'OFFER_CLAIM') return `claimed offer: ${a.label}`;
        return a.label;
    };

    const isHighlight = (type: string) => {
        return ['TIP', 'PAID_REQUEST', 'OFFER_CLAIM', 'SECRET_UNLOCK'].includes(type);
    };

    return (
        <div className="s4u-creator-glass-panel p-4 flex flex-col h-full overflow-hidden pgx-chat-wrapper">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 s4u-creator-text-primary fill-current" />
                Live Chat
            </h3>
            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 mb-3 space-y-3 min-h-0 chat-scroll flex flex-col pgx-chat-messages hide-scrollbar pgx-chat-messages hide-scrollbar">
                {[...activity].reverse().map((msg, i) => (
                    <div key={msg.id || i} className="flex items-start gap-2">
                        <span className="text-xl">{msg.type === "TIP" ? "💰" : "🌸"}</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${isHighlight(msg.type) ? "s4u-creator-text-gold" : "text-pink-400"}`}>
                                    {msg.fanName}
                                </span>
                                {msg.amount > 0 && (
                                    <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full font-semibold border border-pink-500/30">
                                        ${msg.amount}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-white/80 break-words">{formatActivityText(msg)}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 items-center">
                <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Enter message"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                    />
                    <Smile className="w-4 h-4 text-white/40 cursor-pointer hover:s4u-creator-text-primary transition-colors" />
                </div>
                <button
                    onClick={handleSend}
                    disabled={!roomId}
                    className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-400 transition-colors disabled:opacity-50"
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default S4uLiveChat;
