"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";

const initialMessages = [
    { user: "fan1", text: "Entry is free. Time is metered at $2/min", isCreator: false },
    { user: "fan2", text: "Boost your visibility with paid reactions.", isCreator: false },
    { user: "fan3", text: "Priority queue is the fastest path to a reply.", isCreator: false },
    { user: "BlueMuse", text: "I'll answer priority questions first.", isCreator: true },
];

const ChatPanel = () => {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState(initialMessages);

    const handleSend = () => {
        if (!message.trim()) return;
        setMessages([...messages, { user: "you", text: message, isCreator: false }]);
        setMessage("");
    };

    return (
        <div className="glass-card p-4 flex flex-col h-full min-h-[400px]">
            <div className="flex-1 overflow-y-auto chat-scroll space-y-4 mb-4">
                {messages.map((msg, i) => (
                    <p key={i} className="text-sm leading-relaxed">
                        <span className={msg.isCreator ? "text-gold-light font-semibold" : "text-primary font-medium"}>
                            @{msg.user}.
                        </span>{" "}
                        <span className="text-foreground/80">{msg.text}</span>
                    </p>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type message..."
                    className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold"
                />
                <button
                    onClick={handleSend}
                    className="glass-card-inner px-4 py-2 text-gold hover:text-gold-light transition-colors flex items-center gap-1.5 text-sm"
                >
                    <Send size={14} />
                    Send
                </button>
            </div>
        </div>
    );
};

export default ChatPanel;
