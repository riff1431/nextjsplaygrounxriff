"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSessionChat } from "@/hooks/useSessionChat";
import { Send, MessageCircle } from "lucide-react";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";

interface SessionChatPanelProps {
    sessionId: string | null;
    currentUserId?: string;
    maxHeight?: string;
}

/**
 * Shared live chat panel usable by both creator and fan session views.
 * Real-time message updates via Supabase Realtime.
 */
export default function SessionChatPanel({
    sessionId,
    currentUserId,
    maxHeight = "400px",
}: SessionChatPanelProps) {
    const { messages, isLoading, isSending, sendMessage } = useSessionChat(sessionId);
    const [input, setInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending) return;
        const msg = input;
        setInput("");
        await sendMessage(msg);
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
            }}
            className="pgx-chat-wrapper"
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <MessageCircle size={16} color="hsl(280,100%,70%)" />
                <span style={{ color: "#fff", fontSize: "13px", fontWeight: 600 }}>Live Chat</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginLeft: "auto" }}>
                    {messages.length} message{messages.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Messages */}
            <div
                className="pgx-chat-messages hide-scrollbar"
                style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    padding: "10px 14px",
                    maxHeight,
                    gap: "6px",
                }}
            >
                {isLoading && (
                    <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
                        Loading chat...
                    </div>
                )}

                {!isLoading && messages.length === 0 && (
                    <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>
                        No messages yet. Say hello! 👋
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        {!msg.is_system && (
                            <div
                                style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: msg.avatar_url
                                        ? `url(${msg.avatar_url}) center/cover`
                                        : `linear-gradient(135deg, hsl(${(msg.username.charCodeAt(0) * 37) % 360}, 70%, 55%), hsl(${(msg.username.charCodeAt(0) * 37 + 40) % 360}, 70%, 45%))`,
                                    flexShrink: 0,
                                    marginTop: "2px",
                                }}
                            />
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                            {msg.is_system ? (
                                <div
                                    style={{
                                        background: "rgba(255,255,255,0.04)",
                                        borderRadius: "8px",
                                        padding: "6px 10px",
                                        color: "rgba(255,255,255,0.5)",
                                        fontSize: "12px",
                                        textAlign: "center",
                                        fontStyle: "italic",
                                    }}
                                >
                                    {msg.message}
                                </div>
                            ) : (
                                <>
                                    <span
                                        style={{
                                            color: msg.user_id === currentUserId ? "hsl(280,100%,70%)" : "hsl(45,100%,65%)",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            marginRight: "6px",
                                        }}
                                    >
                                        {msg.username}
                                    </span>
                                    <UserBadgeDisplay userId={msg.user_id} />
                                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", wordBreak: "break-word" }}>
                                        {msg.message}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form
                onSubmit={handleSubmit}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={500}
                    style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        color: "#fff",
                        fontSize: "13px",
                        outline: "none",
                    }}
                />
                <button
                    type="submit"
                    disabled={isSending || !input.trim()}
                    style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        border: "none",
                        background: input.trim() ? "linear-gradient(135deg, hsl(280,100%,60%), hsl(330,90%,55%))" : "rgba(255,255,255,0.06)",
                        color: "#fff",
                        cursor: input.trim() ? "pointer" : "default",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <Send size={14} />
                </button>
            </form>
        </div>
    );
}
