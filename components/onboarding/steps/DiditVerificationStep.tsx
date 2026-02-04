"use client";

import React, { useState } from "react";
import { ShieldCheck, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
    onComplete: () => void;
    rejectionReason?: string;
}

export default function DiditVerificationStep({ onComplete, rejectionReason }: Props) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const startVerification = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/didit/session", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to start verification");
            }

            const data = await response.json();

            if (data.url) {
                // Redirect user to Didit
                window.location.href = data.url;
            } else {
                toast.error("Could not retrieve verification URL");
                setLoading(false);
            }
        } catch (error) {
            console.error("Verification error:", error);
            toast.error("Failed to start verification process");
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Rejection Alert */}
            {rejectionReason && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">Verification Not Approved</span>
                    </div>
                    <p className="text-gray-300 text-sm">{rejectionReason}</p>
                    <p className="text-gray-400 text-xs mt-2">
                        Please try again. ensure your documents are clear.
                    </p>
                </div>
            )}

            {/* Step Title */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm mb-4">
                    <ShieldCheck className="w-4 h-4" />
                    Step 3 of 3
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Identity Verification</h2>
                <p className="text-gray-400 max-w-md mx-auto">
                    We partner with Didit to securely verify your identity. This process is fast, secure, and automated.
                </p>
            </div>

            <div className="max-w-md mx-auto">
                <div className="bg-black/40 border border-white/10 rounded-2xl p-8 text-center">
                    <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-10 h-10 text-pink-500" />
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-2">Ready to verify?</h3>
                    <p className="text-gray-400 text-sm mb-8">
                        You will be redirected to a secure verification page. Please have your ID document ready (Passport, ID Card, or Driving License).
                    </p>

                    <button
                        onClick={startVerification}
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg hover:shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Preparing...
                            </>
                        ) : (
                            <>
                                Start Verification
                                <ExternalLink className="w-4 h-4" />
                            </>
                        )}
                    </button>

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Secure 256-bit encryption</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
