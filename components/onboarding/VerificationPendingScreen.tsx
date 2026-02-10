"use client";

import React, { useEffect, useState } from "react";
import { Clock, CheckCircle, XCircle, RefreshCw, Home } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
    onStatusChange: () => void;
}

export default function VerificationPendingScreen({ onStatusChange }: Props) {
    const supabase = createClient();
    const { user } = useAuth();
    const router = useRouter();
    const [checking, setChecking] = useState(false);
    const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);

    useEffect(() => {
        // Check initial status and set up real-time subscription
        if (!user) return;

        // Check current status on mount
        const checkInitialStatus = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("kyc_status")
                .eq("id", user.id)
                .single();

            if (data?.kyc_status === "approved") {
                setStatus("approved");
            } else if (data?.kyc_status === "rejected") {
                setStatus("rejected");
                fetchRejectionReason();
            }
        };

        checkInitialStatus();

        // Set up real-time subscription for status changes
        const channel = supabase
            .channel("kyc-status")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "profiles",
                    filter: `id=eq.${user.id}`,
                },
                (payload) => {
                    const newStatus = payload.new.kyc_status;
                    if (newStatus === "approved") {
                        setStatus("approved");
                        toast.success("🎉 Your verification has been approved!");
                    } else if (newStatus === "rejected") {
                        setStatus("rejected");
                        toast.error("Verification was not approved. Please check the reason.");
                        fetchRejectionReason();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchRejectionReason = async () => {
        if (!user) return;

        const { data } = await supabase
            .from("kyc_submissions")
            .select("rejection_reason")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (data?.rejection_reason) {
            setRejectionReason(data.rejection_reason);
        }
    };

    const checkStatus = async () => {
        setChecking(true);
        if (!user) {
            setChecking(false);
            return;
        }

        const { data } = await supabase
            .from("profiles")
            .select("kyc_status")
            .eq("id", user.id)
            .single();

        if (data?.kyc_status === "approved") {
            setStatus("approved");
            setTimeout(() => {
                router.push("/creator/dashboard");
            }, 1500);
        } else if (data?.kyc_status === "rejected") {
            setStatus("rejected");
            await fetchRejectionReason();
        }
        setChecking(false);
    };

    const handleResubmit = () => {
        onStatusChange();
    };

    if (status === "approved") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="text-center animate-in fade-in zoom-in duration-500 max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Verification Approved!</h1>
                    <p className="text-gray-400 mb-8">
                        Welcome to the creator community! You now have full access to all creator features.
                    </p>

                    <button
                        onClick={() => router.push("/home")}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/25"
                    >
                        <Home className="w-5 h-5" />
                        Go to Home
                    </button>

                    <button
                        onClick={() => router.push("/creator/dashboard")}
                        className="mt-3 w-full py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl font-medium hover:bg-white/10 transition-all"
                    >
                        Go to Creator Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (status === "rejected") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                        <XCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Verification Not Approved</h1>
                    <p className="text-gray-400 mb-4">
                        Unfortunately, we couldn't verify your identity with the provided documents.
                    </p>

                    {rejectionReason && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-left">
                            <div className="text-red-400 text-sm font-medium mb-1">Reason:</div>
                            <p className="text-gray-300 text-sm">{rejectionReason}</p>
                        </div>
                    )}

                    <button
                        onClick={handleResubmit}
                        className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg shadow-pink-500/25"
                    >
                        Resubmit Documents
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            {/* Background gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20 pointer-events-none" />

            <div className="relative z-10 text-center max-w-lg">
                {/* Animated clock */}
                <div className="relative w-32 h-32 mx-auto mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full opacity-20 animate-pulse" />
                    <div className="absolute inset-2 bg-black rounded-full flex items-center justify-center">
                        <Clock className="w-12 h-12 text-pink-400 animate-[spin_4s_linear_infinite]" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-white mb-4">Verification In Progress</h1>

                <p className="text-gray-400 mb-6">
                    Thank you for submitting your documents! Our team is reviewing your verification
                    request. This usually takes less than 24 hours.
                </p>

                {/* Status card */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="relative">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                            <div className="absolute inset-0 w-3 h-3 bg-yellow-500 rounded-full animate-ping" />
                        </div>
                        <span className="text-yellow-400 font-medium">Pending Review</span>
                    </div>

                    <div className="text-gray-500 text-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <span>Document Received</span>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Selfie Received</span>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Admin Review</span>
                            <Clock className="w-4 h-4 text-yellow-500" />
                        </div>
                    </div>
                </div>

                {/* What happens next */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6 text-left">
                    <h3 className="text-blue-300 font-medium mb-2">What happens next?</h3>
                    <ul className="text-gray-400 text-sm space-y-1">
                        <li>• You'll receive a notification once reviewed</li>
                        <li>• If approved, you'll get full creator access</li>
                        <li>• If rejected, you can resubmit with new documents</li>
                    </ul>
                </div>

                {/* Check status button */}
                <button
                    onClick={checkStatus}
                    disabled={checking}
                    className="flex items-center gap-2 mx-auto px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
                    {checking ? "Checking..." : "Check Status"}
                </button>

                <p className="text-gray-600 text-xs mt-6">
                    You can safely close this page. We'll notify you when there's an update.
                </p>
            </div>
        </div>
    );
}
