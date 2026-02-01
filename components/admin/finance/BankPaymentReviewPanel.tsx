"use client";

import React, { useState, useEffect } from "react";
import { Landmark, Check, X, Clock, Eye, ExternalLink, User, DollarSign, Calendar, FileText } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

interface BankSubmission {
    id: string;
    user_id: string;
    amount: number;
    payment_for: string;
    plan_id: string | null;
    plan_name: string;
    receipt_url: string;
    status: "pending" | "approved" | "rejected";
    admin_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    profiles?: {
        full_name: string | null;
        avatar_url: string | null;
    };
}

export default function BankPaymentReviewPanel() {
    const supabase = createClient();
    const { user } = useAuth();

    const [submissions, setSubmissions] = useState<BankSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
    const [selectedSubmission, setSelectedSubmission] = useState<BankSubmission | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchSubmissions();
    }, [filter]);

    const fetchSubmissions = async () => {
        setLoading(true);

        let query = supabase
            .from("bank_payment_submissions")
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    avatar_url
                )
            `)
            .order("created_at", { ascending: false });

        if (filter !== "all") {
            query = query.eq("status", filter);
        }

        const { data, error } = await query;

        if (error) {
            toast.error("Failed to load submissions");
            console.error(error);
        } else {
            setSubmissions(data || []);
        }
        setLoading(false);
    };

    const openReviewModal = (submission: BankSubmission) => {
        setSelectedSubmission(submission);
        setRejectionReason("");
        setShowReviewModal(true);
    };

    const closeModal = () => {
        setShowReviewModal(false);
        setSelectedSubmission(null);
        setRejectionReason("");
    };

    const handleApprove = async () => {
        if (!selectedSubmission || !user) return;
        setProcessing(true);

        try {
            // Update the submission status
            const { error: submissionError } = await supabase
                .from("bank_payment_submissions")
                .update({
                    status: "approved",
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", selectedSubmission.id);

            if (submissionError) throw submissionError;

            // Update the user's profile
            const updateData: Record<string, unknown> = {
                bank_payment_pending: false,
                updated_at: new Date().toISOString(),
            };

            // If it's an account type payment, activate the account type
            if (selectedSubmission.payment_for === "account_type" && selectedSubmission.plan_id) {
                updateData.account_type_id = selectedSubmission.plan_id;
                updateData.pending_account_type_id = null;
                updateData.account_type_skipped = false;
            }

            await supabase
                .from("profiles")
                .update(updateData)
                .eq("id", selectedSubmission.user_id);

            toast.success("Payment approved!");
            closeModal();
            await fetchSubmissions();
        } catch (error) {
            console.error("Error approving payment:", error);
            toast.error("Failed to approve payment");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedSubmission || !user) return;
        if (!rejectionReason.trim()) {
            toast.error("Please provide a rejection reason");
            return;
        }
        setProcessing(true);

        try {
            // Update the submission status
            const { error: submissionError } = await supabase
                .from("bank_payment_submissions")
                .update({
                    status: "rejected",
                    admin_notes: rejectionReason,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", selectedSubmission.id);

            if (submissionError) throw submissionError;

            // Update the user's profile - clear pending flag so they can try again
            await supabase
                .from("profiles")
                .update({
                    bank_payment_pending: false,
                    pending_account_type_id: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", selectedSubmission.user_id);

            toast.success("Payment rejected");
            closeModal();
            await fetchSubmissions();
        } catch (error) {
            console.error("Error rejecting payment:", error);
            toast.error("Failed to reject payment");
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Approved
                    </span>
                );
            case "rejected":
                return (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 flex items-center gap-1">
                        <X className="w-3 h-3" /> Rejected
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                    </span>
                );
        }
    };

    const pendingCount = submissions.filter(s => s.status === "pending").length;

    return (
        <>
            <NeonCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <AdminSectionTitle
                        icon={<Landmark className="w-4 h-4" />}
                        title="Bank Payment Reviews"
                        sub="Review and approve bank transfer payment receipts"
                    />
                    {pendingCount > 0 && (
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-bold">
                            {pendingCount} Pending
                        </span>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4">
                    {(["pending", "approved", "rejected", "all"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filter === f
                                ? "bg-pink-500/20 text-pink-400 border border-pink-500/40"
                                : "bg-black/40 text-gray-400 border border-white/10 hover:border-white/20"
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Submissions List */}
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading...</div>
                ) : submissions.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        No {filter !== "all" ? filter : ""} submissions found
                    </div>
                ) : (
                    <div className="space-y-3">
                        {submissions.map((submission) => (
                            <div
                                key={submission.id}
                                className="bg-black/40 border border-white/10 rounded-xl p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                            {submission.profiles?.full_name?.[0] || "U"}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">
                                                {submission.profiles?.full_name || "Unknown User"}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                {submission.plan_name} • ${submission.amount}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(submission.status)}
                                        <NeonButton
                                            variant="ghost"
                                            className="flex items-center gap-1"
                                            onClick={() => openReviewModal(submission)}
                                        >
                                            <Eye className="w-4 h-4" />
                                            Review
                                        </NeonButton>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(submission.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {submission.payment_for}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </NeonCard>

            {/* Review Modal */}
            {showReviewModal && selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-gray-900 border border-pink-500/20 rounded-2xl p-6 w-full max-w-lg my-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Review Payment</h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                {selectedSubmission.profiles?.full_name?.[0] || "U"}
                            </div>
                            <div>
                                <p className="text-white font-medium">
                                    {selectedSubmission.profiles?.full_name || "Unknown"}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    ID: {selectedSubmission.user_id.slice(0, 8)}...
                                </p>
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Plan</span>
                                    <span className="text-white">{selectedSubmission.plan_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Amount</span>
                                    <span className="text-green-400 font-bold">${selectedSubmission.amount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Type</span>
                                    <span className="text-white">{selectedSubmission.payment_for}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Submitted</span>
                                    <span className="text-white">
                                        {new Date(selectedSubmission.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status</span>
                                    {getStatusBadge(selectedSubmission.status)}
                                </div>
                            </div>
                        </div>

                        {/* Receipt Image */}
                        <div className="mb-4">
                            <label className="text-sm text-gray-400 block mb-2">Payment Receipt</label>
                            <div className="relative rounded-xl overflow-hidden border border-white/10">
                                <img
                                    src={selectedSubmission.receipt_url}
                                    alt="Payment receipt"
                                    className="w-full max-h-64 object-contain bg-black"
                                />
                                <a
                                    href={selectedSubmission.receipt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-2 right-2 p-2 bg-black/60 rounded-lg text-white hover:bg-black/80 transition"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        {/* Action Buttons (only for pending) */}
                        {selectedSubmission.status === "pending" && (
                            <>
                                {/* Rejection Reason */}
                                <div className="mb-4">
                                    <label className="text-sm text-gray-400 block mb-2">
                                        Rejection Reason (required for rejection)
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="e.g. Receipt amount doesn't match, blurry image, etc."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm resize-none"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <NeonButton
                                        variant="ghost"
                                        className="flex-1 !border-red-500/40 !text-red-400 hover:!bg-red-500/10"
                                        onClick={handleReject}
                                        disabled={processing}
                                    >
                                        <X className="w-4 h-4 mr-1" />
                                        Reject
                                    </NeonButton>
                                    <NeonButton
                                        variant="pink"
                                        className="flex-1 !bg-green-500 hover:!bg-green-600"
                                        onClick={handleApprove}
                                        disabled={processing}
                                    >
                                        {processing ? (
                                            "Processing..."
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-1" />
                                                Approve
                                            </>
                                        )}
                                    </NeonButton>
                                </div>
                            </>
                        )}

                        {/* Admin Notes (for reviewed submissions) */}
                        {selectedSubmission.status !== "pending" && selectedSubmission.admin_notes && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                <p className="text-red-400 text-sm">
                                    <strong>Rejection Reason:</strong> {selectedSubmission.admin_notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
