"use client";

import React, { useState, useEffect } from "react";
import { X, CreditCard, Banknote, Landmark, ChevronRight, Check, Wallet, Loader2, Upload } from "lucide-react";
import { usePayment } from "../../app/context/PaymentContext";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import StripePaymentModal from "@/components/live/StripePaymentModal";
import { uploadToLocalServer } from "@/utils/uploadHelper";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onTopUp: (amount: number, method: string, status: 'pending' | 'completed', proofUrl?: string) => Promise<void>;
};

export default function TopUpModal({ isOpen, onClose, onTopUp }: Props) {
    const { config } = usePayment();
    const supabase = createClient();
    const [step, setStep] = useState<1 | 2>(1);
    const [amount, setAmount] = useState<number>(0);
    const [customAmount, setCustomAmount] = useState("");
    const [method, setMethod] = useState<"card" | "paypal" | "bank" | "">("");
    const [loading, setLoading] = useState(false);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [showStripeModal, setShowStripeModal] = useState(false);

    useEffect(() => {
        // Any side effects related to modal open/close or state changes can go here
    }, []);

    if (!isOpen) return null;

    const amounts = [10, 20, 50, 100, 200, 500];

    const handleAmountSelect = (val: number) => {
        setAmount(val);
        setCustomAmount("");
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setCustomAmount(e.target.value);
        if (!isNaN(val) && val > 0) {
            setAmount(val);
        } else {
            setAmount(0);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProofFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!amount || !method) return;
        if (method === 'bank' && !proofFile) return; // Require proof for bank

        if (method === 'card') {
            // Open Stripe Modal
            setShowStripeModal(true);
            return; // Stop here, wait for Stripe success
        }

        setLoading(true);
        try {
            let proofUrl = undefined;
            const status = method === 'bank' ? 'pending' : 'completed';

            // Upload Proof if Bank Transfer
            if (method === 'bank' && proofFile) {
                const publicUrl = await uploadToLocalServer(proofFile);
                proofUrl = publicUrl;
            }

            await onTopUp(amount, method, status, proofUrl);
            onClose();

            setTimeout(() => {
                setStep(1);
                setAmount(0);
                setCustomAmount("");
                setMethod("");
                setProofFile(null);
            }, 300);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {showStripeModal && (
                <StripePaymentModal
                    amount={amount}
                    onClose={() => setShowStripeModal(false)}
                    onSuccess={() => {
                        onTopUp(amount, 'card', 'completed');
                        setShowStripeModal(false);
                        onClose();
                        // Reset state
                        setTimeout(() => {
                            setStep(1);
                            setAmount(0);
                            setCustomAmount("");
                            setMethod("");
                        }, 300);
                    }}
                    confirmUrl="/api/v1/payments/stripe/confirm-wallet"
                    metadata={{ type: 'wallet_topup' }}
                />
            )}

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#0a0a0a] border border-pink-500/20 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(236,72,153,0.15)] relative animate-in fade-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-pink-500" />
                            Top Up Wallet
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {step === 1 ? (
                            <div className="space-y-6">
                                <div className="text-sm text-gray-400">Select amount to add to your wallet</div>

                                {/* Amount Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                    {amounts.map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => handleAmountSelect(val)}
                                            className={`py-3 rounded-xl border font-semibold transition-all ${amount === val && !customAmount
                                                ? "bg-pink-600 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]"
                                                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-pink-500/30"
                                                }`}
                                        >
                                            ${val}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Amount */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-2 block uppercase tracking-wider font-semibold">Custom Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={customAmount}
                                            onChange={handleCustomAmountChange}
                                            placeholder="Enter amount"
                                            className={`w-full bg-white/5 border rounded-xl py-3 pl-8 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-all ${customAmount ? "border-pink-500/50 ring-pink-500/20" : "border-white/10 focus:border-pink-500/50"
                                                }`}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!amount || amount <= 0}
                                    className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Total to pay</span>
                                    <span className="text-2xl font-bold text-white">${amount.toFixed(2)}</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Select Payment Method</div>

                                    {/* Card */}
                                    {config.stripe.enabled && (
                                        <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${method === 'card' ? 'bg-pink-500/10 border-pink-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                            <input type="radio" name="method" className="hidden" onChange={() => setMethod('card')} />
                                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-white">Credit / Debit Card</div>
                                                <div className="text-xs text-gray-400">Instant | Visa, Mastercard</div>
                                            </div>
                                            {method === 'card' && <Check className="w-5 h-5 text-pink-500" />}
                                        </label>
                                    )}

                                    {/* PayPal */}
                                    {config.paypal.enabled && (
                                        <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${method === 'paypal' ? 'bg-pink-500/10 border-pink-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                            <input type="radio" name="method" className="hidden" onChange={() => setMethod('paypal')} />
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                <Banknote className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-white">PayPal</div>
                                                <div className="text-xs text-gray-400">Instant</div>
                                            </div>
                                            {method === 'paypal' && <Check className="w-5 h-5 text-pink-500" />}
                                        </label>
                                    )}

                                    {/* Bank */}
                                    {config.bank.enabled && (
                                        <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${method === 'bank' ? 'bg-pink-500/10 border-pink-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                            <input type="radio" name="method" className="hidden" onChange={() => setMethod('bank')} />
                                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                                <Landmark className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-white">Offline Bank Transfer</div>
                                                <div className="text-xs text-gray-400">Manually Reviewed</div>
                                            </div>
                                            {method === 'bank' && <Check className="w-5 h-5 text-pink-500" />}
                                        </label>
                                    )}

                                    {!config.stripe.enabled && !config.paypal.enabled && !config.bank.enabled && (
                                        <div className="text-center text-red-400 text-sm py-4">
                                            No payment methods available.
                                        </div>
                                    )}
                                </div>

                                {method === 'bank' && config.bank.enabled && (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-xs">
                                            <p className="font-bold mb-1">Bank Details:</p>
                                            <p>{config.bank.bankName}</p>
                                            <p>Acct: {config.bank.accountNumber}</p>
                                            {config.bank.routingNumber && <p>Routing: {config.bank.routingNumber}</p>}
                                            <p>Ref: <span className="font-mono bg-black/30 px-1 rounded">Your Username</span></p>
                                            <p className="mt-2 opacity-80">{config.bank.instructions}</p>
                                        </div>

                                        <div className="border border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/5 transition relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            <div className="flex flex-col items-center gap-2">
                                                <Upload className="w-6 h-6 text-gray-400" />
                                                {proofFile ? (
                                                    <span className="text-sm text-green-400 font-medium">{proofFile.name}</span>
                                                ) : (
                                                    <>
                                                        <span className="text-sm text-gray-300 font-medium">Upload Payment Proof</span>
                                                        <span className="text-xs text-gray-500">Click to select screenshot</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold transition"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!method || loading || (method === 'bank' && !proofFile)}
                                        className="flex-1 py-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : method === 'bank' ? "Submit Verification" : "Pay Now"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
