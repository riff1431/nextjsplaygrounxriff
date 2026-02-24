"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Settings } from "lucide-react";

const CHAT_MESSAGES = [
    { user: "SarahSmiles", time: "1h ago", msg: "How is great ramin", avatar: "🙂" },
    { user: "PokerKing77", time: "18h ago", msg: "Mees ahoubout 👑 :11", avatar: "😎" },
    { user: "MusicLover123", time: "1h ago", msg: "Time to every new is :5", avatar: "🎵" },
    { user: "GamingGuru", time: "16h ago", msg: "Epic Lure recon mend! 🎰", avatar: "🎮" },
    { user: "LilyLuvs123", time: "1h ago", msg: "So aluch 7 😄 🥰", avatar: "🌸" },
    { user: "MusicLover123", time: "1h ago", msg: "Supen smeshearistt 🤩 🎵", avatar: "🎵" },
    { user: "Jack_G.123", time: "1h ago", msg: "Nberoione! 💕", avatar: "⭐" },
    { user: "TechNerd31", time: "1h ago", msg: "Boosi to 🎉 🎆 💕", avatar: "💻" },
    { user: "DaveyPlays", time: "14h ago", msg: "Fase Econii ✨💕", avatar: "🎲" },
    { user: "DaveyPlays", time: "14h ago", msg: "🎁 😍 🤩", avatar: "🎲" },
];

const LiveChat = () => {
    const [message, setMessage] = useState("");

    return (
        <div className="creator-panel-glass rounded-lg flex flex-col h-full w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "hsla(40, 25%, 25%, 0.5)" }}>
                <h2 className="font-display text-sm tracking-widest text-gold-gradient flex items-center gap-2"
                    style={{
                        background: "linear-gradient(135deg, hsl(40, 70%, 55%), hsl(35, 80%, 45%))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}>
                    💬 LIVE CHAT
                </h2>
                <div className="flex gap-2" style={{ color: "hsl(40, 15%, 55%)" }}>
                    <ArrowUp className="w-4 h-4 cursor-pointer hover:text-gold transition-colors" />
                    <Settings className="w-4 h-4 cursor-pointer hover:text-gold transition-colors" />
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto creator-scrollbar px-3 py-2 space-y-2">
                {CHAT_MESSAGES.map((m, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-2 py-1"
                    >
                        <span className="text-lg flex-shrink-0">{m.avatar}</span>
                        <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-sm" style={{ color: "hsl(40, 60%, 90%)" }}>{m.user}</span>
                                <span className="text-xs" style={{ color: "hsl(30, 20%, 55%)" }}>{m.time}</span>
                            </div>
                            <p className="text-sm break-words" style={{ color: "hsla(40, 60%, 90%, 0.8)" }}>{m.msg}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t" style={{ borderColor: "hsla(40, 25%, 25%, 0.5)" }}>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Send a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-1 rounded px-3 py-2 text-sm outline-none focus:ring-1"
                        style={{
                            background: "hsl(25, 20%, 18%)",
                            color: "hsl(40, 60%, 90%)",
                            borderColor: "transparent",
                        }}
                    />
                    <button
                        className="px-4 py-2 rounded text-sm font-bold tracking-wide hover:opacity-90 transition-opacity"
                        style={{
                            background: "hsl(145, 50%, 36%)",
                            color: "#fff",
                        }}
                    >
                        SEND
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveChat;
