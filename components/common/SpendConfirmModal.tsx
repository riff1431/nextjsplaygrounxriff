"use client";

import React, { useState } from "react";
import { X, Wallet, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SpendConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    title?: string;
    itemLabel: string;
    amount: number;
    walletBalance: number;
    description?: string;
    /** optional override for the confirm button label */
    confirmLabel?: string;
    requireInput?: boolean;
    inputPlaceholder?: string;
    inputValue?: string;
    onInputChange?: (val: string) => void;
}

export default function SpendConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Purchase",
    itemLabel,
    amount,
    walletBalance,
    description,
    confirmLabel,
    requireInput,
    inputPlaceholder = "Enter your prompt...",
    inputValue = "",
    onInputChange,
}: SpendConfirmModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const insufficient = walletBalance < amount;

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (insufficient || loading) return;
        setLoading(true);
        try {
            await onConfirm();
            setDone(true);
            setTimeout(() => {
                setDone(false);
                onClose();
            }, 1200);
        } catch {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => !loading && onClose()}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <h3 className="text-base font-bold text-white">{title}</h3>
                    <button
                        onClick={() => !loading && onClose()}
                        className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 pb-5 space-y-4">
                    {/* Item */}
                    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                        <p className="text-sm text-white/70 mb-1">Item</p>
                        <p className="text-white font-semibold">{itemLabel}</p>
                        {description && (
                            <p className="text-xs text-white/50 mt-1">{description}</p>
                        )}
                    </div>

                    {/* Price + Balance */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-white/50 mb-0.5">Price</p>
                            <p className="text-xl font-bold text-emerald-400">
                                ${amount.toFixed(2)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-white/50 mb-0.5 flex items-center gap-1 justify-end">
                                <Wallet size={12} /> Wallet Balance
                            </p>
                            <p
                                className={`text-lg font-bold ${insufficient ? "text-red-400" : "text-white"
                                    }`}
                            >
                                ${walletBalance.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Remaining */}
                    {!insufficient && !requireInput && (
                        <div className="text-xs text-white/40 text-center">
                            Remaining after purchase:{" "}
                            <span className="text-white/70 font-medium">
                                ${(walletBalance - amount).toFixed(2)}
                            </span>
                        </div>
                    )}

                    {/* Optional Input */}
                    {requireInput && (
                        <div className="mb-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => onInputChange?.(e.target.value)}
                                placeholder={inputPlaceholder}
                                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400"
                            />
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
                                    You need ${(amount - walletBalance).toFixed(2)} more. Top up
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
                                disabled={loading || (requireInput && !inputValue.trim())}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${done
                                        ? "bg-emerald-600 text-white"
                                        : "bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:brightness-110 shadow-lg shadow-pink-900/30"
                                    }`}
                            >
                                {done ? (
                                    <>
                                        <CheckCircle2 size={16} /> Done!
                                    </>
                                ) : loading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    confirmLabel || `Pay €${amount.toFixed(2)}`
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
