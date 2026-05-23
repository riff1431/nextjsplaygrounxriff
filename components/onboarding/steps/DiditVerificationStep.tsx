"use client";

import React, { useState, useRef } from "react";
import { ShieldCheck, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { createClient } from "@/utils/supabase/client";

interface Props {
    onComplete: () => void;
    rejectionReason?: string;
}

export default function DiditVerificationStep({ onComplete, rejectionReason }: Props) {
    const [loading, setLoading] = useState(false);
    const [verificationStarted, setVerificationStarted] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        const checkStatusAndSubscribe = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check current status immediately
            const { data: profile } = await supabase
                .from('profiles')
                .select('kyc_status')
                .eq('id', user.id)
                .single();

            if (profile?.kyc_status === 'approved') {
                toast.success("Already verified!");
                onComplete();
                return;
            }

            // Subscribe to realtime changes
            const channel = supabase
                .channel('kyc-status-updates')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`
                    },
                    (payload) => {
                        const newStatus = payload.new.kyc_status;
                        if (newStatus === 'approved') {
                            toast.success("Verification approved!");
                            onComplete();
                        } else if (newStatus === 'rejected') {
                            toast.error("Verification rejected. Please try again.");
                            window.location.reload();
                        }
                    }
                )
                .subscribe();

            // Polling fallback — check every 5 seconds in case realtime misses an event
            pollRef.current = setInterval(async () => {
                const { data: polledProfile } = await supabase
                    .from('profiles')
                    .select('kyc_status')
                    .eq('id', user.id)
                    .single();

                if (polledProfile?.kyc_status === 'approved') {
                    toast.success("Verification approved!");
                    onComplete();
                    if (pollRef.current) clearInterval(pollRef.current);
                } else if (polledProfile?.kyc_status === 'rejected') {
                    toast.error("Verification rejected. Please try again.");
                    if (pollRef.current) clearInterval(pollRef.current);
                    window.location.reload();
                }
            }, 5000);

            return () => {
                supabase.removeChannel(channel);
                if (pollRef.current) clearInterval(pollRef.current);
            };
        };

        checkStatusAndSubscribe();

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [supabase, onComplete]);

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
                // Open Didit in a new tab so we keep the realtime subscription alive
                window.open(data.url, '_blank');
                setLoading(false);
                setVerificationStarted(true);
                toast.info("Verification opened in a new tab. Complete it there and this page will update automatically.");
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

                    {verificationStarted ? (
                        <>
                            <h3 className="text-xl font-semibold text-white mb-2">Verification in progress...</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Complete the verification in the new tab. This page will update automatically once approved.
                            </p>
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <div className="w-5 h-5 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                                <span className="text-gray-300 text-sm">Waiting for verification result...</span>
                            </div>
                            <button
                                onClick={startVerification}
                                className="w-full py-3 rounded-xl font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                Reopen Verification Tab
                                <ExternalLink className="w-3 h-3" />
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 className="text-xl font-semibold text-white mb-2">Ready to verify?</h3>
                            <p className="text-gray-400 text-sm mb-8">
                                You will be redirected to a secure verification page. Please have your ID document ready (Passport, ID Card, or Driving License).
                            </p>

                            <button
                                onClick={startVerification}
                                disabled={loading}
                                className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg hover:shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
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
                        </>
                    )}

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 rounded-xl font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                        Check verification status
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
