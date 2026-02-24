"use client";

import { motion } from "framer-motion";

const SummaryPanel = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="panel-glass rounded-lg flex flex-col min-h-0 flex-shrink-0"
        >
            <div className="px-4 py-1 border-b border-border">
                <h2 className="font-display text-sm tracking-widest gold-text text-center">
                    ✨ SUMMARY
                </h2>
            </div>
            <div className="p-4 space-y-0">
                {/* Top row with dual stats */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span>🎉</span>
                        <span className="font-bold text-foreground">120</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>🎉</span>
                        <span className="font-bold text-foreground">120</span>
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
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground">
                                {stat.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {stat.icon2 && <span>{stat.icon2}</span>}
                            <span className="font-bold text-foreground text-lg">{stat.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default SummaryPanel;
