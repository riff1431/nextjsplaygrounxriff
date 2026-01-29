"use client";

import React, { useState } from "react";
import { X, ArrowUpRight, Banknote, Building2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    onSuccess: () => void;
}

export default function WithdrawalModal({ isOpen, onClose, balance, onSuccess }: WithdrawalModalProps) {
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
            toast.error("Minimum withdrawal is $10");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-pink-500" />
                    Request Withdrawal
                </h2>

                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Available Balance</div>
                    <div className="text-2xl font-bold text-white">${balance.toFixed(2)}</div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Amount ($)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="10"
                            step="0.01"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none transition"
                            placeholder="0.00"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum withdrawal amount is $10.00</p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Payout Method</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setMethod("paypal")}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${method === "paypal"
                                        ? "bg-blue-600/20 border-blue-500 text-blue-200"
                                        : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5"
                                    }`}
                            >
                                <Banknote className="w-5 h-5" />
                                <span className="text-sm font-medium">PayPal</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod("bank_transfer")}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${method === "bank_transfer"
                                        ? "bg-pink-600/20 border-pink-500 text-pink-200"
                                        : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5"
                                    }`}
                            >
                                <Building2 className="w-5 h-5" />
                                <span className="text-sm font-medium">Bank Transfer</span>
                            </button>
                        </div>
                    </div>

                    {method === "paypal" ? (
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">PayPal Email</label>
                            <input
                                type="email"
                                value={details.email}
                                onChange={(e) => setDetails({ ...details, email: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none transition"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={details.bankName}
                                    onChange={(e) => setDetails({ ...details, bankName: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none transition"
                                    placeholder="Bank Name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Account Number / IBAN</label>
                                <input
                                    type="text"
                                    value={details.accountNumber}
                                    onChange={(e) => setDetails({ ...details, accountNumber: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none transition"
                                    placeholder="Account Number"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? "Processing..." : "Submit Request"}
                    </button>
                </form>
            </div>
        </div>
    );
}
