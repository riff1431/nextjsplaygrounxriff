"use client";

import React, { useState, useEffect } from "react";
import { X, Wallet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { useRouter } from "next/navigation";

interface Props {
    amount: number;
    planName: string;
    planType: "membership" | "creator_level" | "account_type";
    planId?: string;
    onSuccess: () => void;
    onCancel: () => void;
    onBankPending?: () => void; // Kept for API compat but no longer triggers
}

export default function OnboardingPaymentModal({
    amount,
    planName,
    planType,
    planId,
    onSuccess,
    onCancel,
}: Props) {
    const { user } = useAuth();
    const { balance, isLoading: walletLoading, refresh: refreshWallet } = useWallet();
    const supabase = createClient();
    const router = useRouter();

    const [processing, setProcessing] = useState(false);
    const [done, setDone] = useState(false);

    const insufficient = balance < amount;

    const handleWalletPay = async () => {
        if (!user || insufficient || processing) return;

        setProcessing(true);

        try {
            // 1. Get wallet record for transaction logging
            const { data: walletData } = await supabase
                .from("wallets")
                .select("id, balance")
                .eq("user_id", user.id)
                .single();

            if (!walletData || walletData.balance < amount) {
                throw new Error("Insufficient funds");
            }

            // 2. Deduct from wallet (atomic balance update)
            const { error: deductError } = await supabase.rpc("deduct_balance", {
                p_user_id: user.id,
                p_amount: amount,
            });
            if (deductError) throw deductError;

            // 3. Record the debit transaction
            await supabase.from("transactions").insert({
                wallet_id: walletData.id,
                user_id: user.id,
                amount,
                type: "debit",
                description: `${planType}: ${planName}`,
                status: "completed",
                payment_method: "wallet",
                metadata: { plan_type: planType, plan_id: planId },
            });

            // Activate the plan based on type
            if (planType === "account_type" && planId) {
                await supabase
                    .from("profiles")
                    .update({
                        account_type_id: planId,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", user.id);
            } else if (planType === "membership" && planId) {
                await supabase
                    .from("profiles")
                    .update({
                        membership_id: planId,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", user.id);
            } else if (planType === "creator_level" && planId) {
                await supabase
                    .from("profiles")
                    .update({
                        creator_level_id: planId,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", user.id);
            }

            setDone(true);
            toast.success("Payment successful!");
            await refreshWallet();

            setTimeout(() => {
                setDone(false);
                setProcessing(false);
                onSuccess();
            }, 1200);
        } catch (error) {
            console.error("Wallet payment error:", error);
            toast.error("Payment failed. Please try again.");
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-pink-500/20 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Complete Payment</h2>
                    <button
                        onClick={onCancel}
                        disabled={processing}
                        className="text-gray-400 hover:text-white p-1 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Order Summary */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-white font-medium">{planName}</p>
                            <p className="text-gray-400 text-sm">
                                {planType === "membership" ? "Fan Membership" : planType === "creator_level" ? "Creator Level" : "Account Type"}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-white">€{amount.toFixed(2)}</p>
                            <p className="text-gray-500 text-xs">one-time</p>
                        </div>
                    </div>
                </div>

                {/* Wallet Balance */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">Wallet Balance</p>
                                <p className="text-xs text-gray-500">Pay from your wallet</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {walletLoading ? (
                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                            ) : (
                                <p className={`text-lg font-bold ${insufficient ? "text-red-400" : "text-emerald-400"}`}>
                                    €{balance.toFixed(2)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Remaining after purchase */}
                {!insufficient && !walletLoading && (
                    <div className="text-xs text-gray-500 text-center mb-4">
                        Remaining after purchase:{" "}
                        <span className="text-gray-300 font-medium">
                            €{(balance - amount).toFixed(2)}
                        </span>
                    </div>
                )}

                {/* Insufficient balance warning */}
                {insufficient && !walletLoading && (
                    <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3 mb-4">
                        <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-300">
                                Insufficient funds
                            </p>
                            <p className="text-xs text-red-300/70 mt-0.5">
                                You need €{(amount - balance).toFixed(2)} more. Top up your wallet to continue.
                            </p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={processing}
                        className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    {insufficient ? (
                        <button
                            onClick={() => router.push("/account/wallet")}
                            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:brightness-110 shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            <Wallet className="w-4 h-4" />
                            Top Up Wallet
                        </button>
                    ) : (
                        <button
                            onClick={handleWalletPay}
                            disabled={processing || walletLoading}
                            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${done
                                ? "bg-emerald-600 text-white"
                                : "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:brightness-110 shadow-lg shadow-pink-500/25"
                                }`}
                        >
                            {done ? (
                                <>
                                    <CheckCircle2 size={16} /> Done!
                                </>
                            ) : processing ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                `Pay €${amount.toFixed(2)}`
                            )}
                        </button>
                    )}
                </div>

                {/* Security Note */}
                <p className="text-gray-500 text-xs text-center mt-4">
                    🔒 Secure payment via PlaygroundX Wallet
                </p>
            </div>
        </div>
    );
}
