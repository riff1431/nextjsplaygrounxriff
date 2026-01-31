"use client";

import React, { useState, useEffect } from "react";
import { X, CreditCard, Landmark, DollarSign, Check, Loader2 } from "lucide-react";
import { usePayment } from "@/app/context/PaymentContext";
import { toast } from "sonner";

interface Props {
    amount: number;
    planName: string;
    planType: "membership" | "creator_level";
    onSuccess: () => void;
    onCancel: () => void;
}

type PaymentMethod = "stripe" | "paypal" | "bank";

export default function OnboardingPaymentModal({
    amount,
    planName,
    planType,
    onSuccess,
    onCancel,
}: Props) {
    const { config, loading: configLoading } = usePayment();
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [processing, setProcessing] = useState(false);
    const [showBankDetails, setShowBankDetails] = useState(false);

    // Auto-select first available method
    useEffect(() => {
        if (!configLoading) {
            if (config.stripe.enabled) setSelectedMethod("stripe");
            else if (config.paypal.enabled) setSelectedMethod("paypal");
            else if (config.bank.enabled) setSelectedMethod("bank");
        }
    }, [configLoading, config]);

    const availableMethods = [
        {
            id: "stripe" as PaymentMethod,
            name: "Credit/Debit Card",
            icon: CreditCard,
            enabled: config.stripe.enabled,
            color: "blue",
        },
        {
            id: "paypal" as PaymentMethod,
            name: "PayPal",
            icon: DollarSign,
            enabled: config.paypal.enabled,
            color: "indigo",
        },
        {
            id: "bank" as PaymentMethod,
            name: "Bank Transfer",
            icon: Landmark,
            enabled: config.bank.enabled,
            color: "green",
        },
    ].filter((m) => m.enabled);

    const handlePay = async () => {
        if (!selectedMethod) return;

        setProcessing(true);

        // Simulate payment processing
        // In production, this would integrate with actual payment APIs

        if (selectedMethod === "stripe") {
            // Would integrate with Stripe Elements here
            await simulatePayment();
            toast.success("Payment successful!");
            onSuccess();
        } else if (selectedMethod === "paypal") {
            // Would integrate with PayPal SDK here
            await simulatePayment();
            toast.success("Payment successful!");
            onSuccess();
        } else if (selectedMethod === "bank") {
            // Bank transfer - show details and mark as pending
            setShowBankDetails(true);
            setProcessing(false);
            return;
        }

        setProcessing(false);
    };

    const simulatePayment = () => {
        return new Promise((resolve) => setTimeout(resolve, 2000));
    };

    const handleBankTransferComplete = () => {
        toast.success("Bank transfer initiated. We'll verify and activate your plan.");
        onSuccess();
    };

    if (configLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-gray-900 rounded-2xl p-8">
                    <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
                    <p className="text-gray-400 mt-4">Loading payment options...</p>
                </div>
            </div>
        );
    }

    if (showBankDetails) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-gray-900 border border-green-500/20 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-green-500" />
                            Bank Transfer Details
                        </h2>
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-white p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-4">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Bank Name</span>
                                <span className="text-white font-medium">{config.bank.bankName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Account Name</span>
                                <span className="text-white font-medium">{config.bank.accountName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Account Number</span>
                                <span className="text-white font-mono">{config.bank.accountNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Routing/IBAN</span>
                                <span className="text-white font-mono">{config.bank.routingNumber}</span>
                            </div>
                            <div className="border-t border-white/10 pt-3 mt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Amount to Send</span>
                                    <span className="text-2xl font-bold text-green-400">
                                        ${amount.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {config.bank.instructions && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
                            <p className="text-yellow-300 text-xs">
                                <strong>Important:</strong> {config.bank.instructions}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleBankTransferComplete}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all"
                    >
                        I've Made the Transfer
                    </button>

                    <p className="text-gray-500 text-xs text-center mt-3">
                        Your plan will be activated once we verify the transfer
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-pink-500/20 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Complete Payment</h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white p-1"
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
                                {planType === "membership" ? "Fan Membership" : "Creator Level"}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-white">${amount.toFixed(2)}</p>
                            <p className="text-gray-500 text-xs">one-time</p>
                        </div>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3 mb-6">
                    <p className="text-gray-400 text-sm mb-2">Select payment method</p>
                    {availableMethods.map((method) => {
                        const IconComponent = method.icon;
                        const isSelected = selectedMethod === method.id;

                        return (
                            <button
                                key={method.id}
                                onClick={() => setSelectedMethod(method.id)}
                                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${isSelected
                                        ? `border-${method.color}-500 bg-${method.color}-500/10`
                                        : "border-white/10 hover:border-white/20"
                                    }`}
                                style={{
                                    borderColor: isSelected
                                        ? method.color === "blue"
                                            ? "#3b82f6"
                                            : method.color === "indigo"
                                                ? "#6366f1"
                                                : "#22c55e"
                                        : undefined,
                                    backgroundColor: isSelected
                                        ? method.color === "blue"
                                            ? "rgba(59, 130, 246, 0.1)"
                                            : method.color === "indigo"
                                                ? "rgba(99, 102, 241, 0.1)"
                                                : "rgba(34, 197, 94, 0.1)"
                                        : undefined,
                                }}
                            >
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center`}
                                    style={{
                                        backgroundColor:
                                            method.color === "blue"
                                                ? "rgba(59, 130, 246, 0.2)"
                                                : method.color === "indigo"
                                                    ? "rgba(99, 102, 241, 0.2)"
                                                    : "rgba(34, 197, 94, 0.2)",
                                    }}
                                >
                                    <IconComponent
                                        className="w-5 h-5"
                                        style={{
                                            color:
                                                method.color === "blue"
                                                    ? "#3b82f6"
                                                    : method.color === "indigo"
                                                        ? "#6366f1"
                                                        : "#22c55e",
                                        }}
                                    />
                                </div>
                                <span className="text-white font-medium">{method.name}</span>
                                {isSelected && (
                                    <Check className="w-5 h-5 text-green-500 ml-auto" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Pay Button */}
                <button
                    onClick={handlePay}
                    disabled={!selectedMethod || processing}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${selectedMethod && !processing
                            ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/25"
                            : "bg-gray-800 text-gray-500 cursor-not-allowed"
                        }`}
                >
                    {processing ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </span>
                    ) : (
                        `Pay $${amount.toFixed(2)}`
                    )}
                </button>

                {/* Security Note */}
                <p className="text-gray-500 text-xs text-center mt-4">
                    🔒 Secure payment powered by industry-leading encryption
                </p>
            </div>
        </div>
    );
}
