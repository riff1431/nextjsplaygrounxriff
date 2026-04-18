"use client";

import React, { useState } from "react";

const chatMessages = [
    { user: "User123", msg: "So sexy! 👄 🔥", avatar: "🙂" },
    { user: "FanGuy567", msg: "Wow you're all amazing!", avatar: "😎" },
    { user: "ChatMaster", msg: "Who's gonna win 1️⃣❤️", avatar: "🤩" },
    { user: "ChatMaster", msg: "Got my eyes on the prize! 🌟", avatar: "🤩" },
    { user: "Viewer789", msg: "🔥🔥🔥", avatar: "😏" },
    { user: "GoldMember", msg: "Go Girls! 💖", avatar: "👑" },
    { user: "LoverFan", msg: "Stunning! ⭐", avatar: "💜" },
    { user: "KingOfVotes", msg: "Vote for #2! 🔥", avatar: "🫅" },
    { user: "HotSupport", msg: "Amazing show! 🤍", avatar: "❤️" },
    { user: "SecretFan", msg: "❤️❤️❤️", avatar: "🥰" },
];

const LiveChat = () => {
    const [message, setMessage] = useState("");

    return (
        <div
            className="h-full"
            style={{
                perspective: "900px",
                perspectiveOrigin: "right center",
            }}
        >
            <div
                className="flex flex-col h-full bg-card/40  rounded-xl border border-border neon-border overflow-hidden pgx-chat-wrapper"
                style={{
                    transform: "rotateY(12deg) scale(0.97)",
                    transformOrigin: "right center",
                    boxShadow:
                        "0 0 30px hsl(300 100% 60% / 0.25), -8px 0 30px hsl(320 100% 55% / 0.15), inset 0 0 20px hsl(300 100% 60% / 0.08)",
                }}
            >
                <div className="px-4 py-2 border-b border-border bg-secondary/50">
                    <h2 className="font-display text-sm font-bold tracking-wider text-foreground neon-text">
                        LIVE CHAT
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0 pgx-chat-messages hide-scrollbar">
                    {chatMessages.map((chat, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                            <span className="text-sm flex-shrink-0">{chat.avatar}</span>
                            <div className="min-w-0">
                                <span className="font-semibold text-primary text-xs">{chat.user}:</span>{" "}
                                <span className="text-foreground/90 text-xs">{chat.msg}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-2 border-t border-border">
                    <div className="flex gap-1.5">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="flex-1 bg-input border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button className="bg-accent text-accent-foreground font-bold text-xs px-3 py-1.5 rounded-lg hover:brightness-110 transition-all">
                            SEND
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveChat;
