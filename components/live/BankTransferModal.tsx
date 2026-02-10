"use client";

import React, { useState } from "react";
import { X, AlertCircle, CheckCircle, Landmark, Copy } from "lucide-react";
import { toast } from "sonner";

type BankTransferModalProps = {
    amount: number;
    roomId: string; // The session ID
    bankDetails: {
        bank_name?: string;
        account_name?: string;
        account_number?: string;
        swift?: string;
        routing?: string;
        notes?: string;
    };
    onClose: () => void;
    onSuccess: () => void;
};

export default function BankTransferModal({ amount, roomId, bankDetails, onClose, onSuccess }: BankTransferModalProps) {
    const [referenceId, setReferenceId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!referenceId.trim()) {
            setError("Please enter a transaction reference ID");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/v1/payments/bank/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomId,
                    amount,
                    referenceId
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to submit payment");
            }

            toast.success("Payment submitted for verification");
            onSuccess();
        } catch (err: any) {
            console.error("Submission error:", err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Copied to clipboard");
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                            <Landmark className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Bank Transfer</h3>
                        <p className="text-gray-400 text-sm">
                            Please transfer <span className="text-white font-bold">${amount.toFixed(2)}</span> to the details below.
                        </p>
                    </div>

                    {/* Bank Details Card */}
                    <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-white/5 space-y-3">
                        <div className="flex justify-between items-start">
                            <span className="text-gray-500 text-xs uppercase tracking-wider">Bank Name</span>
                            <span className="text-white font-medium text-right">{bankDetails.bank_name || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-start group cursor-pointer" onClick={() => copyToClipboard(bankDetails.account_name || "")}>
                            <span className="text-gray-500 text-xs uppercase tracking-wider">Account Name</span>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-medium text-right">{bankDetails.account_name || "N/A"}</span>
                                <Copy className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition" />
                            </div>
                        </div>
                        <div className="flex justify-between items-start group cursor-pointer" onClick={() => copyToClipboard(bankDetails.account_number || "")}>
                            <span className="text-gray-500 text-xs uppercase tracking-wider">Account No.</span>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-mono font-medium text-right">{bankDetails.account_number || "N/A"}</span>
                                <Copy className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition" />
                            </div>
                        </div>
                        {bankDetails.swift && (
                            <div className="flex justify-between items-start group cursor-pointer" onClick={() => copyToClipboard(bankDetails.swift || "")}>
                                <span className="text-gray-500 text-xs uppercase tracking-wider">SWIFT/BIC</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-mono font-medium text-right">{bankDetails.swift}</span>
                                    <Copy className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Transaction Reference / ID</label>
                            <input
                                type="text"
                                value={referenceId}
                                onChange={(e) => setReferenceId(e.target.value)}
                                placeholder="e.g. TRX-12345678"
                                className="w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 transition"
                            />
                            <p className="text-[10px] text-gray-500 mt-2 ml-1">
                                Enter the transaction reference from your banking app so we can verify your payment.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Submit Payment <CheckCircle className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
