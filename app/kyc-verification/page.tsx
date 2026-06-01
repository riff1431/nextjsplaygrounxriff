"use client";

import React, { useEffect, useState, useRef } from "react";
import InfoPageLayout from "@/components/layout/InfoPageLayout";
import {
    ShieldCheck,
    Upload,
    Camera,
    FileText,
    Globe,
    IdCard,
    Car,
    AlertTriangle,
    CheckCircle,
    Loader2,
    X,
    ExternalLink,
    RefreshCw,
    ArrowLeft,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

const ID_TYPES = [
    { value: "nid", label: "National ID (NID)", icon: IdCard },
    { value: "passport", label: "Passport", icon: Globe },
    { value: "driving_license", label: "Driving License", icon: Car },
    { value: "others", label: "Other Document", icon: FileText },
];

const DIDIT_SESSION_KEY = "didit_verification_started";

export default function KycVerificationPage() {
    const supabase = createClient();
    const { user, role, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [pageLoading, setPageLoading] = useState(true);
    const [kycStatus, setKycStatus] = useState("not_required");
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);

    // Flow controls
    const [activeMethod, setActiveMethod] = useState<"none" | "didit" | "manual">("none");

    // Didit state
    const [diditLoading, setDiditLoading] = useState(false);
    const [diditChecking, setDiditChecking] = useState(false);
    const [diditStarted, setDiditStarted] = useState(false);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // Manual Upload state
    const [idType, setIdType] = useState("");
    const [idTypeOther, setIdTypeOther] = useState("");
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [documentPreview, setDocumentPreview] = useState<string | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [selfieWithIdFile, setSelfieWithIdFile] = useState<File | null>(null);
    const [selfieWithIdPreview, setSelfieWithIdPreview] = useState<string | null>(null);
    const [manualSubmitting, setManualSubmitting] = useState(false);

    const documentInputRef = useRef<HTMLInputElement>(null);
    const selfieInputRef = useRef<HTMLInputElement>(null);
    const selfieWithIdInputRef = useRef<HTMLInputElement>(null);

    // Load initial status
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
            return;
        }

        if (user) {
            // Restore Didit start status
            const stored = sessionStorage.getItem(DIDIT_SESSION_KEY);
            if (stored === "true") {
                setDiditStarted(true);
                setActiveMethod("didit");
            }
            fetchKycStatus();
        }
    }, [user, authLoading]);

    // Realtime KYC listener
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel("kyc-page-updates")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "profiles",
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    const newStatus = payload.new.kyc_status;
                    setKycStatus(newStatus);
                    if (newStatus === "approved") {
                        toast.success("Verification approved!");
                        sessionStorage.removeItem(DIDIT_SESSION_KEY);
                        if (pollRef.current) clearInterval(pollRef.current);
                    } else if (newStatus === "rejected") {
                        toast.error("Verification was declined.");
                        fetchRejectionReason();
                        if (pollRef.current) clearInterval(pollRef.current);
                    }
                }
            )
            .subscribe();

        // Polling fallback
        pollRef.current = setInterval(async () => {
            const { data } = await supabase
                .from("profiles")
                .select("kyc_status")
                .eq("id", user.id)
                .single();

            if (data?.kyc_status && data.kyc_status !== kycStatus) {
                setKycStatus(data.kyc_status);
                if (data.kyc_status === "approved") {
                    toast.success("Verification approved!");
                    sessionStorage.removeItem(DIDIT_SESSION_KEY);
                    if (pollRef.current) clearInterval(pollRef.current);
                } else if (data.kyc_status === "rejected") {
                    toast.error("Verification declined.");
                    fetchRejectionReason();
                    if (pollRef.current) clearInterval(pollRef.current);
                }
            }
        }, 8000);

        return () => {
            supabase.removeChannel(channel);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [user, kycStatus]);

    const fetchKycStatus = async () => {
        if (!user) return;
        setPageLoading(true);

        const { data, error } = await supabase
            .from("profiles")
            .select("kyc_status")
            .eq("id", user.id)
            .single();

        if (error) {
            console.error("Error fetching KYC status:", error);
            setPageLoading(false);
            return;
        }

        const status = data?.kyc_status || "not_required";
        setKycStatus(status);

        if (status === "rejected") {
            await fetchRejectionReason();
        }

        setPageLoading(false);
    };

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

    // Didit Automated Flow Handlers
    const startDiditVerification = async () => {
        setDiditLoading(true);
        try {
            const response = await fetch("/api/didit/session", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to start verification");
            }

            const data = await response.json();

            if (data.url) {
                window.open(data.url, "_blank");
                setDiditLoading(false);
                setDiditStarted(true);
                sessionStorage.setItem(DIDIT_SESSION_KEY, "true");
                toast.info("Verification opened in a new tab. Complete it there to verify.");
            } else {
                toast.error("Could not retrieve verification URL");
                setDiditLoading(false);
            }
        } catch (error) {
            console.error("Didit error:", error);
            toast.error("Failed to start Didit process");
            setDiditLoading(false);
        }
    };

    const checkDiditStatus = async () => {
        setDiditChecking(true);
        try {
            const response = await fetch("/api/didit/session/status");
            if (!response.ok) {
                throw new Error("Status check failed");
            }

            const data = await response.json();
            if (data.status === "approved") {
                sessionStorage.removeItem(DIDIT_SESSION_KEY);
                toast.success("🎉 Verification approved!");
                setKycStatus("approved");
            } else if (data.status === "rejected") {
                sessionStorage.removeItem(DIDIT_SESSION_KEY);
                toast.error("Verification declined.");
                setKycStatus("rejected");
                fetchRejectionReason();
            } else if (data.status === "no_session") {
                toast.info("No session found. Please start verification.");
                setDiditStarted(false);
                sessionStorage.removeItem(DIDIT_SESSION_KEY);
            } else {
                toast.info("Verification is still pending. Please wait.");
            }
        } catch (error) {
            console.error("Status check error:", error);
            toast.error("Could not check status");
        } finally {
            setDiditChecking(false);
        }
    };

    // Manual Form Handlers
    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File must be under 5MB");
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
                toast.error("File must be under 5MB");
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
                toast.error("File must be under 5MB");
                return;
            }
            setSelfieWithIdFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setSelfieWithIdPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const submitManualVerification = async () => {
        if (!idType || (idType === "others" && !idTypeOther.trim()) || !documentFile || !selfieFile || !selfieWithIdFile || !user) {
            toast.error("Please complete all form fields");
            return;
        }

        setManualSubmitting(true);
        try {
            // Upload document
            const docExt = documentFile.name.split(".").pop();
            const docPath = `${user.id}/document_${Date.now()}.${docExt}`;
            const { error: docError } = await supabase.storage
                .from("kyc-documents")
                .upload(docPath, documentFile);

            if (docError) {
                toast.error("Failed to upload ID document");
                setManualSubmitting(false);
                return;
            }

            // Upload selfie
            const selfieExt = selfieFile.name.split(".").pop();
            const selfiePath = `${user.id}/selfie_${Date.now()}.${selfieExt}`;
            const { error: selfieError } = await supabase.storage
                .from("kyc-documents")
                .upload(selfiePath, selfieFile);

            if (selfieError) {
                toast.error("Failed to upload selfie");
                setManualSubmitting(false);
                return;
            }

            // Upload selfie holding ID
            const selfieWithIdExt = selfieWithIdFile.name.split(".").pop();
            const selfieWithIdPath = `${user.id}/selfie_with_id_${Date.now()}.${selfieWithIdExt}`;
            const { error: selfieWithIdError } = await supabase.storage
                .from("kyc-documents")
                .upload(selfieWithIdPath, selfieWithIdFile);

            if (selfieWithIdError) {
                toast.error("Failed to upload selfie holding ID card");
                setManualSubmitting(false);
                return;
            }

            const { data: docUrl } = supabase.storage.from("kyc-documents").getPublicUrl(docPath);
            const { data: selfieUrl } = supabase.storage.from("kyc-documents").getPublicUrl(selfiePath);
            const { data: selfieWithIdUrl } = supabase.storage.from("kyc-documents").getPublicUrl(selfieWithIdPath);

            // Record submission
            const { error: submitError } = await supabase.from("kyc_submissions").insert({
                user_id: user.id,
                id_type: idType,
                id_type_other: idType === "others" ? idTypeOther : null,
                document_url: docUrl.publicUrl,
                selfie_url: selfieUrl.publicUrl,
                selfie_with_id_url: selfieWithIdUrl.publicUrl,
                status: "pending",
            });

            if (submitError) {
                console.error("Database insert error:", submitError);
                toast.error(`Failed to save submission: ${submitError.message}`);
                setManualSubmitting(false);
                return;
            }

            // Update profile status and onboarding completed
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    kyc_status: "pending",
                    onboarding_completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

            if (profileError) {
                toast.error("Failed to update profile status");
                setManualSubmitting(false);
                return;
            }

            // Notify admins
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
            setKycStatus("pending");
            setActiveMethod("none");
        } catch (err) {
            console.error("Manual submission error:", err);
            toast.error("An error occurred during submission");
        } finally {
            setManualSubmitting(false);
        }
    };

    const handleRestart = () => {
        setKycStatus("not_required");
        setActiveMethod("none");
        sessionStorage.removeItem(DIDIT_SESSION_KEY);
        setDiditStarted(false);
    };

    // Renders
    if (authLoading || pageLoading) {
        return (
            <InfoPageLayout title="Identity Verification" showHomeLink={false}>
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
                    <p className="text-gray-400">Verifying account details...</p>
                </div>
            </InfoPageLayout>
        );
    }

    return (
        <InfoPageLayout 
            title="Identity Verification" 
            subtitle="Securely verify your identity to start broadcasting and unlock monetization"
            showHomeLink={false}
        >
            {/* Top Navigation */}
            <div className="mb-6 -mt-4 border-b border-white/5 pb-4">
                <Link
                    href="/rooms/creator-studio"
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-pink-400 transition-colors group w-fit"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Creator Dashboard
                </Link>
            </div>

            {/* Case 1: KYC Approved */}
            {kycStatus === "approved" && (
                <div className="text-center py-10 space-y-6">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-extrabold text-white">Identity Verified Successfully!</h2>
                        <p className="text-gray-400 max-w-md mx-auto text-sm">
                            Thank you for completing your verification. Your profile is active and all features are unlocked.
                        </p>
                    </div>
                    <Link
                        href="/rooms/creator-studio"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg transition-transform hover:scale-102"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            )}

            {/* Case 2: KYC Pending */}
            {kycStatus === "pending" && (
                <div className="py-6 space-y-6">
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
                        <div>
                            <h3 className="text-lg font-bold text-white">Verification Under Review</h3>
                            <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-lg">
                                We are reviewing your submission. Automated Didit verification usually takes 2 minutes, while manual document reviews take up to 24 hours.
                            </p>
                        </div>
                    </div>

                    <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-300">Verification Status Actions:</h4>
                        
                        <button
                            onClick={checkDiditStatus}
                            disabled={diditChecking}
                            className="w-full py-3.5 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center justify-center gap-2 transition-all"
                        >
                            {diditChecking ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Checking Status...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Refresh & Check Verification Status
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Case 3: KYC Rejected */}
            {kycStatus === "rejected" && (
                <div className="py-6 space-y-6">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 text-red-400 mb-3">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-bold">Verification Declined</h3>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            {rejectionReason || "Your documents did not meet our compliance requirements. Please make sure documents are valid, fully visible, and free of glare."}
                        </p>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={handleRestart}
                            className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-2xl hover:scale-102 transition-transform shadow-lg"
                        >
                            Submit New Verification
                        </button>
                    </div>
                </div>
            )}

            {/* Case 4: Not Started / Skipped */}
            {(kycStatus === "skipped" || kycStatus === "not_required") && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    
                    {/* Method Selector */}
                    {activeMethod === "none" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            
                            {/* Method A: Didit */}
                            <div className="bg-black/30 border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-pink-500/30 transition-all group shadow-xl">
                                <div>
                                    <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center border border-pink-500/20 text-pink-500 group-hover:scale-110 transition-transform">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-5">Instant Verification</h3>
                                    <span className="inline-block mt-1 text-[10px] text-pink-400 font-bold bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Fastest & Automated
                                    </span>
                                    <p className="text-gray-400 text-xs sm:text-sm mt-3 leading-relaxed">
                                        Redirects to our identity verification partner, Didit. Standard scans of your ID/Passport and biometric selfie takes under 2 minutes.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveMethod("didit")}
                                    className="w-full mt-8 py-3.5 rounded-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg hover:shadow-pink-500/25 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    Select Instant Didit
                                </button>
                            </div>

                            {/* Method B: Manual Upload */}
                            <div className="bg-black/30 border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-amber-500/30 transition-all group shadow-xl">
                                <div>
                                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 text-amber-500 group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-5">Manual Verification</h3>
                                    <span className="inline-block mt-1 text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Up to 24 Hour Review
                                    </span>
                                    <p className="text-gray-400 text-xs sm:text-sm mt-3 leading-relaxed">
                                        Upload scans of your document and selfie directly. Files will be securely stored and reviewed manually by the compliance team.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveMethod("manual")}
                                    className="w-full mt-8 py-3.5 rounded-2xl font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    Select Manual Upload
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Method Flow Renderers */}
                    {activeMethod === "didit" && (
                        <div className="bg-black/20 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <h3 className="text-lg font-bold text-white">Instant Verification with Didit</h3>
                                <button
                                    onClick={() => setActiveMethod("none")}
                                    className="text-gray-400 hover:text-white text-xs flex items-center gap-1"
                                >
                                    Change Method
                                </button>
                            </div>

                            {diditStarted ? (
                                <div className="text-center py-6 space-y-6">
                                    <div className="w-16 h-16 bg-pink-500/10 border border-pink-500/20 rounded-full flex items-center justify-center mx-auto">
                                        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-white">Verification in Progress</h4>
                                        <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto">
                                            Please complete the steps inside the opened Didit verification tab.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 max-w-xs mx-auto">
                                        <button
                                            onClick={startDiditVerification}
                                            className="w-full py-3 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 font-bold text-sm flex items-center justify-center gap-2 border border-pink-500/20"
                                        >
                                            Reopen Verification Tab
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={checkDiditStatus}
                                            disabled={diditChecking}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            {diditChecking ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                "I've Completed It"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 space-y-6">
                                    <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto">
                                        <ShieldCheck className="w-8 h-8 text-pink-500 animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-white text-lg">Ready to Verify?</h4>
                                        <p className="text-gray-400 text-xs sm:text-sm max-w-sm mx-auto">
                                            You will be redirected to Didit secure partner portal. Please have your NID, Passport, or Driving License ready.
                                        </p>
                                    </div>
                                    <button
                                        onClick={startDiditVerification}
                                        disabled={diditLoading}
                                        className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold hover:shadow-lg transition-all"
                                    >
                                        {diditLoading ? "Preparing Redirect..." : "Start Instant Verification"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeMethod === "manual" && (
                        <div className="bg-black/20 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <h3 className="text-lg font-bold text-white">Manual Document Verification</h3>
                                <button
                                    onClick={() => setActiveMethod("none")}
                                    className="text-gray-400 hover:text-white text-xs"
                                >
                                    Change Method
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Form input document type */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-300">Select Document Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {ID_TYPES.map((type) => {
                                            const Icon = type.icon;
                                            return (
                                                <button
                                                    key={type.value}
                                                    onClick={() => setIdType(type.value)}
                                                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                                                        idType === type.value
                                                            ? "border-pink-500 bg-pink-500/10 text-white"
                                                            : "border-white/10 hover:border-white/20 text-gray-400"
                                                    }`}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="text-xs sm:text-sm font-bold">{type.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {idType === "others" && (
                                        <input
                                            type="text"
                                            placeholder="Write down document name..."
                                            value={idTypeOther}
                                            onChange={(e) => setIdTypeOther(e.target.value)}
                                            className="w-full mt-3 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                                        />
                                    )}
                                </div>

                                {/* ID Upload */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-300 block">Upload ID Scan / Photo</label>
                                    {documentFile ? (
                                        <div className="relative">
                                            {documentPreview ? (
                                                <img
                                                    src={documentPreview}
                                                    alt="ID document preview"
                                                    className="w-full h-44 object-contain bg-black/60 rounded-xl border border-white/10"
                                                />
                                            ) : (
                                                <div className="w-full h-44 bg-black/60 rounded-xl flex items-center justify-center border border-white/10">
                                                    <div className="text-center">
                                                        <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                                        <p className="text-gray-400 text-xs">{documentFile.name}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => { setDocumentFile(null); setDocumentPreview(null); }}
                                                className="absolute top-2.5 right-2.5 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => documentInputRef.current?.click()}
                                            className="w-full h-44 border-2 border-dashed border-white/15 rounded-xl hover:border-pink-500/40 transition-colors flex flex-col items-center justify-center gap-2"
                                        >
                                            <Upload className="w-6 h-6 text-gray-500" />
                                            <span className="text-gray-500 text-xs font-semibold">Select document image or PDF</span>
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
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-300 block">Upload Biometric Selfie</label>
                                    {selfieFile ? (
                                        <div className="relative">
                                            <img
                                                src={selfiePreview || ""}
                                                alt="Selfie preview"
                                                className="w-full h-44 object-contain bg-black/60 rounded-xl border border-white/10"
                                            />
                                            <button
                                                onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
                                                className="absolute top-2.5 right-2.5 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => selfieInputRef.current?.click()}
                                            className="w-full h-44 border-2 border-dashed border-white/15 rounded-xl hover:border-pink-500/40 transition-colors flex flex-col items-center justify-center gap-2"
                                        >
                                            <Camera className="w-6 h-6 text-gray-500" />
                                            <span className="text-gray-500 text-xs font-semibold">Take or upload a clean selfie</span>
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

                                {/* Selfie holding ID Card Upload */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-300 block">Upload Selfie holding ID Card</label>
                                    {selfieWithIdFile ? (
                                        <div className="relative">
                                            <img
                                                src={selfieWithIdPreview || ""}
                                                alt="Selfie holding ID preview"
                                                className="w-full h-44 object-contain bg-black/60 rounded-xl border border-white/10"
                                            />
                                            <button
                                                onClick={() => { setSelfieWithIdFile(null); setSelfieWithIdPreview(null); }}
                                                className="absolute top-2.5 right-2.5 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => selfieWithIdInputRef.current?.click()}
                                            className="w-full h-44 border-2 border-dashed border-white/15 rounded-xl hover:border-pink-500/40 transition-colors flex flex-col items-center justify-center gap-2"
                                        >
                                            <Camera className="w-6 h-6 text-gray-500" />
                                            <span className="text-gray-500 text-xs font-semibold">Take or upload selfie holding ID Card</span>
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

                                {/* Submit button */}
                                <button
                                    onClick={submitManualVerification}
                                    disabled={manualSubmitting}
                                    className="w-full mt-4 py-4 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base transition-all"
                                >
                                    {manualSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Uploading & Submitting Documents...
                                        </>
                                    ) : (
                                        "Submit for Manual Review"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </InfoPageLayout>
    );
}
