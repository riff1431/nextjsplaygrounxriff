"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    ShieldCheck,
    Clock,
    XCircle,
    Upload,
    Camera,
    FileText,
    IdCard,
    Globe,
    Car,
    AlertTriangle,
    RefreshCw,
    X,
    ChevronDown,
    ChevronUp,
    CheckCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
    kycStatus: string;
    onStatusChange?: () => void;
}

const ID_TYPES = [
    { value: "nid", label: "National ID (NID)", icon: IdCard },
    { value: "passport", label: "Passport", icon: Globe },
    { value: "driving_license", label: "Driving License", icon: Car },
    { value: "others", label: "Other Document", icon: FileText },
];

export default function CsKycVerificationBanner({ kycStatus, onStatusChange }: Props) {
    const supabase = createClient();
    const { user } = useAuth();
    const router = useRouter();

    // Banner state
    const [checking, setChecking] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);

    // Upload form state
    const [idType, setIdType] = useState("");
    const [idTypeOther, setIdTypeOther] = useState("");
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [documentPreview, setDocumentPreview] = useState<string | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [selfieWithIdFile, setSelfieWithIdFile] = useState<File | null>(null);
    const [selfieWithIdPreview, setSelfieWithIdPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const documentInputRef = useRef<HTMLInputElement>(null);
    const selfieInputRef = useRef<HTMLInputElement>(null);
    const selfieWithIdInputRef = useRef<HTMLInputElement>(null);

    // Fetch rejection reason on mount if rejected
    useEffect(() => {
        if (kycStatus === "rejected" && user) {
            fetchRejectionReason();
        }
    }, [kycStatus, user]);

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
        try {
            const response = await fetch("/api/didit/session/status");
            if (response.ok) {
                const data = await response.json();
                if (data.status === "approved") {
                    toast.success("🎉 Your verification has been approved! Dashboard is now unlocked.");
                    onStatusChange?.();
                    // Force re-render by reloading
                    router.refresh();
                } else if (data.status === "rejected") {
                    toast.error("Verification was not approved. See details below.");
                    await fetchRejectionReason();
                    onStatusChange?.();
                } else {
                    toast.info("Verification is still being processed. Please check back later.");
                }
            }
        } catch (err) {
            console.warn("Status check failed:", err);
            toast.error("Could not check status. Please try again.");
        }
        setChecking(false);
    };

    // --- Upload form handlers ---
    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB");
                return;
            }
            setDocumentFile(file);
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onloadend = () => setDocumentPreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setDocumentPreview(null);
            }
        }
    };

    const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB");
                return;
            }
            setSelfieFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setSelfiePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSelfieWithIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB");
                return;
            }
            setSelfieWithIdFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setSelfieWithIdPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const removeDocument = () => {
        setDocumentFile(null);
        setDocumentPreview(null);
        if (documentInputRef.current) documentInputRef.current.value = "";
    };

    const removeSelfie = () => {
        setSelfieFile(null);
        setSelfiePreview(null);
        if (selfieInputRef.current) selfieInputRef.current.value = "";
    };

    const removeSelfieWithId = () => {
        setSelfieWithIdFile(null);
        setSelfieWithIdPreview(null);
        if (selfieWithIdInputRef.current) selfieWithIdInputRef.current.value = "";
    };

    const isFormValid = () => {
        return idType && (idType !== "others" || idTypeOther.trim()) && documentFile && selfieFile && selfieWithIdFile;
    };

    const handleManualSubmit = async () => {
        if (!isFormValid() || !user) return;
        setSubmitting(true);

        try {
            // Upload document
            const docExt = documentFile!.name.split(".").pop();
            const docPath = `${user.id}/document_${Date.now()}.${docExt}`;
            const { error: docError } = await supabase.storage
                .from("kyc-documents")
                .upload(docPath, documentFile!);

            if (docError) {
                toast.error("Failed to upload document");
                setSubmitting(false);
                return;
            }

            // Upload selfie
            const selfieExt = selfieFile!.name.split(".").pop();
            const selfiePath = `${user.id}/selfie_${Date.now()}.${selfieExt}`;
            const { error: selfieError } = await supabase.storage
                .from("kyc-documents")
                .upload(selfiePath, selfieFile!);

            if (selfieError) {
                toast.error("Failed to upload selfie");
                setSubmitting(false);
                return;
            }

            // Upload selfie holding ID
            const selfieWithIdExt = selfieWithIdFile!.name.split(".").pop();
            const selfieWithIdPath = `${user.id}/selfie_with_id_${Date.now()}.${selfieWithIdExt}`;
            const { error: selfieWithIdError } = await supabase.storage
                .from("kyc-documents")
                .upload(selfieWithIdPath, selfieWithIdFile!);

            if (selfieWithIdError) {
                toast.error("Failed to upload selfie holding ID");
                setSubmitting(false);
                return;
            }

            // Get public URLs
            const { data: docUrlData } = supabase.storage.from("kyc-documents").getPublicUrl(docPath);
            const { data: selfieUrlData } = supabase.storage.from("kyc-documents").getPublicUrl(selfiePath);
            const { data: selfieWithIdUrlData } = supabase.storage.from("kyc-documents").getPublicUrl(selfieWithIdPath);

            // Create KYC submission record
            const { error: kycError } = await supabase.from("kyc_submissions").insert({
                user_id: user.id,
                id_type: idType,
                id_type_other: idType === "others" ? idTypeOther : null,
                document_url: docUrlData.publicUrl,
                selfie_url: selfieUrlData.publicUrl,
                selfie_with_id_url: selfieWithIdUrlData.publicUrl,
                status: "pending",
            });

            if (kycError) {
                console.error("Database insert error:", kycError);
                toast.error(`Failed to submit verification: ${kycError.message}`);
                setSubmitting(false);
                return;
            }

            // Update profile kyc_status to pending
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    kyc_status: "pending",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

            if (profileError) {
                console.error("Database update error:", profileError);
                toast.error(`Failed to update profile status: ${profileError.message}`);
                setSubmitting(false);
                return;
            }

            // Notify admin(s) about the manual submission
            const { data: admins } = await supabase
                .from("profiles")
                .select("id")
                .eq("role", "admin");

            if (admins && admins.length > 0) {
                const { data: creatorProfile } = await supabase
                    .from("profiles")
                    .select("username")
                    .eq("id", user.id)
                    .single();

                const adminNotifications = admins.map((admin) => ({
                    user_id: admin.id,
                    type: "kyc_manual_submission",
                    message: `📋 New manual KYC submission from @${creatorProfile?.username || "unknown"}. Awaiting review in Business Console.`,
                }));

                await supabase.from("notifications").insert(adminNotifications);
            }

            toast.success("Documents submitted! Our team will review them shortly.");
            setShowUploadForm(false);
            // Reset form
            setIdType("");
            setIdTypeOther("");
            removeDocument();
            removeSelfie();
            removeSelfieWithId();
        } catch (error) {
            console.error("Manual submission error:", error);
            toast.error("Something went wrong");
        }

        setSubmitting(false);
    };

    const isPending = kycStatus === "pending";
    const isRejected = kycStatus === "rejected";

    if (!isPending && !isRejected) return null;

    return (
        <div
            className={`cs-glass-card overflow-hidden ${
                isRejected
                    ? "border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
                    : "border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)]"
            }`}
        >
            <div
                className={`px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 ${
                    isRejected
                        ? "bg-gradient-to-r from-red-500/10 to-red-900/10"
                        : "bg-gradient-to-r from-yellow-500/10 to-amber-900/10"
                }`}
            >
                <div className="flex items-center gap-3">
                    {isPending ? (
                        <div className="relative">
                            <Clock className="w-6 h-6 text-yellow-400" />
                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
                        </div>
                    ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                    )}
                    <div>
                        <h3 className="text-white font-bold text-base">
                            {isPending ? "ID Verification Pending" : "ID Verification Declined"}
                        </h3>
                        <p className={`text-xs mt-0.5 ${isPending ? "text-yellow-400/70" : "text-red-400/70"}`}>
                            {isPending
                                ? "Your dashboard is locked until verification is complete"
                                : "Please review the reason and resubmit your documents"}
                        </p>
                    </div>
                </div>

                {/* Check Status Button */}
                <button
                    onClick={checkStatus}
                    disabled={checking}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
                        isPending
                            ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30"
                            : "bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30"
                    }`}
                >
                    <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
                    {checking ? "Checking..." : "Check Status"}
                </button>
            </div>

            {/* Status Details */}
            <div className="px-6 py-5 space-y-4">
                {/* Pending Info */}
                {isPending && (
                    <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-yellow-200 text-sm font-medium">Verification can take up to 24 hours</p>
                            <p className="text-gray-400 text-xs mt-1">
                                The system is reviewing your identity. This process is automated but may require
                                additional time. You'll be notified once it's complete.
                            </p>
                        </div>
                    </div>
                )}

                {/* Rejection Reason */}
                {isRejected && rejectionReason && (
                    <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-200 text-sm font-medium">Reason for Decline</p>
                            <p className="text-gray-300 text-sm mt-1">{rejectionReason}</p>
                        </div>
                    </div>
                )}

                {/* Manual Upload Section */}
                <div className="border border-white/10 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className="w-full flex items-center justify-between px-5 py-4 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Upload className="w-5 h-5 text-pink-400" />
                            <div className="text-left">
                                <p className="text-white font-semibold text-sm">
                                    {isRejected ? "Resubmit for Manual Review" : "Want Faster Approval?"}
                                </p>
                                <p className="text-gray-500 text-xs mt-0.5">
                                    Upload your ID and selfie for manual admin review
                                </p>
                            </div>
                        </div>
                        {showUploadForm ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>

                    {showUploadForm && (
                        <div className="px-5 pb-5 pt-2 space-y-5 border-t border-white/5">
                            {/* ID Type Selection */}
                            <div>
                                <label className="text-sm font-medium text-gray-300 block mb-3">
                                    Select Document Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ID_TYPES.map((type) => {
                                        const IconComponent = type.icon;
                                        return (
                                            <button
                                                key={type.value}
                                                onClick={() => setIdType(type.value)}
                                                className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 text-sm ${
                                                    idType === type.value
                                                        ? "border-pink-500 bg-pink-500/10 text-white"
                                                        : "border-white/10 hover:border-white/20 text-gray-400"
                                                }`}
                                            >
                                                <IconComponent
                                                    className={`w-4 h-4 ${
                                                        idType === type.value ? "text-pink-500" : "text-gray-500"
                                                    }`}
                                                />
                                                {type.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {idType === "others" && (
                                    <input
                                        type="text"
                                        placeholder="Specify document type"
                                        value={idTypeOther}
                                        onChange={(e) => setIdTypeOther(e.target.value)}
                                        className="w-full mt-3 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
                                    />
                                )}
                            </div>

                            {/* Document Upload */}
                            <div>
                                <label className="text-sm font-medium text-gray-300 block mb-2">ID Document</label>
                                {documentFile ? (
                                    <div className="relative">
                                        {documentPreview ? (
                                            <img
                                                src={documentPreview}
                                                alt="Document"
                                                className="w-full h-32 object-contain bg-black/60 rounded-xl"
                                            />
                                        ) : (
                                            <div className="w-full h-32 bg-black/60 rounded-xl flex items-center justify-center">
                                                <div className="text-center">
                                                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                                                    <p className="text-gray-400 text-xs">{documentFile.name}</p>
                                                </div>
                                            </div>
                                        )}
                                        <button
                                            onClick={removeDocument}
                                            className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-full hover:bg-red-500"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => documentInputRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-white/15 rounded-xl hover:border-pink-500/40 transition-colors flex flex-col items-center justify-center gap-2"
                                    >
                                        <Upload className="w-6 h-6 text-gray-500" />
                                        <span className="text-gray-500 text-xs">Click to upload document</span>
                                    </button>
                                )}
                                <input
                                    ref={documentInputRef}
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleDocumentChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Selfie Upload */}
                            <div>
                                <label className="text-sm font-medium text-gray-300 block mb-2">Selfie Photo</label>
                                {selfieFile ? (
                                    <div className="relative">
                                        <img
                                            src={selfiePreview || ""}
                                            alt="Selfie"
                                            className="w-full h-32 object-contain bg-black/60 rounded-xl"
                                        />
                                        <button
                                            onClick={removeSelfie}
                                            className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-full hover:bg-red-500"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => selfieInputRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-white/15 rounded-xl hover:border-pink-500/40 transition-colors flex flex-col items-center justify-center gap-2"
                                    >
                                        <Camera className="w-6 h-6 text-gray-500" />
                                        <span className="text-gray-500 text-xs">Click to upload selfie</span>
                                    </button>
                                )}
                                <input
                                    ref={selfieInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    onChange={handleSelfieChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Selfie with ID Upload */}
                            <div>
                                <label className="text-sm font-medium text-gray-300 block mb-2">Selfie holding ID Card</label>
                                {selfieWithIdFile ? (
                                    <div className="relative">
                                        <img
                                            src={selfieWithIdPreview || ""}
                                            alt="Selfie holding ID"
                                            className="w-full h-32 object-contain bg-black/60 rounded-xl"
                                        />
                                        <button
                                            onClick={removeSelfieWithId}
                                            className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-full hover:bg-red-500"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => selfieWithIdInputRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-white/15 rounded-xl hover:border-pink-500/40 transition-colors flex flex-col items-center justify-center gap-2"
                                    >
                                        <Camera className="w-6 h-6 text-gray-500" />
                                        <span className="text-gray-500 text-xs">Click to upload selfie holding ID Card</span>
                                    </button>
                                )}
                                <input
                                    ref={selfieWithIdInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    onChange={handleSelfieWithIdChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleManualSubmit}
                                disabled={!isFormValid() || submitting}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                                    isFormValid()
                                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/20"
                                        : "bg-gray-800 text-gray-500 cursor-not-allowed"
                                }`}
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting...
                                    </span>
                                ) : (
                                    "Submit for Manual Review"
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
