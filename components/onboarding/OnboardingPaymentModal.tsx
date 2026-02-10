"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, CreditCard, Landmark, DollarSign, Check, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { usePayment } from "@/app/context/PaymentContext";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import StripePaymentModal from "@/components/live/StripePaymentModal";

interface Props {
    amount: number;
    planName: string;
    planType: "membership" | "creator_level" | "account_type";
    planId?: string;
    onSuccess: () => void;
    onCancel: () => void;
    onBankPending?: () => void; // Called when bank transfer is submitted (pending approval)
}

type PaymentMethod = "stripe" | "paypal" | "bank";

export default function OnboardingPaymentModal({
    amount,
    planName,
    planType,
    planId,
    onSuccess,
    onCancel,
    onBankPending,
}: Props) {
    const { config, loading: configLoading } = usePayment();
    const { user } = useAuth();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [processing, setProcessing] = useState(false);
    const [showBankDetails, setShowBankDetails] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showStripeModal, setShowStripeModal] = useState(false);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                toast.error("Please upload an image file");
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB");
                return;
            }
            setReceiptFile(file);
            setReceiptPreview(URL.createObjectURL(file));
        }
    };

    const handlePay = async () => {
        if (!selectedMethod) return;

        setProcessing(true);

        if (selectedMethod === "stripe") {
            setShowStripeModal(true);
            setProcessing(false);
            return;
        } else if (selectedMethod === "paypal") {
            await simulatePayment();
            toast.success("Payment successful!");
            onSuccess();
        } else if (selectedMethod === "bank") {
            setShowBankDetails(true);
            setProcessing(false);
            return;
        }

        setProcessing(false);
    };

    const simulatePayment = () => {
        return new Promise((resolve) => setTimeout(resolve, 2000));
    };

    const handleBankTransferSubmit = async () => {
        if (!receiptFile || !user) {
            toast.error("Please upload your payment receipt");
            return;
        }

        setUploading(true);

        try {
            // Upload receipt to storage
            const fileExt = receiptFile.name.split(".").pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("payment-receipts")
                .upload(fileName, receiptFile);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("payment-receipts")
                .getPublicUrl(fileName);

            // Create bank payment submission
            const { error: submitError } = await supabase
                .from("bank_payment_submissions")
                .insert({
                    user_id: user.id,
                    amount,
                    payment_for: planType,
                    plan_id: planId,
                    plan_name: planName,
                    receipt_url: urlData.publicUrl,
                    status: "pending",
                });

            if (submitError) throw submitError;

            // Update profile to mark bank payment pending
            const updateData: Record<string, unknown> = {
                bank_payment_pending: true,
                updated_at: new Date().toISOString(),
            };

            // For account_type, store the pending type
            if (planType === "account_type" && planId) {
                updateData.pending_account_type_id = planId;
            }

            await supabase
                .from("profiles")
                .update(updateData)
                .eq("id", user.id);

            toast.success("Payment receipt submitted! Awaiting admin verification.");

            // Call the pending callback if provided, otherwise success
            if (onBankPending) {
                onBankPending();
            } else {
                onSuccess();
            }
        } catch (error) {
            console.error("Error submitting bank payment:", error);
            toast.error("Failed to submit payment. Please try again.");
        } finally {
            setUploading(false);
        }
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-gray-900 border border-green-500/20 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-300 my-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-green-500" />
                            Bank Transfer
                        </h2>
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-white p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Bank Details */}
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

                    {/* Receipt Upload */}
                    <div className="mb-4">
                        <label className="text-sm text-gray-400 block mb-2">
                            Upload Payment Receipt/Screenshot *
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            className="hidden"
                        />

                        {receiptPreview ? (
                            <div className="relative">
                                <img
                                    src={receiptPreview}
                                    alt="Receipt preview"
                                    className="w-full h-48 object-cover rounded-xl border border-white/10"
                                />
                                <button
                                    onClick={() => {
                                        setReceiptFile(null);
                                        setReceiptPreview(null);
                                    }}
                                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-32 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-green-500/40 hover:text-green-400 transition"
                            >
                                <Upload className="w-8 h-8" />
                                <span className="text-sm">Click to upload receipt</span>
                                <span className="text-xs text-gray-500">PNG, JPG up to 5MB</span>
                            </button>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleBankTransferSubmit}
                        disabled={!receiptFile || uploading}
                        className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${receiptFile && !uploading
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                            : "bg-gray-800 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Submit for Verification
                            </>
                        )}
                    </button>

                    <p className="text-gray-500 text-xs text-center mt-3">
                        Your account will be activated once admin verifies your payment
                    </p>

                    {/* Back to payment methods */}
                    <button
                        onClick={() => setShowBankDetails(false)}
                        className="w-full mt-3 text-gray-400 hover:text-white text-sm transition"
                    >
                        ← Back to payment methods
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {showStripeModal && (
                <StripePaymentModal
                    amount={amount}
                    onClose={() => setShowStripeModal(false)}
                    onSuccess={() => {
                        toast.success("Payment successful!");
                        onSuccess();
                        setShowStripeModal(false);
                    }}
                    confirmUrl="/api/v1/payments/stripe/confirm-membership"
                    metadata={{
                        type: planType,
                        planId: planId,
                        planName: planName
                    }}
                />
            )}
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
                                    {planType === "membership" ? "Fan Membership" : planType === "creator_level" ? "Creator Level" : "Account Type"}
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
                                    <div className="text-left flex-1">
                                        <span className="text-white font-medium">{method.name}</span>
                                        {method.id === "bank" && (
                                            <p className="text-xs text-gray-500">Upload receipt for verification</p>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <Check className="w-5 h-5 text-green-500" />
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
                            selectedMethod === "bank" ? "Continue to Bank Transfer" : `Pay $${amount.toFixed(2)}`
                        )}
                    </button>

                    {/* Security Note */}
                    <p className="text-gray-500 text-xs text-center mt-4">
                        🔒 Secure payment powered by industry-leading encryption
                    </p>
                </div>
            </div>
        </>
    );
}
