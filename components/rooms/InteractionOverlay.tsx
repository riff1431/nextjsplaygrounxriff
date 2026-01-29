"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Flame, Zap, XCircle } from "lucide-react";

export type OverlayPrompt = {
    id: string;
    type: "truth" | "dare";
    text: string;
    fanName: string;
    tier?: string; // bronze, silver, gold
    customType?: string; // custom_truth etc
};

interface InteractionOverlayProps {
    prompt: OverlayPrompt | null;
    isVisible: boolean;
    onClose?: () => void; // Optional, mainly for local dismissal if needed
}

export default function InteractionOverlay({ prompt, isVisible, onClose }: InteractionOverlayProps) {
    if (!prompt) return null;

    const isDare = prompt.type === "dare";
    const bgGradient = isDare
        ? "from-orange-600 via-red-600 to-pink-600"
        : "from-blue-600 via-indigo-600 to-purple-600";

    const iconColor = isDare ? "text-yellow-300" : "text-cyan-300";

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-6">
                    {/* Backdrop (optional, strictly focused on overlay) */}
                    {/* <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 0.5 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60" 
                    /> */}

                    {/* The Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 100, rotateX: 45 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -100 }}
                        transition={{
                            type: "spring",
                            damping: 20,
                            stiffness: 300,
                            mass: 0.8
                        }}
                        className="pointer-events-auto relative w-full max-w-2xl"
                    >
                        {/* Glow Effect */}
                        <div className={`absolute -inset-1 blur-2xl opacity-70 bg-gradient-to-r ${bgGradient}`} />

                        <div className="relative overflow-hidden rounded-3xl bg-gray-950 border border-white/10 shadow-2xl">
                            {/* Header Stripe */}
                            <div className={`h-2 w-full bg-gradient-to-r ${bgGradient}`} />

                            <div className="p-8 md:p-12 text-center">
                                {/* Icon Badge */}
                                <div className="mb-6 flex justify-center">
                                    <div className={`rounded-full p-4 bg-gradient-to-br ${bgGradient} shadow-lg shadow-pink-500/30`}>
                                        {isDare ? (
                                            <Flame className="w-10 h-10 text-white fill-white/20" />
                                        ) : (
                                            <Zap className="w-10 h-10 text-white fill-white/20" />
                                        )}
                                    </div>
                                </div>

                                {/* Label */}
                                <h3 className={`text-2xl md:text-3xl font-black uppercase tracking-widest mb-2 ${isDare ? 'text-orange-400' : 'text-blue-400'}`}>
                                    {isDare ? "DARE" : "TRUTH"}
                                </h3>

                                {prompt.tier && (
                                    <div className="mb-6 flex justify-center">
                                        <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-gray-400">
                                            {prompt.tier} Tier
                                        </span>
                                    </div>
                                )}

                                {/* Main Text */}
                                <div className="text-3xl md:text-5xl font-bold text-white leading-tight mb-8 drop-shadow-lg">
                                    "{prompt.text}"
                                </div>

                                {/* User attribution */}
                                <div className="flex items-center justify-center gap-3 text-sm md:text-base text-gray-300">
                                    <span className="opacity-60">Sent by</span>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                                        <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />
                                        <span className="font-bold text-white">{prompt.fanName}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
