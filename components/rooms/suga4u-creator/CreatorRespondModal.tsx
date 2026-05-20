"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Loader2, CheckCircle2, Send, Image, FileVideo, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CreatorRespondModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (responseText: string, responseMediaUrl: string | null) => Promise<void>;
    fanName: string;
    requestLabel: string;
    customText: string | null;
    price: number;
}

export default function CreatorRespondModal({
    isOpen,
    onClose,
    onSubmit,
    fanName,
    requestLabel,
    customText,
    price,
}: CreatorRespondModalProps) {
    const [responseText, setResponseText] = useState("");
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setResponseText("");
            setMediaFile(null);
            setMediaPreview(null);
            setUploading(false);
            setSubmitting(false);
            setDone(false);
        }
    }, [isOpen]);

    // Generate preview URL for selected file
    useEffect(() => {
        if (!mediaFile) {
            setMediaPreview(null);
            return;
        }
        const url = URL.createObjectURL(mediaFile);
        setMediaPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [mediaFile]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 100MB)
            if (file.size > 104857600) {
                toast.error("File too large. Max 100MB.");
                return;
            }
            setMediaFile(file);
        }
    };

    const removeFile = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async () => {
        if (!responseText.trim() && !mediaFile) {
            toast.error("Please add a response text or media file.");
            return;
        }
        setSubmitting(true);

        try {
            let mediaUrl: string | null = null;

            // Upload media if present
            if (mediaFile) {
                setUploading(true);
                const formData = new FormData();
                formData.append("file", mediaFile);
                formData.append("folder", "suga4u-responses");

                const uploadRes = await fetch("/api/v1/storage/upload", {
                    method: "POST",
                    body: formData,
                });
                const uploadData = await uploadRes.json();

                if (!uploadData.success) {
                    toast.error("Failed to upload media: " + (uploadData.error || "Unknown error"));
                    setUploading(false);
                    setSubmitting(false);
                    return;
                }
                mediaUrl = uploadData.publicUrl;
                setUploading(false);
            }

            await onSubmit(responseText.trim(), mediaUrl);
            setDone(true);
            toast.success("Response sent to fan! 🎉");
            setTimeout(() => {
                setDone(false);
                setSubmitting(false);
                onClose();
            }, 1200);
        } catch (err) {
            console.error("Failed to submit response:", err);
            toast.error("Failed to submit response");
            setSubmitting(false);
            setUploading(false);
        }
    };

    const isVideo = mediaFile?.type?.startsWith("video/");
    const isImage = mediaFile?.type?.startsWith("image/");

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm"
                onClick={() => !submitting && onClose()}
            />

            {/* Modal */}
            <div className="relative z-20 w-full max-w-lg mx-4 rounded-2xl border border-pink-500/20 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(236,72,153,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Decorative glows */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="relative flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
                    <div>
                        <h3 className="text-base font-bold text-white">Respond to Request</h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                            Accept & send your response to the fan
                        </p>
                    </div>
                    <button
                        onClick={() => !submitting && onClose()}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="relative px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Fan's Request Info */}
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-white/50 font-medium">From: <span className="text-pink-400 font-semibold">{fanName}</span></span>
                            <span className="text-xs font-bold text-emerald-400">${price}</span>
                        </div>
                        <p className="text-sm text-white/80 font-medium mb-1">{requestLabel}</p>
                        {customText && (
                            <div className="mt-2 bg-black/30 rounded-lg px-3 py-2 border-l-2 border-pink-500/40">
                                <p className="text-[10px] text-pink-400/60 uppercase tracking-wider mb-1">Fan&apos;s Request</p>
                                <p className="text-xs text-white/70 italic">&quot;{customText}&quot;</p>
                            </div>
                        )}
                    </div>

                    {/* Response Text */}
                    <div>
                        <label className="text-xs text-white/50 font-medium mb-1.5 flex items-center gap-1">
                            <Send size={11} className="text-emerald-400" />
                            Your Response
                        </label>
                        <textarea
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Type your response message to the fan..."
                            rows={3}
                            maxLength={1000}
                            className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-all"
                        />
                        <p className="text-[10px] text-white/30 text-right mt-1">{responseText.length}/1000</p>
                    </div>

                    {/* Media Upload */}
                    <div>
                        <label className="text-xs text-white/50 font-medium mb-1.5 flex items-center gap-1">
                            <Paperclip size={11} className="text-pink-400" />
                            Attach Media <span className="text-white/25">(optional)</span>
                        </label>

                        {!mediaFile ? (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-white/10 hover:border-pink-500/30 rounded-xl p-6 text-center transition-all group hover:bg-white/[0.02]"
                            >
                                <Upload size={24} className="mx-auto mb-2 text-white/20 group-hover:text-pink-400/50 transition-colors" />
                                <p className="text-xs text-white/40 group-hover:text-white/50 transition-colors">Click to upload image or video</p>
                                <p className="text-[10px] text-white/20 mt-1">Max 100MB</p>
                            </button>
                        ) : (
                            <div className="relative rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                                {/* Preview */}
                                {isImage && mediaPreview && (
                                    <img src={mediaPreview} alt="Preview" className="w-full h-32 object-cover" />
                                )}
                                {isVideo && mediaPreview && (
                                    <video src={mediaPreview} className="w-full h-32 object-cover" controls />
                                )}
                                {!isImage && !isVideo && (
                                    <div className="w-full h-20 flex items-center justify-center bg-white/5">
                                        <FileVideo size={24} className="text-white/30" />
                                    </div>
                                )}

                                {/* File info + remove */}
                                <div className="flex items-center justify-between p-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {isImage ? <Image size={14} className="text-pink-400 shrink-0" /> : <FileVideo size={14} className="text-pink-400 shrink-0" />}
                                        <span className="text-xs text-white/60 truncate">{mediaFile.name}</span>
                                        <span className="text-[10px] text-white/30 shrink-0">({(mediaFile.size / 1024 / 1024).toFixed(1)}MB)</span>
                                    </div>
                                    <button
                                        onClick={removeFile}
                                        className="p-1 rounded-md hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="relative px-5 pb-5 pt-2 flex gap-3 border-t border-white/5">
                    <button
                        onClick={() => !submitting && onClose()}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (!responseText.trim() && !mediaFile)}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 ${done
                                ? "bg-emerald-600 text-white"
                                : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110 shadow-lg shadow-emerald-900/30"
                            }`}
                    >
                        {done ? (
                            <>
                                <CheckCircle2 size={16} /> Sent!
                            </>
                        ) : uploading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Uploading...
                            </>
                        ) : submitting ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                <Send size={14} /> Accept & Send Response
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
