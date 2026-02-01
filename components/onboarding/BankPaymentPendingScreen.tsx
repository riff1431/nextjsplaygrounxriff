"use client";

import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, RefreshCw, LogOut, Home } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BankSubmission {
    id: string;
    amount: number;
    plan_name: string;
    payment_for: string;
    status: "pending" | "approved" | "rejected";
    admin_notes: string | null;
    created_at: string;
}

export default function BankPaymentPendingScreen() {
    const supabase = createClient();
    const { user, logout } = useAuth();
    const router = useRouter();

    const [submission, setSubmission] = useState<BankSubmission | null>(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (user) {
            fetchLatestSubmission();
            setupRealtimeListener();
        }
    }, [user]);

    const fetchLatestSubmission = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from("bank_payment_submissions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (data) {
            setSubmission(data);

            // If approved, handle accordingly
            if (data.status === "approved") {
                handleApproved(data);
            }
        }
        setLoading(false);
    };

    const setupRealtimeListener = () => {
        if (!user) return;

        const channel = supabase
            .channel("bank-payment-status")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "bank_payment_submissions",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const updated = payload.new as BankSubmission;
                    setSubmission(updated);

                    if (updated.status === "approved") {
                        toast.success("Payment approved! 🎉");
                        handleApproved(updated);
                    } else if (updated.status === "rejected") {
                        toast.error("Payment was rejected. Please contact support.");
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleApproved = async (data: BankSubmission) => {
        // Clear the pending flag and apply the account type
        if (!user) return;

        const { data: profile } = await supabase
            .from("profiles")
            .select("pending_account_type_id, role")
            .eq("id", user.id)
            .single();

        if (profile) {
            // Update profile
            await supabase
                .from("profiles")
                .update({
                    bank_payment_pending: false,
                    account_type_id: profile.pending_account_type_id,
                    pending_account_type_id: null,
                    account_type_skipped: false,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

            // Redirect after short delay
            setTimeout(() => {
                router.push("/onboarding");
            }, 2000);
        }
    };

    const checkStatus = async () => {
        setChecking(true);
        await fetchLatestSubmission();
        setChecking(false);
        toast.success("Status checked!");
    };

    const handleLogout = async () => {
        await logout();
        router.push("/auth");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
            </div>
        );
    }

    const getStatusIcon = () => {
        switch (submission?.status) {
            case "approved":
                return <CheckCircle2 className="w-16 h-16 text-green-500" />;
            case "rejected":
                return <XCircle className="w-16 h-16 text-red-500" />;
            default:
                return <Clock className="w-16 h-16 text-amber-500" />;
        }
    };

    const getStatusColor = () => {
        switch (submission?.status) {
            case "approved":
                return "green";
            case "rejected":
                return "red";
            default:
                return "amber";
        }
    };

    const getStatusText = () => {
        switch (submission?.status) {
            case "approved":
                return "Payment Approved!";
            case "rejected":
                return "Payment Rejected";
            default:
                return "Payment Under Review";
        }
    };

    const getStatusDescription = () => {
        switch (submission?.status) {
            case "approved":
                return "Your payment has been verified. Redirecting you now...";
            case "rejected":
                return submission?.admin_notes || "Your payment could not be verified. Please contact support or try again.";
            default:
                return "Our team is reviewing your payment receipt. This usually takes a few hours.";
        }
    };

    return (
        <div className="min-h-screen bg-black">
            {/* Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-amber-900/20 via-black to-orange-900/20 pointer-events-none" />

            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    {/* Status Icon */}
                    <div className={`w-24 h-24 rounded-full bg-${getStatusColor()}-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse`}
                        style={{ backgroundColor: `rgba(${submission?.status === "approved" ? "34, 197, 94" : submission?.status === "rejected" ? "239, 68, 68" : "245, 158, 11"}, 0.2)` }}
                    >
                        {getStatusIcon()}
                    </div>

                    {/* Status Title */}
                    <h1 className="text-3xl font-bold text-white mb-3">
                        {getStatusText()}
                    </h1>

                    {/* Status Description */}
                    <p className="text-gray-400 mb-6">
                        {getStatusDescription()}
                    </p>

                    {/* Submission Details */}
                    {submission && submission.status === "pending" && (
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mb-6 text-left">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Plan</span>
                                    <span className="text-white font-medium">{submission.plan_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Amount</span>
                                    <span className="text-white font-medium">${submission.amount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Submitted</span>
                                    <span className="text-white">
                                        {new Date(submission.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
                                        Pending Review
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {submission?.status === "pending" && (
                        <button
                            onClick={checkStatus}
                            disabled={checking}
                            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold mb-3 flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-all"
                        >
                            {checking ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Check Status
                                </>
                            )}
                        </button>
                    )}

                    {submission?.status === "rejected" && (
                        <button
                            onClick={() => router.push("/onboarding")}
                            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold mb-3 hover:from-pink-600 hover:to-purple-600 transition-all"
                        >
                            Try Again
                        </button>
                    )}

                    {submission?.status === "approved" && (
                        <button
                            onClick={() => router.push("/home")}
                            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold mb-3 flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-600 transition-all"
                        >
                            <Home className="w-5 h-5" />
                            Go to Home
                        </button>
                    )}

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-gray-300 text-sm flex items-center gap-2 mx-auto transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign out
                    </button>

                    {/* Help Text */}
                    <p className="text-gray-600 text-xs mt-8">
                        Need help? Contact support@playgroundx.com
                    </p>
                </div>
            </div>
        </div>
    );
}
