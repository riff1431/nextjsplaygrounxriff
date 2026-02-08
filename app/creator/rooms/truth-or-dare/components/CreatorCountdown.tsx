"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Flame, Sparkles, Crown, Zap, CheckCircle, XCircle, DollarSign, Timer, X } from "lucide-react";
import { playNotificationSound, playSuccessSound, playMoneySound } from "@/utils/sounds";
import { toast } from "sonner";

interface CountdownRequest {
    requestId: string;
    fanId: string;
    fanName: string;
    type: string;
    tier: string;
    content: string;
    amount: number;
    startedAt: number;
}

interface CreatorCountdownProps {
    request: CountdownRequest | null;
    roomId: string;
    onComplete: (earnedAmount: number) => void;
    onDismiss: () => void;
}

export default function CreatorCountdown({ request, roomId, onComplete, onDismiss }: CreatorCountdownProps) {
    const [countdown, setCountdown] = useState(10);
    const [revealed, setRevealed] = useState(false);
    const [answering, setAnswering] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [response, setResponse] = useState("");

    useEffect(() => {
        if (!request) {
            setCountdown(10);
            setRevealed(false);
            setAnswering(false);
            setShowSuccess(false);
            setResponse("");
            return;
        }

        const elapsed = (Date.now() - request.startedAt) / 1000;
        const remaining = Math.max(0, 10 - elapsed);
        setCountdown(Math.ceil(remaining));

        if (remaining <= 0) {
            setRevealed(true);
            playNotificationSound();
            return;
        }

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setRevealed(true);
                    playNotificationSound();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [request]);

    const handleAnswerNow = useCallback(async () => {
        if (!request || !roomId || answering) return;

        setAnswering(true);

        try {
            const apiRes = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: request.requestId,
                    earnedAmount: request.amount || 0,
                    creatorResponse: response
                })
            });

            if (!apiRes.ok) {
                throw new Error('Failed to submit answer');
            }

            setShowSuccess(true);
            playSuccessSound();

            setTimeout(() => {
                playMoneySound();
                const earnedAmount = request.amount || 0;
                onComplete(earnedAmount);
            }, 2000);

        } catch (error) {
            console.error('Error answering:', error);
            toast.error('Failed to submit answer');
            setAnswering(false);
        }
    }, [request, roomId, answering, onComplete, response]);

    if (!request) return null;

    const isTruth = request.type?.toLowerCase().includes("truth");

    // Apple-inspired liquid glass color schemes
    const tierStyles = {
        bronze: {
            glass: "from-amber-500/20 via-orange-400/15 to-amber-600/20",
            border: "border-amber-300/40",
            glow: "shadow-[0_8px_32px_rgba(217,119,6,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)]",
            accent: "text-amber-300",
            badge: "from-amber-500/80 to-orange-500/80"
        },
        silver: {
            glass: "from-cyan-500/20 via-slate-400/15 to-blue-500/20",
            border: "border-cyan-200/50",
            glow: "shadow-[0_8px_32px_rgba(6,182,212,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)]",
            accent: "text-cyan-200",
            badge: "from-cyan-500/80 to-blue-500/80"
        },
        gold: {
            glass: "from-yellow-400/25 via-amber-300/20 to-yellow-500/25",
            border: "border-yellow-200/60",
            glow: "shadow-[0_8px_40px_rgba(234,179,8,0.3),inset_0_1px_2px_rgba(255,255,255,0.5)]",
            accent: "text-yellow-200",
            badge: "from-yellow-400/90 to-amber-400/90"
        }
    };
    const styles = tierStyles[request.tier?.toLowerCase() as keyof typeof tierStyles] || tierStyles.bronze;

    // Success celebration
    if (showSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[100] flex items-center justify-center"
                style={{
                    background: 'radial-gradient(circle at center, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0.95) 70%)'
                }}
            >
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="text-center relative"
                >
                    {/* Close Button */}
                    <button
                        onClick={onDismiss}
                        className="absolute -top-12 -right-12 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-sm"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: 3 }}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-green-400/30 blur-3xl rounded-full" />
                        <CheckCircle className="relative w-32 h-32 text-green-400 mx-auto" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 text-4xl font-bold text-white"
                    >
                        Answered! 🎉
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, type: "spring" }}
                        className="mt-4 text-6xl font-black text-green-400"
                    >
                        +${request.amount || 0}
                    </motion.div>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            {!revealed ? (
                // Countdown - Corner liquid glass card
                <motion.div
                    key="countdown"
                    initial={{ opacity: 0, x: 120, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 120, scale: 0.9 }}
                    transition={{ type: "spring", damping: 25 }}
                    className="fixed top-24 right-6 z-50"
                >
                    <div className={`
                        relative overflow-hidden w-80
                        bg-gradient-to-br ${styles.glass}
                        backdrop-blur-2xl backdrop-saturate-150
                        border ${styles.border}
                        rounded-3xl p-5
                        ${styles.glow}
                    `}>
                        {/* Glass highlight effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                        {/* Header */}
                        <div className="relative flex items-center gap-3 mb-4">
                            <motion.div
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className={`p-3 rounded-2xl backdrop-blur-sm ${isTruth ? 'bg-cyan-500/20' : 'bg-pink-500/20'} border border-white/10`}
                            >
                                {isTruth ? <MessageCircle className="w-6 h-6 text-cyan-300" /> : <Flame className="w-6 h-6 text-pink-400" />}
                            </motion.div>
                            <div className="flex-1">
                                <div className="text-xs text-white/50 uppercase tracking-[0.2em] font-medium">Incoming</div>
                                <div className="font-bold text-white text-lg flex items-center gap-2">
                                    {request.tier?.toUpperCase()} {isTruth ? 'TRUTH' : 'DARE'}
                                    {request.tier === 'gold' && <Crown className="w-4 h-4 text-yellow-400" />}
                                </div>
                            </div>

                            {/* Countdown circle */}
                            <div className="relative w-14 h-14">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                    <motion.circle
                                        cx="28" cy="28" r="24"
                                        fill="none"
                                        stroke={isTruth ? "#22d3ee" : "#f472b6"}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray={150.8}
                                        animate={{ strokeDashoffset: 150.8 - (countdown / 10) * 150.8 }}
                                        transition={{ duration: 1, ease: "linear" }}
                                        style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
                                    />
                                </svg>
                                <span className={`absolute inset-0 flex items-center justify-center text-2xl font-black ${styles.accent}`}>
                                    {countdown}
                                </span>
                            </div>
                        </div>

                        {/* Fan info */}
                        <div className="relative bg-black/20 backdrop-blur-sm rounded-xl p-3 mb-3 border border-white/5">
                            <div className="text-sm text-white/70">from <span className="font-bold text-white">{request.fanName}</span></div>
                        </div>

                        {/* Amount */}
                        <div className="relative flex items-center justify-between">
                            <motion.div
                                animate={{ scale: [1, 1.03, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="flex items-center gap-1 font-bold text-lg text-green-300 bg-green-500/15 px-4 py-2 rounded-xl border border-green-500/20"
                            >
                                <DollarSign className="w-5 h-5" />+{request.amount || 0}
                            </motion.div>
                            <div className="flex items-center gap-1 text-sm text-white/50">
                                <Timer className="w-4 h-4 animate-pulse" />Revealing...
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                // Revealed - Fullscreen Apple Liquid Glass Modal
                <motion.div
                    key="reveal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6"
                    style={{
                        background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(120,119,198,0.1) 0%, rgba(0,0,0,0.95) 100%)'
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.85, y: 60 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                        className={`
                            relative w-full max-w-xl overflow-hidden
                            bg-gradient-to-br ${styles.glass}
                            backdrop-blur-3xl backdrop-saturate-200
                            border ${styles.border}
                            rounded-[2.5rem]
                            ${styles.glow}
                        `}
                    >
                        {/* Glass highlights */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none rounded-[2.5rem]" />
                        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

                        {/* Ambient glow orbs */}
                        <motion.div
                            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"
                        />
                        <motion.div
                            animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -bottom-20 -right-20 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl"
                        />

                        <div className="relative p-8">
                            {/* Type badge */}
                            <div className="text-center mb-6">
                                <motion.div
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className={`
                                        inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                                        bg-gradient-to-r ${styles.badge}
                                        backdrop-blur-sm border border-white/20
                                        shadow-lg
                                    `}
                                >
                                    {isTruth ? <MessageCircle className="w-5 h-5 text-white" /> : <Flame className="w-5 h-5 text-white" />}
                                    <span className="font-bold text-white uppercase tracking-wide">
                                        {request.tier} {isTruth ? 'Truth' : 'Dare'}
                                    </span>
                                    <Sparkles className="w-4 h-4 text-yellow-300" />
                                </motion.div>
                            </div>

                            {/* Question box - frosted glass */}
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.15 }}
                                className="relative bg-black/30 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/10"
                            >
                                <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                <p className="text-2xl sm:text-3xl font-semibold text-white text-center leading-relaxed">
                                    "{request.content}"
                                </p>
                            </motion.div>

                            {/* Fan info & amount */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.25 }}
                                className="flex items-center justify-between mb-6"
                            >
                                <div className="text-white/70">
                                    From: <span className="font-bold text-white">{request.fanName}</span>
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="text-xl font-bold text-green-300 bg-green-500/15 px-5 py-2 rounded-xl border border-green-400/20 flex items-center gap-1 backdrop-blur-sm"
                                >
                                    <DollarSign className="w-5 h-5" />+{request.amount || 0}
                                </motion.div>
                            </motion.div>

                            {/* Response Input */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mb-6"
                            >
                                <textarea
                                    value={response}
                                    onChange={(e) => setResponse(e.target.value)}
                                    placeholder="Type your response or completion note..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all resize-none min-h-[100px]"
                                />
                            </motion.div>

                            {/* Action buttons */}
                            <motion.div
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.35 }}
                                className="flex gap-3"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleAnswerNow}
                                    disabled={answering}
                                    className={`
                                        flex-1 py-4 rounded-2xl
                                        bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500
                                        bg-[length:200%_100%] hover:bg-right transition-all duration-500
                                        text-white font-bold text-lg
                                        shadow-lg shadow-purple-500/30
                                        border border-white/20
                                        flex items-center justify-center gap-2
                                        backdrop-blur-sm
                                        ${answering ? 'opacity-70 cursor-wait' : ''}
                                    `}
                                >
                                    {answering ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-5 h-5" />
                                            Answer Now
                                        </>
                                    )}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onDismiss}
                                    disabled={answering}
                                    className="px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all border border-white/20 flex items-center gap-2 backdrop-blur-sm"
                                >
                                    <XCircle className="w-5 h-5" />
                                    Later
                                </motion.button>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
