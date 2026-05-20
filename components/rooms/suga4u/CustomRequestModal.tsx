"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Wallet, AlertTriangle, Loader2, CheckCircle2, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { cs } from "@/utils/currency";

interface CustomRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (customText: string) => Promise<void> | void;
    requestName: string;
    requestEmoji: string;
    amount: number;
    walletBalance: number;
}

export default function CustomRequestModal({
    isOpen,
    onClose,
    onConfirm,
    requestName,
    requestEmoji,
    amount,
    walletBalance,
}: CustomRequestModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [customText, setCustomText] = useState("");
    const insufficient = walletBalance < amount;

    // Reset modal state whenever it opens
    useEffect(() => {
        if (isOpen) {
            setLoading(false);
            setDone(false);
            setCustomText("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (insufficient || loading || !customText.trim()) return;
        setLoading(true);
        try {
            await onConfirm(customText.trim());
            setDone(true);
            setTimeout(() => {
                setDone(false);
                setLoading(false);
                onClose();
            }, 1200);
        } catch {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm"
                onClick={() => !loading && onClose()}
            />

            {/* Modal */}
            <div className="relative z-20 w-full max-w-md mx-4 rounded-2xl border border-pink-500/20 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(236,72,153,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Decorative glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="relative flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/20 flex items-center justify-center text-lg">
                            {requestEmoji}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">{requestName} Request</h3>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Write your request</p>
                        </div>
                    </div>
                    <button
                        onClick={() => !loading && onClose()}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="relative px-5 pb-5 space-y-4">
                    {/* Custom text input */}
                    <div>
                        <label className="text-xs text-white/50 font-medium mb-1.5 flex items-center gap-1">
                            <Sparkles size={12} className="text-pink-400" />
                            Your Custom Request
                        </label>
                        <textarea
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            placeholder={`Tell the creator what you want for your ${requestName}...`}
                            rows={3}
                            maxLength={500}
                            className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 resize-none transition-all"
                        />
                        <p className="text-[10px] text-white/30 text-right mt-1">{customText.length}/500</p>
                    </div>

                    {/* Price + Balance */}
                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3.5">
                        <div>
                            <p className="text-[10px] text-white/50 mb-0.5 uppercase tracking-wider">Price</p>
                            <p className="text-xl font-bold text-emerald-400">
                                {cs()}{amount.toFixed(2)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-white/50 mb-0.5 flex items-center gap-1 justify-end uppercase tracking-wider">
                                <Wallet size={10} /> Balance
                            </p>
                            <p
                                className={`text-lg font-bold ${insufficient ? "text-red-400" : "text-white"
                                    }`}
                            >
                                {cs()}{walletBalance.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Remaining */}
                    {!insufficient && customText.trim() && (
                        <div className="text-xs text-white/40 text-center">
                            Remaining after purchase:{" "}
                            <span className="text-white/70 font-medium">
                                {cs()}{(walletBalance - amount).toFixed(2)}
                            </span>
                        </div>
                    )}

                    {/* Insufficient warning */}
                    {insufficient && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-red-300">
                                    Insufficient funds
                                </p>
                                <p className="text-[10px] text-red-300/70">
                                    You need {cs()}{(amount - walletBalance).toFixed(2)} more. Top up
                                    your wallet to continue.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={() => !loading && onClose()}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        {insufficient ? (
                            <button
                                onClick={() => router.push("/account/wallet")}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                Top Up Wallet
                            </button>
                        ) : (
                            <button
                                onClick={handleConfirm}
                                disabled={loading || !customText.trim()}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 ${done
                                        ? "bg-emerald-600 text-white"
                                        : "bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:brightness-110 shadow-lg shadow-pink-900/30"
                                    }`}
                            >
                                {done ? (
                                    <>
                                        <CheckCircle2 size={16} /> Sent!
                                    </>
                                ) : loading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <Send size={14} /> Pay {cs()}{amount.toFixed(2)} & Send
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
