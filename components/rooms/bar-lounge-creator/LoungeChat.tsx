"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Camera } from "lucide-react";
import { useBarChat } from "@/hooks/useBarChat";
import { useAuth } from "@/app/context/AuthContext";

interface LoungeChatProps {
    roomId?: string;
}

const LoungeChat = ({ roomId }: LoungeChatProps) => {
    const { user } = useAuth();
    const { messages, sendMessage } = useBarChat(roomId ?? null);
    const [message, setMessage] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!message.trim() || !roomId) return;
        try {
            await sendMessage(
                message.trim(),
                user?.id,
                user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Creator"
            );
            setMessage("");
        } catch (err) {
            console.error("Failed to send message:", err);
        }
    };

    const getDisplayColor = (msg: any) => {
        if (msg.is_system) return "text-amber-300";
        if (msg.user_id === user?.id) return "text-emerald-400";
        return "text-purple-400";
    };

    return (
        <div className="glass-panel flex flex-col h-full overflow-hidden w-full pgx-chat-wrapper">
            <h2 className="text-lg font-semibold px-4 pt-4 pb-2 text-gold font-title">
                Lounge Chat
            </h2>

            <div className="flex-1 overflow-y-auto px-4 space-y-3 lounge-creator-scrollbar pgx-chat-messages hide-scrollbar">
                {messages.length === 0 && (
                    <p className="text-sm text-white/40 text-center py-8">No messages yet. Chat will appear here live.</p>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                            <span className={`font-medium ${getDisplayColor(msg)} text-xs`}>
                                {msg.is_system ? "⚡ System" : (msg.handle || "Anonymous")}
                            </span>
                            <span className="text-[10px] ml-2" style={{ color: "hsl(280, 15%, 60%)" }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <p
                                className={`text-sm mt-0.5 ${msg.is_system ? "italic text-amber-200/80" : ""}`}
                                style={msg.is_system ? undefined : { color: "hsla(300, 20%, 95%, 0.9)" }}
                            >
                                {msg.content}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
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
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="bg-transparent flex-1 text-sm outline-none"
                        style={{ color: "hsl(300, 20%, 95%)" }}
                    />
                    <Send
                        className="w-4 h-4 cursor-pointer hover:opacity-80 transition-colors"
                        style={{ color: "hsl(45, 90%, 55%)" }}
                        onClick={handleSend}
                    />
                </div>
            </div>
        </div>
    );
};

export default LoungeChat;
