"use client";

import React, { useState, useRef } from "react";
import {
    ShieldCheck,
    Upload,
    Camera,
    FileText,
    CreditCard,
    IdCard,
    Car,
    Globe,
    AlertTriangle,
    X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

interface Props {
    onComplete: () => void;
    rejectionReason?: string;
}

const ID_TYPES = [
    { value: "nid", label: "National ID (NID)", icon: IdCard },
    { value: "passport", label: "Passport", icon: Globe },
    { value: "driving_license", label: "Driving License", icon: Car },
    { value: "others", label: "Other Document", icon: FileText },
];

export default function KYCVerificationStep({ onComplete, rejectionReason }: Props) {
    const supabase = createClient();
    const { user } = useAuth();

    const [idType, setIdType] = useState("");
    const [idTypeOther, setIdTypeOther] = useState("");
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [documentPreview, setDocumentPreview] = useState<string | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const documentInputRef = useRef<HTMLInputElement>(null);
    const selfieInputRef = useRef<HTMLInputElement>(null);

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB");
                return;
            }
            setDocumentFile(file);
            // Create preview for images
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

    const isFormValid = () => {
        return (
            idType &&
            (idType !== "others" || idTypeOther.trim()) &&
            documentFile &&
            selfieFile
        );
    };

    const handleSubmit = async () => {
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
                console.error("Document upload error:", docError);
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
                console.error("Selfie upload error:", selfieError);
                toast.error("Failed to upload selfie");
                setSubmitting(false);
                return;
            }

            // Get public URLs
            const { data: docUrlData } = supabase.storage
                .from("kyc-documents")
                .getPublicUrl(docPath);
            const { data: selfieUrlData } = supabase.storage
                .from("kyc-documents")
                .getPublicUrl(selfiePath);

            // Create KYC submission record
            const { error: kycError } = await supabase.from("kyc_submissions").insert({
                user_id: user.id,
                id_type: idType,
                id_type_other: idType === "others" ? idTypeOther : null,
                document_url: docUrlData.publicUrl,
                selfie_url: selfieUrlData.publicUrl,
                status: "pending",
            });

            if (kycError) {
                console.error("KYC submission error:", kycError);
                toast.error("Failed to submit verification");
                setSubmitting(false);
                return;
            }

            // Update profile kyc_status
            await supabase
                .from("profiles")
                .update({
                    kyc_status: "pending",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

            toast.success("Verification submitted successfully!");
            onComplete();
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Something went wrong");
        }

        setSubmitting(false);
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
                        Please resubmit your documents with clear, valid information.
                    </p>
                </div>
            )}

            {/* Step Title */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm mb-4">
                    <ShieldCheck className="w-4 h-4" />
                    Step 3 of 3
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Verify Your Identity</h2>
                <p className="text-gray-400">
                    Help us keep the platform safe by verifying your identity
                </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
                {/* ID Type Selection */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                    <label className="text-sm font-medium text-gray-300 block mb-4">
                        Select Document Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {ID_TYPES.map((type) => {
                            const IconComponent = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => setIdType(type.value)}
                                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${idType === type.value
                                            ? "border-pink-500 bg-pink-500/10"
                                            : "border-white/10 hover:border-white/20"
                                        }`}
                                >
                                    <IconComponent
                                        className={`w-5 h-5 ${idType === type.value ? "text-pink-500" : "text-gray-400"
                                            }`}
                                    />
                                    <span className="text-sm text-white">{type.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Other document type input */}
                    {idType === "others" && (
                        <div className="mt-4">
                            <input
                                type="text"
                                placeholder="Specify document type"
                                value={idTypeOther}
                                onChange={(e) => setIdTypeOther(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
                            />
                        </div>
                    )}
                </div>

                {/* Document Upload */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                    <label className="text-sm font-medium text-gray-300 block mb-4">
                        Upload ID Document
                    </label>
                    <p className="text-xs text-gray-500 mb-4">
                        Upload a clear photo or scan of your ID. Supported: JPG, PNG, PDF (max 5MB)
                    </p>

                    {documentFile ? (
                        <div className="relative">
                            {documentPreview ? (
                                <img
                                    src={documentPreview}
                                    alt="Document preview"
                                    className="w-full h-48 object-contain bg-black/60 rounded-xl"
                                />
                            ) : (
                                <div className="w-full h-48 bg-black/60 rounded-xl flex items-center justify-center">
                                    <div className="text-center">
                                        <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-400 text-sm">{documentFile.name}</p>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={removeDocument}
                                className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full hover:bg-red-500"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => documentInputRef.current?.click()}
                            className="w-full h-48 border-2 border-dashed border-white/20 rounded-xl hover:border-pink-500/50 transition-colors flex flex-col items-center justify-center gap-3"
                        >
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-gray-400">Click to upload document</span>
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
                <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                    <label className="text-sm font-medium text-gray-300 block mb-4">
                        Upload Selfie Photo
                    </label>
                    <p className="text-xs text-gray-500 mb-4">
                        Take a clear selfie. Your face should be clearly visible. (max 5MB)
                    </p>

                    {selfieFile ? (
                        <div className="relative">
                            <img
                                src={selfiePreview || ""}
                                alt="Selfie preview"
                                className="w-full h-48 object-contain bg-black/60 rounded-xl"
                            />
                            <button
                                onClick={removeSelfie}
                                className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full hover:bg-red-500"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => selfieInputRef.current?.click()}
                            className="w-full h-48 border-2 border-dashed border-white/20 rounded-xl hover:border-pink-500/50 transition-colors flex flex-col items-center justify-center gap-3"
                        >
                            <Camera className="w-8 h-8 text-gray-400" />
                            <span className="text-gray-400">Click to upload selfie</span>
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

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                    <div className="flex gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-blue-300 text-sm font-medium">Your data is secure</p>
                            <p className="text-gray-400 text-xs mt-1">
                                We use industry-standard encryption to protect your documents.
                                Your information is only used for verification purposes.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="text-center pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid() || submitting}
                        className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${isFormValid()
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25"
                                : "bg-gray-800 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </span>
                        ) : (
                            "Submit for Verification"
                        )}
                    </button>
                    <p className="text-gray-500 text-xs mt-3">
                        Verification usually takes less than 24 hours
                    </p>
                </div>
            </div>
        </div>
    );
}
