"use client";

import React, { useState, useEffect } from "react";
import {
    ShieldCheck,
    Eye,
    Check,
    X,
    Clock,
    FileText,
    User,
    Search,
    Filter,
    ExternalLink,
    AlertTriangle,
} from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface KYCSubmission {
    id: string;
    user_id: string;
    id_type: string;
    id_type_other: string | null;
    document_url: string;
    selfie_url: string;
    status: "pending" | "approved" | "rejected";
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
    user?: {
        username: string;
        full_name: string;
        avatar_url: string;
        email?: string;
    };
}

const ID_TYPE_LABELS: Record<string, string> = {
    nid: "National ID",
    passport: "Passport",
    driving_license: "Driving License",
    others: "Other Document",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: {
        bg: "bg-yellow-500/20",
        text: "text-yellow-400",
        icon: <Clock className="w-3 h-3" />,
    },
    approved: {
        bg: "bg-green-500/20",
        text: "text-green-400",
        icon: <Check className="w-3 h-3" />,
    },
    rejected: {
        bg: "bg-red-500/20",
        text: "text-red-400",
        icon: <X className="w-3 h-3" />,
    },
};

export default function KYCReviewPanel() {
    const supabase = createClient();
    const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("pending");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchSubmissions();
    }, [filterStatus]);

    const fetchSubmissions = async () => {
        setLoading(true);
        let query = supabase
            .from("kyc_submissions")
            .select(`
                *,
                user:profiles!kyc_submissions_user_id_fkey(username, full_name, avatar_url)
            `)
            .order("created_at", { ascending: false });

        if (filterStatus !== "all") {
            query = query.eq("status", filterStatus);
        }

        const { data, error } = await query;

        if (error) {
            toast.error("Failed to load KYC submissions");
            console.error(error);
        } else {
            setSubmissions(data || []);
        }
        setLoading(false);
    };

    const openDetailModal = (submission: KYCSubmission) => {
        setSelectedSubmission(submission);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedSubmission(null);
    };

    const handleApprove = async (submission: KYCSubmission) => {
        setProcessing(true);
        const { data: { user } } = await supabase.auth.getUser();

        const { error: kycError } = await supabase
            .from("kyc_submissions")
            .update({
                status: "approved",
                reviewed_by: user?.id,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", submission.id);

        if (kycError) {
            toast.error("Failed to approve KYC");
            console.error(kycError);
            setProcessing(false);
            return;
        }

        // Update the user's profile using RPC to bypass RLS
        const { error: profileError } = await supabase.rpc('update_kyc_status', {
            target_user_id: submission.user_id,
            new_status: 'approved'
        });

        if (profileError) {
            toast.error("Failed to update profile status");
            console.error(profileError);
        } else {
            // Send notification to user
            await supabase.from("notifications").insert({
                user_id: submission.user_id,
                type: "kyc_approved",
                message: "🎉 Your KYC verification has been approved! You now have full access to creator features.",
            });

            toast.success("KYC approved successfully");
            closeDetailModal();
            await fetchSubmissions();
        }
        setProcessing(false);
    };

    const openRejectModal = (submission: KYCSubmission) => {
        setSelectedSubmission(submission);
        setRejectionReason("");
        setShowRejectModal(true);
    };

    const closeRejectModal = () => {
        setShowRejectModal(false);
        setRejectionReason("");
    };

    const handleReject = async () => {
        if (!selectedSubmission || !rejectionReason.trim()) {
            toast.error("Please provide a rejection reason");
            return;
        }

        setProcessing(true);
        const { data: { user } } = await supabase.auth.getUser();

        const { error: kycError } = await supabase
            .from("kyc_submissions")
            .update({
                status: "rejected",
                rejection_reason: rejectionReason,
                reviewed_by: user?.id,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", selectedSubmission.id);

        if (kycError) {
            toast.error("Failed to reject KYC");
            console.error(kycError);
            setProcessing(false);
            return;
        }

        // Update the user's profile using RPC to bypass RLS
        const { error: profileError } = await supabase.rpc('update_kyc_status', {
            target_user_id: selectedSubmission.user_id,
            new_status: 'rejected',
            rejection_reason: rejectionReason
        });

        if (profileError) {
            toast.error("Failed to update profile status");
            console.error(profileError);
        } else {
            // Send notification to user
            await supabase.from("notifications").insert({
                user_id: selectedSubmission.user_id,
                type: "kyc_rejected",
                message: `Your KYC verification was not approved. Reason: ${rejectionReason}. Please resubmit your documents.`,
            });

            toast.success("KYC rejected");
            closeRejectModal();
            closeDetailModal();
            await fetchSubmissions();
        }
        setProcessing(false);
    };

    const filteredSubmissions = submissions.filter((s) => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            s.user?.username?.toLowerCase().includes(search) ||
            s.user?.full_name?.toLowerCase().includes(search) ||
            s.id_type.toLowerCase().includes(search)
        );
    });

    const getSignedUrl = async (path: string) => {
        const { data } = await supabase.storage
            .from("kyc-documents")
            .createSignedUrl(path, 60 * 5); // 5 minutes
        return data?.signedUrl || path;
    };

    const columns = [
        { key: "user", label: "USER", w: "1.5fr" },
        { key: "id_type", label: "DOCUMENT TYPE", w: "1fr" },
        { key: "submitted", label: "SUBMITTED", w: "1fr" },
        { key: "status", label: "STATUS", w: "0.8fr" },
        { key: "actions", label: "ACTIONS", w: "1fr", right: true },
    ];

    const rows = filteredSubmissions.map((s) => ({
        user: (
            <div className="flex items-center gap-2">
                {s.user?.avatar_url ? (
                    <img
                        src={s.user.avatar_url}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs">
                        {s.user?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                )}
                <div>
                    <div className="text-sm font-medium">{s.user?.full_name || "Unknown"}</div>
                    <div className="text-[10px] text-gray-500">@{s.user?.username || "unknown"}</div>
                </div>
            </div>
        ),
        id_type: (
            <div className="flex items-center gap-2">
                <FileText className="w-3 h-3 text-gray-400" />
                <span>{ID_TYPE_LABELS[s.id_type] || s.id_type}</span>
                {s.id_type === "others" && s.id_type_other && (
                    <span className="text-gray-500">({s.id_type_other})</span>
                )}
            </div>
        ),
        submitted: (
            <span className="text-gray-400">
                {new Date(s.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })}
            </span>
        ),
        status: (
            <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${STATUS_STYLES[s.status].bg} ${STATUS_STYLES[s.status].text}`}
            >
                {STATUS_STYLES[s.status].icon}
                {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
            </div>
        ),
        actions: (
            <div className="flex items-center justify-end gap-2">
                <NeonButton
                    variant="ghost"
                    className="!px-2 !py-1"
                    onClick={() => openDetailModal(s)}
                    title="View Details"
                >
                    <Eye className="w-3 h-3" />
                </NeonButton>
                {s.status === "pending" && (
                    <>
                        <NeonButton
                            variant="ghost"
                            className="!px-2 !py-1 !border-green-500/30 hover:!bg-green-500/10"
                            onClick={() => handleApprove(s)}
                            title="Approve"
                            disabled={processing}
                        >
                            <Check className="w-3 h-3 text-green-400" />
                        </NeonButton>
                        <NeonButton
                            variant="ghost"
                            className="!px-2 !py-1 !border-red-500/30 hover:!bg-red-500/10"
                            onClick={() => openRejectModal(s)}
                            title="Reject"
                            disabled={processing}
                        >
                            <X className="w-3 h-3 text-red-400" />
                        </NeonButton>
                    </>
                )}
            </div>
        ),
    }));

    return (
        <>
            <NeonCard className="p-5">
                <AdminSectionTitle
                    icon={<ShieldCheck className="w-4 h-4" />}
                    title="KYC Verification Review"
                    sub="Review and manage creator identity verification submissions"
                />

                {/* Filters */}
                <div className="mt-4 flex flex-wrap gap-3">
                    {/* Status Filter */}
                    <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1">
                        {["pending", "approved", "rejected", "all"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 text-xs rounded-lg transition ${filterStatus === status
                                    ? "bg-pink-600 text-white"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by username or name..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-4 flex gap-4 text-xs">
                    <div className="text-gray-400">
                        Total: <span className="text-white font-medium">{submissions.length}</span>
                    </div>
                    <div className="text-yellow-400">
                        Pending:{" "}
                        <span className="font-medium">
                            {submissions.filter((s) => s.status === "pending").length}
                        </span>
                    </div>
                </div>

                {/* Table */}
                <div className="mt-4">
                    {loading ? (
                        <div className="text-center text-gray-500 py-10">Loading submissions...</div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            No {filterStatus !== "all" ? filterStatus : ""} submissions found
                        </div>
                    ) : (
                        <AdminTable columns={columns} rows={rows} />
                    )}
                </div>
            </NeonCard>

            {/* Detail Modal */}
            {showDetailModal && selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-cyan-500/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                                KYC Submission Details
                            </h2>
                            <button
                                onClick={closeDetailModal}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl mb-4">
                            {selectedSubmission.user?.avatar_url ? (
                                <img
                                    src={selectedSubmission.user.avatar_url}
                                    alt=""
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xl">
                                    {selectedSubmission.user?.username?.[0]?.toUpperCase() || "?"}
                                </div>
                            )}
                            <div>
                                <div className="text-white font-medium">
                                    {selectedSubmission.user?.full_name || "Unknown User"}
                                </div>
                                <div className="text-gray-400 text-sm">
                                    @{selectedSubmission.user?.username || "unknown"}
                                </div>
                            </div>
                            <div
                                className={`ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${STATUS_STYLES[selectedSubmission.status].bg
                                    } ${STATUS_STYLES[selectedSubmission.status].text}`}
                            >
                                {STATUS_STYLES[selectedSubmission.status].icon}
                                {selectedSubmission.status.charAt(0).toUpperCase() +
                                    selectedSubmission.status.slice(1)}
                            </div>
                        </div>

                        {/* Document Info */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-4 bg-black/40 rounded-xl">
                                <div className="text-xs text-gray-400 mb-1">Document Type</div>
                                <div className="text-white">
                                    {ID_TYPE_LABELS[selectedSubmission.id_type] ||
                                        selectedSubmission.id_type}
                                    {selectedSubmission.id_type === "others" &&
                                        selectedSubmission.id_type_other && (
                                            <span className="text-gray-400">
                                                {" "}
                                                ({selectedSubmission.id_type_other})
                                            </span>
                                        )}
                                </div>
                            </div>
                            <div className="p-4 bg-black/40 rounded-xl">
                                <div className="text-xs text-gray-400 mb-1">Submitted</div>
                                <div className="text-white">
                                    {new Date(selectedSubmission.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-4 bg-black/40 rounded-xl">
                                <div className="text-xs text-gray-400 mb-2">ID Document</div>
                                <div className="aspect-video bg-black/60 rounded-lg overflow-hidden relative group">
                                    <img
                                        src={selectedSubmission.document_url}
                                        alt="ID Document"
                                        className="w-full h-full object-contain"
                                    />
                                    <a
                                        href={selectedSubmission.document_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <ExternalLink className="w-3 h-3 text-white" />
                                    </a>
                                </div>
                            </div>
                            <div className="p-4 bg-black/40 rounded-xl">
                                <div className="text-xs text-gray-400 mb-2">Selfie Photo</div>
                                <div className="aspect-video bg-black/60 rounded-lg overflow-hidden relative group">
                                    <img
                                        src={selectedSubmission.selfie_url}
                                        alt="Selfie"
                                        className="w-full h-full object-contain"
                                    />
                                    <a
                                        href={selectedSubmission.selfie_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <ExternalLink className="w-3 h-3 text-white" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Rejection Reason (if rejected) */}
                        {selectedSubmission.status === "rejected" &&
                            selectedSubmission.rejection_reason && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                                    <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        Rejection Reason
                                    </div>
                                    <p className="text-gray-300 text-sm">
                                        {selectedSubmission.rejection_reason}
                                    </p>
                                </div>
                            )}

                        {/* Action Buttons */}
                        {selectedSubmission.status === "pending" && (
                            <div className="flex gap-3">
                                <NeonButton
                                    variant="ghost"
                                    className="flex-1 !border-red-500/30 hover:!bg-red-500/10"
                                    onClick={() => openRejectModal(selectedSubmission)}
                                    disabled={processing}
                                >
                                    <X className="w-4 h-4 text-red-400 mr-2" />
                                    Reject
                                </NeonButton>
                                <NeonButton
                                    variant="blue"
                                    className="flex-1"
                                    onClick={() => handleApprove(selectedSubmission)}
                                    disabled={processing}
                                >
                                    {processing ? (
                                        "Processing..."
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Approve
                                        </>
                                    )}
                                </NeonButton>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedSubmission && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                Reject KYC Submission
                            </h3>
                            <button
                                onClick={closeRejectModal}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <p className="text-gray-400 text-sm mb-4">
                            Please provide a reason for rejecting this KYC submission. This will be
                            shown to the user.
                        </p>

                        <textarea
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none"
                            rows={4}
                            placeholder="e.g., Document image is blurry, ID has expired, Selfie doesn't match document..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />

                        <div className="flex gap-3 mt-4">
                            <NeonButton variant="ghost" className="flex-1" onClick={closeRejectModal}>
                                Cancel
                            </NeonButton>
                            <NeonButton
                                variant="ghost"
                                className="flex-1 !border-red-500/30 hover:!bg-red-500/10"
                                onClick={handleReject}
                                disabled={processing || !rejectionReason.trim()}
                            >
                                {processing ? "Rejecting..." : "Confirm Rejection"}
                            </NeonButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
