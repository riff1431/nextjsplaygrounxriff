"use client";

import { motion } from "framer-motion";

const REQUESTS = [
    { user: "JohnnyBravo", msg: "Shoutout for anniversary! ❤️", avatar: "😎" },
    { user: "PokerKing77", msg: "5-Minute Q&A Challenge! 🎲", avatar: "👑" },
    { user: "DaisyBabe", msg: "Let's play a game together! 🎮", avatar: "🌼" },
    { user: "BenTheFan", msg: "Want to share a funny story! 😂", avatar: "😄" },
];

const IncomingRequests = () => {
    return (
        <div className="creator-panel-glass rounded-lg flex flex-col min-h-0 flex-1">
            <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "hsla(40, 25%, 25%, 0.5)" }}>
                <h2
                    className="font-display text-sm tracking-widest text-center"
                    style={{
                        background: "linear-gradient(135deg, hsl(40, 70%, 55%), hsl(35, 80%, 45%))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}
                >
                    ⭐ INCOMING REQUESTS
                </h2>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto creator-scrollbar flex-1">
                {REQUESTS.map((r, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-2 rounded-lg"
                        style={{ background: "hsla(25, 25%, 18%, 0.5)" }}
                    >
                        <span className="text-2xl flex-shrink-0">{r.avatar}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm" style={{ color: "hsl(40, 60%, 90%)" }}>{r.user}</p>
                            <p className="text-xs" style={{ color: "hsl(30, 20%, 55%)" }}>⭐ {r.msg}</p>
                            <div className="flex gap-2 mt-2">
                                <button
                                    className="text-xs font-bold px-4 py-1 rounded hover:opacity-90 transition-opacity"
                                    style={{ background: "hsl(145, 50%, 36%)", color: "#fff" }}
                                >
                                    ACCEPT
                                </button>
                                <button
                                    className="text-xs font-bold px-4 py-1 rounded hover:opacity-80 transition-colors"
                                    style={{
                                        background: "hsl(25, 25%, 18%)",
                                        color: "hsl(40, 60%, 90%)",
                                        border: "1px solid hsla(40, 25%, 25%, 0.5)",
                                    }}
                                >
                                    DECLINE
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default IncomingRequests;
