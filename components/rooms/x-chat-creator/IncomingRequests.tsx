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
        <div className="panel-glass rounded-lg flex flex-col min-h-0 flex-1">
            <div className="px-4 py-3 border-b border-border flex-shrink-0">
                <h2 className="font-display text-sm tracking-widest gold-text text-center">
                    ⭐ INCOMING REQUESTS
                </h2>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin flex-1">
                {REQUESTS.map((r, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-2 rounded-lg bg-secondary/50"
                    >
                        <span className="text-2xl flex-shrink-0">{r.avatar}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{r.user}</p>
                            <p className="text-xs text-muted-foreground">⭐ {r.msg}</p>
                            <div className="flex gap-2 mt-2">
                                <button className="bg-success text-success-foreground text-xs font-bold px-4 py-1 rounded hover:opacity-90 transition-opacity">
                                    ACCEPT
                                </button>
                                <button className="bg-secondary text-foreground text-xs font-bold px-4 py-1 rounded border border-border hover:bg-muted transition-colors">
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
