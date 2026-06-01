"use client";

import React, { useEffect, useState } from "react";
import { X, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

const SESSION_KEY = "pgx_kyc_skipped_popup_shown";

export default function CsKycSkippedPopup() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const isShown = sessionStorage.getItem(SESSION_KEY);
        if (!isShown) {
            // Open the popup after a brief delay for a premium experience
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsOpen(false);
        sessionStorage.setItem(SESSION_KEY, "true");
    };

    const handleVerify = () => {
        sessionStorage.setItem(SESSION_KEY, "true");
        setIsOpen(false);
        router.push("/kyc-verification");
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
                {/* Overlay backdrop */}
                <div className="absolute inset-0" onClick={handleDismiss} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 p-6 sm:p-8 shadow-2xl overflow-hidden bg-gradient-to-b from-amber-950/15 via-black to-black"
                >
                    {/* Glowing background shapes */}
                    <div className="absolute -inset-10 opacity-30 blur-3xl pointer-events-none">
                        <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-pink-500/10 rounded-full" />
                    </div>

                    {/* Content wrapper */}
                    <div className="relative z-10 flex flex-col items-center text-center">
                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute -top-2 -right-2 p-1.5 rounded-full border border-white/10 bg-black/40 text-gray-400 hover:text-white hover:border-white/20 transition-all hover:scale-105"
                            aria-label="Dismiss verification popup"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Top Badge Icon */}
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse">
                            <ShieldAlert className="w-8 h-8 text-amber-400" />
                        </div>

                        {/* Label */}
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400 mb-2 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                            Identity Verification Required
                        </span>

                        {/* Title */}
                        <h2 className="text-xl sm:text-2xl font-black italic tracking-wide leading-tight mb-3 text-white">
                            Unlock Your Creator Potential!
                        </h2>

                        {/* Description */}
                        <p className="text-sm text-gray-300 leading-relaxed max-w-md mb-6">
                            You skipped the verification step during registration. To begin broadcasting live lounge rooms, accepting tips/gifts, and setting subscription price plans, please verify your profile.
                        </p>

                        {/* Feature checklist */}
                        <div className="w-full text-left space-y-2 mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0" />
                                <span>Go live & broadcast private rooms</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0" />
                                <span>Earn 85% from tips and gifts</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0" />
                                <span>Set custom weekly/monthly subscription prices</span>
                            </div>
                        </div>

                        {/* Call to action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                            <button
                                onClick={handleVerify}
                                className="px-6 py-3 rounded-2xl font-extrabold text-white text-sm bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 order-2 sm:order-1"
                            >
                                Verify My Identity
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-6 py-3 rounded-2xl font-bold text-gray-400 text-sm hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all order-1 sm:order-2"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
