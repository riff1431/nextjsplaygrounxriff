"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Sparkles, Heart, PartyPopper, X } from "lucide-react";
import { playSuccessSound } from "@/utils/sounds";

interface AnswerNotification {
    fanName: string;
    type: string;
    tier?: string;
    content?: string;
    creatorResponse?: string;
}

interface FanAnswerModalProps {
    notification: AnswerNotification | null;
    onClose: () => void;
}

export default function FanAnswerModal({ notification, onClose }: FanAnswerModalProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            console.log("FanAnswerModal received notification:", notification);
            setVisible(true);
            playSuccessSound();
        }
    }, [notification, onClose]);

    if (!notification) return null;

    const isTruth = notification.type?.toLowerCase().includes("truth");

    // Tier-based styling
    const tierStyles = {
        bronze: {
            gradient: "from-amber-500/20 via-orange-400/15 to-amber-600/20",
            border: "border-amber-300/40",
            accent: "text-amber-300",
            glow: "shadow-[0_0_60px_rgba(217,119,6,0.3)]"
        },
        silver: {
            gradient: "from-cyan-500/20 via-slate-400/15 to-blue-500/20",
            border: "border-cyan-200/50",
            accent: "text-cyan-200",
            glow: "shadow-[0_0_60px_rgba(6,182,212,0.3)]"
        },
        gold: {
            gradient: "from-yellow-400/25 via-amber-300/20 to-yellow-500/25",
            border: "border-yellow-200/60",
            accent: "text-yellow-200",
            glow: "shadow-[0_0_80px_rgba(234,179,8,0.4)]"
        }
    };
    const styles = tierStyles[notification.tier?.toLowerCase() as keyof typeof tierStyles] || tierStyles.bronze;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{
                        background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16,185,129,0.12) 0%, rgba(0,0,0,0.92) 100%)'
                    }}
                >
                    {/* Floating particles - reduced count, pointer-events-none, kept below close button */}
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute text-lg pointer-events-none z-0"
                            style={{ left: `${15 + Math.random() * 70}%` }}
                            initial={{ y: "100vh", opacity: 0 }}
                            animate={{
                                y: "-20vh",
                                opacity: [0, 0.7, 0.7, 0],
                                rotate: Math.random() * 360
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                delay: Math.random() * 2,
                                repeat: Infinity
                            }}
                        >
                            {["✨", "🎉", "💫", "⭐", "🌟"][Math.floor(Math.random() * 5)]}
                        </motion.div>
                    ))}

                    <motion.div
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", damping: 20 }}
                        className={`
                            relative w-full max-w-sm overflow-hidden
                            bg-gradient-to-br ${styles.gradient}
                            backdrop-blur-3xl backdrop-saturate-200
                            border ${styles.border}
                            rounded-2xl
                            ${styles.glow}
                        `}
                    >
                        {/* Close button - z-50 ensures it's always above particles and ambient glow */}
                        <button
                            onClick={() => {
                                setVisible(false);
                                setTimeout(onClose, 300);
                            }}
                            className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 transition-all z-50 shadow-lg"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        {/* Glass highlights */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none rounded-2xl" />
                        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                        {/* Ambient glow - pointer-events-none so it never blocks clicks */}
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute -top-16 -right-16 w-36 h-36 bg-green-500/25 rounded-full blur-3xl pointer-events-none z-0"
                        />

                        <div className="relative p-5 text-center">
                            {/* Success icon */}
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", damping: 12, delay: 0.2 }}
                                className="relative mb-4"
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full blur-2xl" />
                                </div>
                                <div className="relative inline-flex items-center justify-center p-3 rounded-full bg-green-500/20 border border-green-400/30">
                                    <CheckCircle className="w-10 h-10 text-green-400" />
                                </div>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute -top-1 -right-1 pointer-events-none"
                                >
                                    <PartyPopper className="w-6 h-6 text-yellow-400" />
                                </motion.div>
                            </motion.div>

                            {/* Title */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <h2 className="text-xl font-black text-white mb-1">
                                    Your {isTruth ? "Truth" : "Dare"} Was Answered! 🎉
                                </h2>
                                <p className="text-white/60 text-sm">
                                    The creator just responded to your request
                                </p>
                            </motion.div>

                            {/* Question content */}
                            {notification.content && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="mt-4 bg-black/30 backdrop-blur-xl rounded-xl p-3 border border-white/10"
                                >
                                    <div className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">Your Question</div>
                                    <p className="text-sm text-white/80 leading-relaxed">
                                        "{notification.content}"
                                    </p>
                                </motion.div>
                            )}

                            {/* Creator's Response - THE MAIN CONTENT */}
                            {(notification.creatorResponse !== undefined && notification.creatorResponse !== null) && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: 0.5, type: "spring", damping: 15 }}
                                    className="mt-3 relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-teal-500/20 rounded-xl blur-xl" />
                                    <div className="relative bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-green-900/40 backdrop-blur-xl rounded-xl p-3.5 border border-green-400/30">
                                        <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />
                                        <div className="flex items-center gap-1.5 text-[10px] text-green-300/80 uppercase tracking-wider mb-2">
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            Creator's Response
                                        </div>
                                        <p className="text-base text-white font-medium leading-relaxed">
                                            "{notification.creatorResponse}"
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Tier badge */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20"
                            >
                                <Sparkles className={`w-3.5 h-3.5 ${styles.accent}`} />
                                <span className="text-sm text-white font-medium">
                                    {notification.tier?.toUpperCase()} {isTruth ? "TRUTH" : "DARE"}
                                </span>
                            </motion.div>

                            {/* Thank you message */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="mt-4 flex items-center justify-center gap-1.5 text-white/50 text-sm"
                            >
                                <Heart className="w-3.5 h-3.5 text-pink-400" />
                                <span>Thanks for supporting the creator!</span>
                            </motion.div>

                            {/* Progress bar */}
                            <div className="mt-4 h-0.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-green-400/60 rounded-full"
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: 8, ease: "linear" }}
                                />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
