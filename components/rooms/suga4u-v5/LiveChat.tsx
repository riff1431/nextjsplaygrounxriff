"use client";

import { Heart, Send, Smile } from "lucide-react";
import { cs } from "@/utils/currency";
import { useState, useRef, useEffect } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";

const messages = [
    { user: "Jessica", emoji: "💖", text: "tipped ${cs()}50!", highlight: true },
    { user: "Mike_Daddy", emoji: "😎", text: "She's stunning!" },
    { user: "QueenB", emoji: "👑", text: "Can you say my name? ${cs()}20", highlight: true },
    { user: "Steven", emoji: "", text: "sent Luxury Bag 👜", highlight: true },
    { user: "EmilyR", emoji: "🔥", text: "That body! 💕" },
    { user: "Alex King", emoji: "", text: "Sponsor Room 💎", highlight: true },
    { user: "Rose✨", emoji: "😂", text: "Take my money!" },
    { user: "Diamond_Jay", emoji: "💰", text: "Just sent ${cs()}200! Keep going queen 👑", highlight: true },
    { user: "LuxLife", emoji: "🥂", text: "Best stream tonight!" },
    { user: "Kingpin", emoji: "🔥", text: "VIP access when? 💎", highlight: false },
    { user: "SugarRush", emoji: "🍬", text: "tipped ${cs()}75!", highlight: true },
    { user: "Bella_V", emoji: "💋", text: "Love the vibes tonight ✨" },
    { user: "ChampagnePapi", emoji: "🍾", text: "sent Diamond Ring 💍", highlight: true },
    { user: "MrGenerous", emoji: "💸", text: "Sponsor Room unlocked! 🎉", highlight: true },
    { user: "NightOwl", emoji: "🦉", text: "Can't stop watching 😍" },
    { user: "GoldMember", emoji: "🏆", text: "tipped ${cs()}100!", highlight: true },
    { user: "StarGazer", emoji: "⭐", text: "You're glowing tonight!" },
    { user: "BigSpender", emoji: "💎", text: "Private show request! ${cs()}500", highlight: true },
];

const LiveChat = () => {
    const [msg, setMsg] = useState("");
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

    return (
    <div className="glass-panel flex flex-col h-[400px] md:h-[500px] bg-transparent border-gold/20 overflow-hidden">
        <div className="flex items-center justify-center p-3 border-b border-gold/20 shrink-0">
            <div className="h-px flex-1 bg-gold/30" />
            <span className="section-title px-3">Live Chat</span>
            <div className="h-px flex-1 bg-gold/30" />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 pgx-chat-messages hide-scrollbar">
            {messages.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-muted/30 flex-shrink-0 flex items-center justify-center">
                        <span className="text-xs">{m.emoji || "👤"}</span>
                    </div>
                    <p className="leading-snug">
                        <span className={`font-bold ${m.highlight ? "text-gold" : "text-pink-light"}`}>{m.user}:</span>{" "}
                        <span className="text-foreground/80">{m.text}</span>
                        {m.highlight && <Heart className="inline w-3 h-3 text-pink fill-pink ml-1" />}
                    </p>
                </div>
            ))}
        </div>

        <div className="p-3 border-t border-gold/20 flex gap-2 shrink-0">
            <div className="relative flex items-center">
                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:bg-white/10"
                >
                    <Smile className="w-5 h-5 text-white/70" />
                </button>
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-[calc(100%+8px)] left-0 mb-2 z-50">
                        <EmojiPicker 
                            onEmojiClick={(e) => setMsg(prev => prev + e.emoji)}
                            theme={Theme.DARK}
                        />
                    </div>
                )}
            </div>
            <input
                type="text"
                placeholder="Type a message..."
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="flex-1 bg-muted/30 rounded-full px-4 py-2 text-sm outline-none border border-gold/20 focus:border-pink/50 transition-colors"
            />
            <button className="btn-pink w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                <Send className="w-4 h-4" />
            </button>
        </div>
    </div>
    );
};

export default LiveChat;
