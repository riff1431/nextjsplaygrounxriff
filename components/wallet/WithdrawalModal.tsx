"use client";

import React, { useState } from "react";
import { X, ArrowUpRight, Banknote, Building2, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { cs } from "@/utils/currency";
import { useCurrency } from "@/app/context/CurrencyContext";

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    onSuccess: () => void;
}

export default function WithdrawalModal({ isOpen, onClose, balance, onSuccess }: WithdrawalModalProps) {
    const { currency, formatPrice } = useCurrency();
    const [amount, setAmount] = useState<string>("");
    const [method, setMethod] = useState<"paypal" | "bank_transfer">("paypal");
    const [details, setDetails] = useState({ email: "", bankName: "", accountNumber: "" });
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (isNaN(val) || val < 10) {
            toast.error(`Minimum withdrawal is ${formatPrice(10)}`);
            return;
        }
        if (val > balance) {
            toast.error("Insufficient balance");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc("request_withdrawal", {
                amount_val: val,
                method_val: method,
                details_val: details
            });

            if (error) throw error;

            toast.success("Withdrawal requested successfully!");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Withdrawal error:", error);
            toast.error(error.message || "Failed to request withdrawal");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="relative w-full max-w-md bg-[#0b0c10]/95 border border-white/10 rounded-3xl p-6 shadow-[0_0_60px_rgba(236,72,153,0.18)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Visual Accent Gradient Top Strip */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />
                
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2.5 mt-2">
                    <div className="p-2 bg-pink-500/10 rounded-xl border border-pink-500/20 text-pink-400">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                    Request Withdrawal
                </h2>

                {/* Available Balance Panel */}
                <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/[0.06] flex justify-between items-center">
                    <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold">Available Balance</div>
                        <div className="text-2xl font-black text-white mt-1 tracking-tight">{formatPrice(balance, 2)}</div>
                    </div>
                    <div className="p-2 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold px-3 py-1 uppercase tracking-wider">
                        Active Wallet
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-pink-400/80 mb-2">Amount ({currency.symbol})</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-sm transition-colors group-focus-within:text-pink-400">
                                {currency.symbol}
                            </span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="10"
                                step="0.01"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-9 pr-4 text-white focus:outline-none focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-200 placeholder-gray-600 outline-none text-sm font-semibold"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1.5 font-medium">Minimum withdrawal amount is {formatPrice(10, 2)}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-pink-400/80 mb-2">Payout Method</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setMethod("paypal")}
                                className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition duration-300 cursor-pointer ${
                                    method === "paypal"
                                        ? "bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border-blue-500 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                        : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.05] hover:border-pink-500/30 hover:text-white"
                                }`}
                            >
                                <Banknote className="w-5 h-5" />
                                <span className="text-xs font-extrabold uppercase tracking-wider">PayPal</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod("bank_transfer")}
                                className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition duration-300 cursor-pointer ${
                                    method === "bank_transfer"
                                        ? "bg-gradient-to-r from-pink-950/20 to-purple-950/20 border-pink-500 text-pink-200 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                                        : "bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.05] hover:border-pink-500/30 hover:text-white"
                                }`}
                            >
                                <Building2 className="w-5 h-5" />
                                <span className="text-xs font-extrabold uppercase tracking-wider">Bank Transfer</span>
                            </button>
                        </div>
                    </div>

                    {method === "paypal" ? (
                        <div className="animate-in fade-in duration-200">
                            <label className="block text-xs font-bold uppercase tracking-widest text-pink-400/80 mb-2">PayPal Email Address</label>
                            <input
                                type="email"
                                value={details.email}
                                onChange={(e) => setDetails({ ...details, email: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition duration-200 text-sm placeholder-gray-700"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-pink-400/80 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    value={details.bankName}
                                    onChange={(e) => setDetails({ ...details, bankName: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition duration-200 text-sm placeholder-gray-700"
                                    placeholder="Enter your Bank Name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-pink-400/80 mb-2">Account Number / IBAN</label>
                                <input
                                    type="text"
                                    value={details.accountNumber}
                                    onChange={(e) => setDetails({ ...details, accountNumber: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition duration-200 text-sm placeholder-gray-700"
                                    placeholder="Enter IBAN or Account Number"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold tracking-wide shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.45)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm mt-6"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Processing Withdrawal...</span>
                            </>
                        ) : (
                            <span>Submit Withdrawal Request</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
