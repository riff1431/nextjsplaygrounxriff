"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Sparkles, TrendingUp, Coins, PartyPopper, Crown } from "lucide-react";
import { playMoneySound } from "@/utils/sounds";

interface EarningsNotification {
    amount: number;
    fanName: string;
    type: string;
    tier?: string;
}

interface EarningsModalProps {
    notification: EarningsNotification | null;
    onClose: () => void;
}

export default function EarningsModal({ notification, onClose }: EarningsModalProps) {
    const [visible, setVisible] = useState(false);
    const [coins, setCoins] = useState<{ id: number; x: number; delay: number }[]>([]);
    const soundPlayedRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const onCloseRef = useRef(onClose);

    // Keep onClose ref updated
    onCloseRef.current = onClose;

    useEffect(() => {
        if (notification) {
            // Only play sound once per notification
            if (!soundPlayedRef.current) {
                soundPlayedRef.current = true;
                setVisible(true);
                playMoneySound();

                // Generate falling coins
                const newCoins = Array.from({ length: 12 }, (_, i) => ({
                    id: i,
                    x: Math.random() * 100,
                    delay: Math.random() * 0.5
                }));
                setCoins(newCoins);

                // Auto-close after 5 seconds
                timerRef.current = setTimeout(() => {
                    setVisible(false);
                    setTimeout(() => onCloseRef.current(), 400);
                }, 5000);
            }
        } else {
            // Reset when notification is cleared
            soundPlayedRef.current = false;
            setVisible(false);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [notification]);

    const handleClose = useCallback(() => {
        setVisible(false);
        soundPlayedRef.current = false;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setTimeout(() => onCloseRef.current(), 300);
    }, []);

    if (!notification) return null;

    const tierIcons: Record<string, React.ReactNode> = {
        bronze: <Coins className="w-5 h-5 text-amber-400" />,
        silver: <Sparkles className="w-5 h-5 text-cyan-300" />,
        gold: <Crown className="w-5 h-5 text-yellow-300" />
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
                    onClick={handleClose}
                >
                    {/* Falling coins animation */}
                    {coins.map((coin) => (
                        <motion.div
                            key={coin.id}
                            className="absolute text-2xl pointer-events-none"
                            style={{ left: `${coin.x}%` }}
                            initial={{ y: -50, opacity: 0, rotate: 0 }}
                            animate={{
                                y: typeof window !== 'undefined' ? window.innerHeight + 50 : 1000,
                                opacity: [0, 1, 1, 0],
                                rotate: 720
                            }}
                            transition={{
                                duration: 2.5 + Math.random(),
                                delay: coin.delay,
                                ease: "easeIn"
                            }}
                        >
                            💰
                        </motion.div>
                    ))}

                    {/* Main Modal */}
                    <motion.div
                        initial={{ scale: 0.5, y: 100, rotateX: -30 }}
                        animate={{ scale: 1, y: 0, rotateX: 0 }}
                        exit={{ scale: 0.8, y: 50, opacity: 0 }}
                        transition={{ type: "spring", damping: 12, stiffness: 200 }}
                        className="pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 backdrop-blur-xl border-2 border-emerald-300/50 shadow-[0_0_100px_rgba(16,185,129,0.6)] p-8 min-w-[320px]">
                            {/* Animated background effects */}
                            <motion.div
                                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-400/40 rounded-full blur-3xl"
                            />
                            <motion.div
                                animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.6, 0.4] }}
                                transition={{ duration: 2.5, repeat: Infinity }}
                                className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-300/40 rounded-full blur-2xl"
                            />

                            {/* Sparkle decorations */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute top-4 right-4"
                            >
                                <PartyPopper className="w-8 h-8 text-yellow-300" />
                            </motion.div>

                            {/* Content */}
                            <div className="relative z-10 text-center">
                                {/* Header with bouncing icon */}
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 0.6, repeat: Infinity }}
                                    className="inline-flex items-center justify-center p-4 rounded-full bg-white/20 mb-4"
                                >
                                    <DollarSign className="w-10 h-10 text-white" />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-emerald-100 text-xl font-bold uppercase tracking-[0.3em] mb-2"
                                >
                                    You Earned
                                </motion.div>

                                {/* Amount */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.3, type: "spring", damping: 10 }}
                                    className="text-7xl font-black text-white mb-4 flex items-baseline justify-center gap-1"
                                >
                                    <span className="text-4xl">$</span>
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                    >
                                        {(notification.amount ?? 0).toFixed(0)}
                                    </motion.span>
                                </motion.div>

                                {/* Details pill */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="inline-flex items-center gap-2 bg-white/20 px-5 py-3 rounded-full text-white border border-white/20"
                                >
                                    {tierIcons[notification.tier?.toLowerCase() || 'bronze']}
                                    <span className="font-medium">
                                        {notification.tier?.toUpperCase()} {notification.type?.toLowerCase().includes('truth') ? 'Truth' : 'Dare'}
                                    </span>
                                    <span className="text-white/60">from</span>
                                    <span className="font-bold">{notification.fanName}</span>
                                </motion.div>

                                {/* Session total hint */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="mt-6 flex items-center justify-center gap-2 text-emerald-200"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-sm">Added to your session earnings!</span>
                                </motion.div>

                                {/* Auto-close progress bar */}
                                <div className="mt-6 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-white/60 rounded-full"
                                        initial={{ width: "100%" }}
                                        animate={{ width: "0%" }}
                                        transition={{ duration: 5, ease: "linear" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
