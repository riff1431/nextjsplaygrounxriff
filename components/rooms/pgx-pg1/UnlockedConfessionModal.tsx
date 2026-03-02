"use client";

import { X, FileText, Mic, Video, Download } from "lucide-react";

interface Confession {
    id: string;
    title: string;
    teaser: string;
    content: string | null;
    media_url: string | null;
    type: string;
    tier: string;
    price: number;
}

interface UnlockedConfessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    confession: Confession | null;
}

export default function UnlockedConfessionModal({ isOpen, onClose, confession }: UnlockedConfessionModalProps) {
    if (!isOpen || !confession) return null;

    const typeIcon = confession.type === "Audio" ? Mic : confession.type === "Video" ? Video : FileText;
    const TypeIcon = typeIcon;

    const tierEmoji: Record<string, string> = {
        Soft: "💋",
        Spicy: "🔥",
        Dirty: "🖤",
        Dark: "💀",
        Forbidden: "😈",
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
                            <h3 className="text-base font-bold text-white">{confession.title}</h3>
                            <p className="text-xs text-white/50">
                                {tierEmoji[confession.tier] || "💋"} {confession.tier} • {confession.type}
                            </p>
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
                    {/* Content */}
                    {confession.content && (
                        <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4">
                            <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{confession.content}</p>
                        </div>
                    )}

                    {/* Media */}
                    {confession.media_url && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            {confession.type === "Video" ? (
                                <video
                                    src={confession.media_url}
                                    controls
                                    className="w-full rounded-lg max-h-64"
                                />
                            ) : confession.type === "Audio" ? (
                                <audio
                                    src={confession.media_url}
                                    controls
                                    className="w-full"
                                />
                            ) : (
                                <a
                                    href={confession.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300 transition-colors"
                                >
                                    <Download size={14} /> View Attachment
                                </a>
                            )}
                        </div>
                    )}

                    {!confession.content && !confession.media_url && (
                        <div className="text-center py-8 text-white/40">
                            <p>No content available</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 pt-2 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-pink-900/30"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
