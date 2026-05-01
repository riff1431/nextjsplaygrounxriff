"use client";

import { useState, useRef } from "react";
import { X, Send, Loader2, FileText, Mic, Video, Upload, User, Lock, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadToLocalServer } from "@/utils/uploadHelper";

interface RequestInfo {
    id: string;
    room_id: string;
    fan_name: string;
    is_anonymous: boolean;
    type: string;
    topic: string;
    amount: number;
    status: string;
}

interface CreatorDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: RequestInfo | null;
    onDelivered: () => void;
}

export default function CreatorDeliveryModal({ isOpen, onClose, request, onDelivered }: CreatorDeliveryModalProps) {
    const [deliveryText, setDeliveryText] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen || !request) return null;

    const typeIcon = request.type === "Audio" ? Mic : request.type === "Video" ? Video : request.type === "Image" ? ImageIcon : FileText;
    const TypeIcon = typeIcon;

    const handleDeliver = async () => {
        if (!deliveryText.trim() && !selectedFile) {
            toast.error("Please provide delivery content or attach a media file");
            return;
        }

        setLoading(true);
        let finalMediaUrl = "";

        if (selectedFile) {
            toast.loading("Uploading media file...", { id: "upload-toast" });
            try {
                finalMediaUrl = await uploadToLocalServer(selectedFile, "confessions");
                toast.success("Upload complete!", { id: "upload-toast" });
            } catch (err) {
                toast.error("Failed to upload media", { id: "upload-toast" });
                setLoading(false);
                return;
            }
        }

        try {
            const res = await fetch(`/api/v1/rooms/${request.room_id}/confessions/request/${request.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "delivered",
                    deliveryContent: deliveryText.trim() || undefined,
                    delivery_media_url: finalMediaUrl || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Confession delivered! 🎉");
                setDeliveryText("");
                setSelectedFile(null);
                onDelivered();
                onClose();
            } else {
                toast.error(data.error || "Failed to deliver");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-pink-500/20">
                            <TypeIcon size={20} className="text-pink-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Deliver Confession</h3>
                            <p className="text-xs text-white/50">{request.type} Request</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Request Info */}
                    <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {request.is_anonymous ? (
                                    <Lock size={14} className="text-pink-400" />
                                ) : (
                                    <User size={14} className="text-pink-400" />
                                )}
                                <span className="text-sm text-white font-medium">
                                    {request.is_anonymous ? "Anonymous" : request.fan_name}
                                </span>
                            </div>
                            <span className="text-emerald-400 font-bold text-sm">€{request.amount}</span>
                        </div>
                        <p className="text-xs text-white/50">Topic</p>
                        <p className="text-sm text-white">{request.topic}</p>
                    </div>

                    {/* Delivery Content */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/60 font-medium">Your Response</label>
                        <textarea
                            value={deliveryText}
                            onChange={(e) => setDeliveryText(e.target.value)}
                            placeholder="Write your confession response here..."
                            className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all resize-none h-32"
                        />
                    </div>

                    {/* Media File Attachment */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/60 font-medium flex items-center gap-1">
                            <Upload size={12} /> Attach Media File
                        </label>
                        
                        {selectedFile ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="p-2 bg-pink-500/20 rounded-lg shrink-0">
                                        <TypeIcon size={16} className="text-pink-400" />
                                    </div>
                                    <span className="text-sm text-white truncate">{selectedFile.name}</span>
                                </div>
                                <button 
                                    onClick={() => setSelectedFile(null)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors shrink-0"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setSelectedFile(e.target.files[0]);
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept={request.type === 'Video' ? 'video/*' : request.type === 'Audio' ? 'audio/*' : request.type === 'Image' ? 'image/*' : '*/*'}
                                />
                                <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-pink-500/50 hover:bg-white/10 transition-all">
                                    <Upload size={24} className="text-white/40 mb-2" />
                                    <span className="text-sm text-white/70 font-medium">Click to browse or drag & drop</span>
                                    <span className="text-xs text-white/40 mt-1">Upload {request.type} file for the confession</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 pt-2 flex gap-3 border-t border-white/10">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDeliver}
                        disabled={loading || (!deliveryText.trim() && !selectedFile)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-pink-900/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Deliver
                    </button>
                </div>
            </div>
        </div>
    );
}
