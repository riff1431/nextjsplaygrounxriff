"use client";

import { useState } from "react";
import { X, Download, CheckCircle2, XCircle, Loader2, FileText, Mic, Video, Eye } from "lucide-react";
import { toast } from "sonner";

interface ConfessionRequest {
    id: string;
    room_id: string;
    type: string;
    topic: string;
    amount: number;
    status: string;
    delivery_content?: string;
    delivery_media_url?: string;
    fan_name?: string;
    is_anonymous?: boolean;
    created_at: string;
}

interface FanDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: ConfessionRequest | null;
    onAction: () => void;
}

export default function FanDeliveryModal({ isOpen, onClose, request, onAction }: FanDeliveryModalProps) {
    const [loading, setLoading] = useState(false);

    if (!isOpen || !request) return null;

    const handleAction = async (status: "completed" | "rejected") => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/rooms/${request.room_id}/confessions/request/${request.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(status === "completed" ? "Delivery accepted! 🎉" : "Delivery declined");
                onAction();
                onClose();
            } else {
                toast.error(data.error || "Failed to update");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const typeIcon = request.type === "Audio" ? Mic : request.type === "Video" ? Video : FileText;
    const TypeIcon = typeIcon;

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
                            <h3 className="text-base font-bold text-white">Confession Delivery</h3>
                            <p className="text-xs text-white/50">{request.type} • ${request.amount}</p>
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
                    {/* Your Request */}
                    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                        <p className="text-xs text-white/50 mb-1">Your Request</p>
                        <p className="text-sm text-white">{request.topic}</p>
                    </div>

                    {/* Delivered Content */}
                    {request.delivery_content && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                            <p className="text-xs text-emerald-400 mb-2 flex items-center gap-1">
                                <Eye size={12} /> Creator&apos;s Response
                            </p>
                            <p className="text-sm text-white whitespace-pre-wrap">{request.delivery_content}</p>
                        </div>
                    )}

                    {/* Media */}
                    {request.delivery_media_url && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs text-white/50 mb-2">Attached Media</p>
                            {request.type === "Video" ? (
                                <video
                                    src={request.delivery_media_url}
                                    controls
                                    className="w-full rounded-lg max-h-64"
                                />
                            ) : request.type === "Audio" ? (
                                <audio
                                    src={request.delivery_media_url}
                                    controls
                                    className="w-full"
                                />
                            ) : (
                                <a
                                    href={request.delivery_media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300 transition-colors"
                                >
                                    <Download size={14} /> Download Attachment
                                </a>
                            )}
                        </div>
                    )}

                    {!request.delivery_content && !request.delivery_media_url && (
                        <div className="text-center py-8 text-white/40">
                            <p>No delivery content yet</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {request.status === "delivered" && (
                    <div className="px-5 pb-5 pt-2 flex gap-3 border-t border-white/10">
                        <button
                            onClick={() => handleAction("rejected")}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <XCircle size={16} />
                            Decline
                        </button>
                        <button
                            onClick={() => handleAction("completed")}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-pink-900/30 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Accept Delivery
                        </button>
                    </div>
                )}

                {request.status === "completed" && (
                    <div className="px-5 pb-5 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium py-2">
                            <CheckCircle2 size={16} />
                            You accepted this delivery
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
