"use client";

import { motion } from "framer-motion";

const SummaryPanel = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="creator-panel-glass rounded-lg flex flex-col min-h-0 flex-shrink-0"
        >
            <div className="px-4 py-1 border-b" style={{ borderColor: "hsla(40, 25%, 25%, 0.5)" }}>
                <h2
                    className="font-display text-sm tracking-widest text-center"
                    style={{
                        background: "linear-gradient(135deg, hsl(40, 70%, 55%), hsl(35, 80%, 45%))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}
                >
                    ✨ SUMMARY
                </h2>
            </div>
            <div className="p-4 space-y-0">
                {/* Top row with dual stats */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span>🎉</span>
                        <span className="font-bold" style={{ color: "hsl(40, 60%, 90%)" }}>120</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>🎉</span>
                        <span className="font-bold" style={{ color: "hsl(40, 60%, 90%)" }}>120</span>
                    </div>
                </div>

                {/* Stats rows */}
                {[
                    { icon: "💕", label: "REACTIONS", icon2: "😍", value: "324" },
                    { icon: "🎁", label: "STICKERS", value: "53" },
                    { icon: "💰", label: "TIPS (USD)", value: "$1,065" },
                    { icon: "👥", label: "FANS", value: "2,490" },
                    { icon: "⭐", label: "REQUESTS", value: "8" },
                ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span>{stat.icon}</span>
                            <span className="text-xs font-semibold tracking-wider" style={{ color: "hsl(30, 20%, 55%)" }}>
                                {stat.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {stat.icon2 && <span>{stat.icon2}</span>}
                            <span className="font-bold text-lg" style={{ color: "hsl(40, 60%, 90%)" }}>{stat.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default SummaryPanel;
