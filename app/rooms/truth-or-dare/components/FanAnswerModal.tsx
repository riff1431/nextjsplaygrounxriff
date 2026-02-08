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
            setVisible(true);
            playSuccessSound();

            // Auto-close after 8 seconds
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 400);
            }, 8000);

            return () => clearTimeout(timer);
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
                    className="fixed inset-0 z-[200] flex items-center justify-center p-6"
                    style={{
                        background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0.95) 100%)'
                    }}
                >
                    {/* Floating particles */}
                    {[...Array(15)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute text-2xl pointer-events-none"
                            style={{ left: `${10 + Math.random() * 80}%` }}
                            initial={{ y: "100vh", opacity: 0 }}
                            animate={{
                                y: "-20vh",
                                opacity: [0, 1, 1, 0],
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
                            relative w-full max-w-lg overflow-hidden
                            bg-gradient-to-br ${styles.gradient}
                            backdrop-blur-3xl backdrop-saturate-200
                            border ${styles.border}
                            rounded-[2.5rem]
                            ${styles.glow}
                        `}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => {
                                setVisible(false);
                                setTimeout(onClose, 300);
                            }}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all z-10"
                        >
                            <X className="w-5 h-5 text-white/70" />
                        </button>

                        {/* Glass highlights */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none rounded-[2.5rem]" />
                        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                        {/* Ambient glow */}
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute -top-20 -right-20 w-48 h-48 bg-green-500/30 rounded-full blur-3xl"
                        />

                        <div className="relative p-8 text-center">
                            {/* Success icon */}
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", damping: 12, delay: 0.2 }}
                                className="relative mb-6"
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-28 h-28 bg-green-500/20 rounded-full blur-2xl" />
                                </div>
                                <div className="relative inline-flex items-center justify-center p-4 rounded-full bg-green-500/20 border border-green-400/30">
                                    <CheckCircle className="w-16 h-16 text-green-400" />
                                </div>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute -top-2 -right-2"
                                >
                                    <PartyPopper className="w-8 h-8 text-yellow-400" />
                                </motion.div>
                            </motion.div>

                            {/* Title */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <h2 className="text-3xl font-black text-white mb-2">
                                    Your {isTruth ? "Truth" : "Dare"} Was Answered! 🎉
                                </h2>
                                <p className="text-white/60 text-lg">
                                    The creator just responded to your request
                                </p>
                            </motion.div>

                            {/* Question content */}
                            {notification.content && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="mt-6 bg-black/30 backdrop-blur-xl rounded-2xl p-4 border border-white/10"
                                >
                                    <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Your Question</div>
                                    <p className="text-base text-white/80 leading-relaxed">
                                        "{notification.content}"
                                    </p>
                                </motion.div>
                            )}

                            {/* Creator's Response - THE MAIN CONTENT */}
                            {notification.creatorResponse && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: 0.5, type: "spring", damping: 15 }}
                                    className="mt-4 relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-teal-500/20 rounded-2xl blur-xl" />
                                    <div className="relative bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-green-900/40 backdrop-blur-xl rounded-2xl p-5 border border-green-400/30">
                                        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />
                                        <div className="flex items-center gap-2 text-xs text-green-300/80 uppercase tracking-wider mb-3">
                                            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                            Creator's Response
                                        </div>
                                        <p className="text-xl text-white font-medium leading-relaxed">
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
                                className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20"
                            >
                                <Sparkles className={`w-4 h-4 ${styles.accent}`} />
                                <span className="text-white font-medium">
                                    {notification.tier?.toUpperCase()} {isTruth ? "TRUTH" : "DARE"}
                                </span>
                            </motion.div>

                            {/* Thank you message */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="mt-6 flex items-center justify-center gap-2 text-white/50"
                            >
                                <Heart className="w-4 h-4 text-pink-400" />
                                <span>Thanks for supporting the creator!</span>
                            </motion.div>

                            {/* Progress bar */}
                            <div className="mt-6 h-1 bg-white/10 rounded-full overflow-hidden">
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
