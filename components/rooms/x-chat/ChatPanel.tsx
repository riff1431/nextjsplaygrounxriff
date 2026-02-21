"use client";

import React, { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { useXChat } from "@/hooks/useXChat";
import { useAuth } from "@/app/context/AuthContext";

interface ChatPanelProps {
    roomId: string | null;
}

const ChatPanel = ({ roomId }: ChatPanelProps) => {
    const { user } = useAuth();
    const { messages, sendMessage } = useXChat(roomId);
    const [message, setMessage] = useState("");
    const [senderName, setSenderName] = useState("Anonymous");

    useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setSenderName(user.user_metadata.full_name);
        } else if (user?.email) {
            setSenderName(user.email.split("@")[0]);
        }
    }, [user]);

    const handleSend = async () => {
        if (!message.trim() || !roomId) return;
        try {
            await sendMessage(message, senderName);
            setMessage("");
        } catch (err) {
            console.error("Failed to send:", err);
        }
    };

    return (
        <div className="glass-card p-4 flex flex-col h-full min-h-[400px]">
            <div className="flex-1 overflow-y-auto chat-scroll space-y-4 mb-4">
                {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8 italic">
                        No messages yet. Start the conversation!
                    </p>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                        <p className="text-sm leading-relaxed">
                            <span className="text-primary font-medium">
                                @{msg.sender_name}.
                            </span>{" "}
                            <span className="text-foreground/80">{msg.body}</span>
                        </p>
                        {msg.creator_reply && (
                            <div className="ml-4 pl-3 border-l-2 border-gold-light/30 py-1">
                                <p className="text-sm leading-relaxed italic">
                                    <span className="text-gold-light font-semibold">
                                        Reply from Host:
                                    </span>{" "}
                                    <span className="text-foreground/90">{msg.creator_reply}</span>
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={roomId ? "Type message..." : "Waiting for room..."}
                    disabled={!roomId}
                    className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-50"
                />
                <button
                    onClick={handleSend}
                    disabled={!roomId}
                    className="glass-card-inner px-4 py-2 text-gold hover:text-gold-light transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50"
                >
                    <Send size={14} />
                    Send
                </button>
            </div>
        </div>
    );
};

export default ChatPanel;
