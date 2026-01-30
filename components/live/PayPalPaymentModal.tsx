"use client";

import React, { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { X, AlertCircle } from "lucide-react";

type PayPalPaymentModalProps = {
    amount: number;
    roomId: string; // The session ID to unlock
    onClose: () => void;
    onSuccess: () => void;
};

export default function PayPalPaymentModal({ amount, roomId, onClose, onSuccess }: PayPalPaymentModalProps) {
    const [error, setError] = useState<string | null>(null);

    const initialOptions = {
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test", // Fallback to "test" but needs real key
        currency: "USD",
        intent: "capture",
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
                    <div className="text-center mb-8">
                        <h3 className="text-xl font-bold text-white mb-2">PayPal Checkout</h3>
                        <p className="text-gray-400 text-sm">
                            Complete your payment of <span className="text-white font-bold">${amount.toFixed(2)}</span>
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="min-h-[150px] relative z-0">
                        {/* PayPal Provider Wrapper */}
                        <PayPalScriptProvider options={initialOptions}>
                            <PayPalButtons
                                style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
                                createOrder={async () => {
                                    try {
                                        setError(null);
                                        const res = await fetch("/api/v1/payments/paypal/create-order", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                amount: amount,
                                                roomId: roomId,
                                            }),
                                        });

                                        const order = await res.json();
                                        if (order.id) {
                                            return order.id;
                                        } else {
                                            throw new Error(order.error || "Failed to create order");
                                        }
                                    } catch (err: any) {
                                        setError(err.message);
                                        throw err;
                                    }
                                }}
                                onApprove={async (data) => {
                                    try {
                                        const res = await fetch("/api/v1/payments/paypal/capture-order", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                orderID: data.orderID,
                                            }),
                                        });

                                        const details = await res.json();

                                        if (details.success) {
                                            onSuccess();
                                        } else {
                                            setError("Payment failed: " + details.status);
                                        }
                                    } catch (err: any) {
                                        setError("Capture failed: " + err.message);
                                    }
                                }}
                                onError={(err: any) => {
                                    console.error("PayPal Error:", err);
                                    setError("An unexpected error occurred with PayPal.");
                                }}
                            />
                        </PayPalScriptProvider>
                    </div>
                </div>
            </div>
        </div>
    );
}
