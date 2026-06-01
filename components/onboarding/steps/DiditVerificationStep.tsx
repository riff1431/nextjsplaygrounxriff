"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
    ShieldCheck, 
    ExternalLink, 
    AlertTriangle, 
    CheckCircle, 
    Loader2, 
    Upload, 
    Camera, 
    FileText, 
    Globe, 
    IdCard, 
    Car, 
    X,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface Props {
    onComplete: () => void;
    rejectionReason?: string;
}

const SESSION_STORAGE_KEY = 'didit_verification_started';

const ID_TYPES = [
    { value: "nid", label: "National ID (NID)", icon: IdCard },
    { value: "passport", label: "Passport", icon: Globe },
    { value: "driving_license", label: "Driving License", icon: Car },
    { value: "others", label: "Other Document", icon: FileText },
];

export default function DiditVerificationStep({ onComplete, rejectionReason }: Props) {
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [verificationStarted, setVerificationStarted] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // Selected verification method: 'none' | 'didit' | 'manual'
    const [activeMethod, setActiveMethod] = useState<"none" | "didit" | "manual">("none");

    // Manual upload state
    const [idType, setIdType] = useState("");
    const [idTypeOther, setIdTypeOther] = useState("");
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [documentPreview, setDocumentPreview] = useState<string | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [selfieWithIdFile, setSelfieWithIdFile] = useState<File | null>(null);
    const [selfieWithIdPreview, setSelfieWithIdPreview] = useState<string | null>(null);
    const [submittingManual, setSubmittingManual] = useState(false);

    const documentInputRef = useRef<HTMLInputElement>(null);
    const selfieInputRef = useRef<HTMLInputElement>(null);
    const selfieWithIdInputRef = useRef<HTMLInputElement>(null);

    // Restore verificationStarted state from sessionStorage on mount
    useEffect(() => {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored === 'true') {
            setVerificationStarted(true);
            setActiveMethod("didit");
        }
    }, []);

    // Realtime KYC listener
    useEffect(() => {
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
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
                toast.success("Already verified!");
                onComplete();
                return;
            }

            // Subscribe to realtime changes
            const channel = supabase
                .channel('kyc-status-updates-step')
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
                            sessionStorage.removeItem(SESSION_STORAGE_KEY);
                            toast.success("Verification approved!");
                            onComplete();
                        } else if (newStatus === 'rejected') {
                            sessionStorage.removeItem(SESSION_STORAGE_KEY);
                            toast.error("Verification was not approved.");
                            router.push('/rooms/creator-studio');
                        } else if (newStatus === 'pending') {
                            sessionStorage.removeItem(SESSION_STORAGE_KEY);
                            router.push('/rooms/creator-studio');
                        }
                    }
                )
                .subscribe();

            // Polling fallback
            pollRef.current = setInterval(async () => {
                const { data: polledProfile } = await supabase
                    .from('profiles')
                    .select('kyc_status')
                    .eq('id', user.id)
                    .single();

                if (polledProfile?.kyc_status === 'approved') {
                    sessionStorage.removeItem(SESSION_STORAGE_KEY);
                    toast.success("Verification approved!");
                    onComplete();
                    if (pollRef.current) clearInterval(pollRef.current);
                } else if (polledProfile?.kyc_status === 'rejected') {
                    sessionStorage.removeItem(SESSION_STORAGE_KEY);
                    toast.error("Verification was not approved.");
                    if (pollRef.current) clearInterval(pollRef.current);
                    router.push('/rooms/creator-studio');
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

    // Didit trigger
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
                window.open(data.url, '_blank');
                setLoading(false);
                setVerificationStarted(true);
                sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
                toast.info("Verification opened in a new tab. Complete it there to verify.");
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

    const checkVerificationStatus = async () => {
        setCheckingStatus(true);
        try {
            const response = await fetch('/api/didit/session/status');
            if (!response.ok) {
                throw new Error('Status check failed');
            }

            const data = await response.json();
            if (data.status === 'approved') {
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
                toast.success("🎉 Verification approved!");
                onComplete();
            } else if (data.status === 'rejected') {
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
                toast.info("Verification needs attention. Taking you to your dashboard.");
                router.push('/rooms/creator-studio');
            } else if (data.status === 'no_session') {
                toast.info("No verification session found. Please start verification.");
                setVerificationStarted(false);
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
            } else {
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
                toast.info("Verification submitted! Taking you to your dashboard.");
                router.push('/rooms/creator-studio');
            }
        } catch (error) {
            console.error("Status check error:", error);
            toast.error("Could not check status. Please try again.");
        } finally {
            setCheckingStatus(false);
        }
    };

    // Manual Upload Handlers
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

    const submitManualVerification = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!idType || (idType === "others" && !idTypeOther.trim()) || !documentFile || !selfieFile || !selfieWithIdFile || !user) {
            toast.error("Please fill out all fields");
            return;
        }

        setSubmittingManual(true);
        try {
            // Upload ID Document
            const docExt = documentFile.name.split(".").pop();
            const docPath = `${user.id}/document_${Date.now()}.${docExt}`;
            const { error: docError } = await supabase.storage
                .from("kyc-documents")
                .upload(docPath, documentFile);

            if (docError) {
                toast.error("Failed to upload ID document");
                setSubmittingManual(false);
                return;
            }

            // Upload Selfie
            const selfieExt = selfieFile.name.split(".").pop();
            const selfiePath = `${user.id}/selfie_${Date.now()}.${selfieExt}`;
            const { error: selfieError } = await supabase.storage
                .from("kyc-documents")
                .upload(selfiePath, selfieFile);

            if (selfieError) {
                toast.error("Failed to upload selfie");
                setSubmittingManual(false);
                return;
            }

            // Upload Selfie with ID
            const selfieWithIdExt = selfieWithIdFile.name.split(".").pop();
            const selfieWithIdPath = `${user.id}/selfie_with_id_${Date.now()}.${selfieWithIdExt}`;
            const { error: selfieWithIdError } = await supabase.storage
                .from("kyc-documents")
                .upload(selfieWithIdPath, selfieWithIdFile);

            if (selfieWithIdError) {
                toast.error("Failed to upload selfie holding ID");
                setSubmittingManual(false);
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
                toast.error(`Failed to submit verification: ${submitError.message}`);
                setSubmittingManual(false);
                return;
            }

            // Update profile kyc_status to pending and onboarding completed
            await supabase
                .from("profiles")
                .update({
                    kyc_status: "pending",
                    onboarding_completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

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

            toast.success("Verification submitted! Taking you to your dashboard...");
            onComplete();
        } catch (err) {
            console.error("Manual verification error:", err);
            toast.error("Something went wrong");
        } finally {
            setSubmittingManual(false);
        }
    };

    // Skip onboarding step
    const handleSkip = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("User session not found.");
                return;
            }

            const { error } = await supabase
                .from("profiles")
                .update({
                    kyc_status: "skipped",
                    onboarding_completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

            if (error) {
                console.error("Skip error:", error);
                toast.error("Failed to skip verification: " + error.message);
                return;
            }

            toast.success("Welcome to PlayGroundX!");
            onComplete();
        } catch (err) {
            console.error("Error skipping verification step:", err);
            toast.error("Something went wrong");
        } finally {
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
                    Choose your verification preference to complete your creator signup.
                </p>
            </div>

            <div className="max-w-2xl mx-auto">
                {/* Method selector */}
                {activeMethod === "none" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Option 1: Instant */}
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 text-center flex flex-col justify-between hover:border-pink-500/30 transition-all group">
                                <div>
                                    <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-pink-500/10 text-pink-500 group-hover:scale-105 transition-transform">
                                        <Globe className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">Instant Verification</h3>
                                    <span className="text-[9px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Didit Automated
                                    </span>
                                    <p className="text-gray-400 text-xs mt-3 leading-relaxed">
                                        Fast and secure verification using our partner Didit. ID scan and biometric selfie verified in under 2 minutes.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveMethod("didit")}
                                    className="w-full mt-6 py-3 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm hover:shadow-lg transition-all"
                                >
                                    Instant Verification
                                </button>
                            </div>

                            {/* Option 2: Manual */}
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 text-center flex flex-col justify-between hover:border-amber-500/30 transition-all group">
                                <div>
                                    <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
                                        <Upload className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">Manual Verification</h3>
                                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        12-24 Hours Review
                                    </span>
                                    <p className="text-gray-400 text-xs mt-3 leading-relaxed">
                                        Upload your ID document, selfie, and a selfie holding your ID card. Reviewed manually by the support team.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveMethod("manual")}
                                    className="w-full mt-6 py-3 rounded-xl font-bold bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-all"
                                >
                                    Manual Verification
                                </button>
                            </div>
                        </div>

                        {/* Skip Button */}
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-center">
                            <button
                                onClick={handleSkip}
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl font-bold text-base transition-all duration-300 bg-white/5 hover:bg-white/10 text-white border border-white/15 hover:border-white/25 flex items-center justify-center gap-2"
                            >
                                Skip for Now
                            </button>
                        </div>
                    </div>
                )}

                {/* Didit Flow */}
                {activeMethod === "didit" && (
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-8 text-center max-w-md mx-auto relative">
                        <button
                            onClick={() => setActiveMethod("none")}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white text-xs"
                        >
                            Back to Methods
                        </button>

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
                                    className="w-full py-3 rounded-xl font-medium text-white hover:text-pink-400 hover:bg-pink-500/5 transition-all text-sm flex items-center justify-center gap-2 mb-2 border border-white/10 hover:border-pink-500/30"
                                >
                                    Reopen Verification Tab
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={handleSkip}
                                    className="w-full py-3 rounded-xl font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all text-sm flex items-center justify-center gap-2 mb-4"
                                >
                                    Skip Verification for Now
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

                                <button
                                    onClick={handleSkip}
                                    disabled={loading}
                                    className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 mb-6"
                                >
                                    Skip for Now
                                </button>
                            </>
                        )}

                        <button
                            onClick={checkVerificationStatus}
                            disabled={checkingStatus}
                            className="w-full py-3 rounded-xl font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {checkingStatus ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Checking status...
                                </>
                            ) : (
                                'Check verification status'
                            )}
                        </button>

                        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span>Secure 256-bit encryption</span>
                        </div>
                    </div>
                )}

                {/* Manual Flow */}
                {activeMethod === "manual" && (
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-6 sm:p-8 relative space-y-6">
                        <button
                            onClick={() => setActiveMethod("none")}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white text-xs"
                        >
                            Back to Methods
                        </button>

                        <h3 className="text-xl font-bold text-white border-b border-white/5 pb-3">Manual Verification</h3>

                        {/* ID Type Selection */}
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
                                    placeholder="Specify document name..."
                                    value={idTypeOther}
                                    onChange={(e) => setIdTypeOther(e.target.value)}
                                    className="w-full mt-3 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
                                />
                            )}
                        </div>

                        {/* Document Upload */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-300 block">Upload ID Document Photo</label>
                            {documentFile ? (
                                <div className="relative">
                                    {documentPreview ? (
                                        <img
                                            src={documentPreview}
                                            alt="ID preview"
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
                                    <span className="text-gray-500 text-xs font-semibold">Select image scan of ID Document</span>
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

                        {/* Submit Button */}
                        <button
                            onClick={submitManualVerification}
                            disabled={submittingManual}
                            className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm transition-all"
                        >
                            {submittingManual ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting Documents...
                                </>
                            ) : (
                                "Submit Manual Verification"
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
