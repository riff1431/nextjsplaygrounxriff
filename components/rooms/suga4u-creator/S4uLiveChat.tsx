"use client";

import { Heart, Smile } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useSuga4U, ActivityEvent } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { useAvatarMap } from "@/hooks/useAvatarMap";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";

const S4uLiveChat = ({ roomId, sessionId }: { roomId?: string; sessionId?: string }) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const [input, setInput] = useState("");
    const { activity, sendMessage } = useSuga4U(roomId || null, sessionId || null);
    const { user } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Collect sender IDs for avatar batch-fetching
    const senderIds = useMemo(() => activity.map(m => m.fanId).filter(Boolean) as string[], [activity]);
    const avatarMap = useAvatarMap(senderIds);

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
            await sendMessage(input, senderName, user?.id);
            setInput("");
        } catch (err) {
            console.error("Failed to send message:", err);
        }
    };

    const formatActivityText = (a: ActivityEvent) => {
        if (a.type === 'TIP') return "tipped you!";
        if (a.type === 'LINK_REVEAL') return "revealed a favourite!";
        if (a.type === 'BUY_FOR_HER') return "purchased a favourite!";
        if (a.type === 'SECRET_UNLOCK') return "revealed a secret!";
        if (a.type === 'PAID_REQUEST') return `requested: ${a.label}`;
        if (a.type === 'OFFER_CLAIM') return `claimed offer: ${a.label}`;
        return a.label;
    };

    const isHighlight = (type: string) => {
        return ['TIP', 'PAID_REQUEST', 'OFFER_CLAIM', 'SECRET_UNLOCK', 'LINK_REVEAL', 'BUY_FOR_HER'].includes(type);
    };

    return (
        <div className="s4u-creator-glass-panel p-4 flex flex-col h-full overflow-hidden pgx-chat-wrapper">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3 flex items-center gap-2 shrink-0">
                <Heart className="w-4 h-4 s4u-creator-text-primary fill-current" />
                Live Chat
            </h3>
            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 mb-3 space-y-3 min-h-0 chat-scroll flex flex-col pgx-chat-messages hide-scrollbar pgx-chat-messages hide-scrollbar">
                {[...activity].reverse().map((msg, i) => (
                    <div key={msg.id || i} className="flex items-start gap-2">
                        {/* User Avatar */}
                        <div className="w-7 h-7 rounded-full bg-pink-500/15 border border-pink-500/25 shrink-0 flex items-center justify-center text-[10px] font-bold text-pink-300 overflow-hidden">
                            {msg.fanId && avatarMap[msg.fanId] ? (
                                <img src={avatarMap[msg.fanId]} alt="" className="w-full h-full object-cover" />
                            ) : (
                                msg.fanName?.charAt(0)?.toUpperCase() || "?"
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-sm font-semibold ${isHighlight(msg.type) ? "s4u-creator-text-gold" : "text-pink-400"}`}>
                                    {msg.fanName}
                                </span>
                                {/* User Badges (account type + membership pack) */}
                                {msg.fanId && <UserBadgeDisplay userId={msg.fanId} />}
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
            <div className="flex gap-2 items-center shrink-0">
                <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    
                        <div className="relative flex items-center">
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:bg-white/10"
                            >
                                <Smile className="w-5 h-5 text-white/70" />
                            </button>
                            {showEmojiPicker && (
                                <div ref={emojiPickerRef} className="absolute bottom-[calc(100%+8px)] left-0 mb-2 z-50">
                                    <EmojiPicker 
                                        onEmojiClick={(e) => {
                                            setInput(prev => prev + e.emoji);
                                        }}
                                        theme={Theme.DARK}
                                    />
                                </div>
                            )}
                        </div>
                        <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Enter message"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                    />
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
