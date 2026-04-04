"use client";

import React, { useState } from "react";
import { X, AlertTriangle, ShieldCheck, Flag, Loader2 } from "lucide-react";

export interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetId: string;
    targetType: 'profile' | 'room' | 'post';
    targetName?: string;
}

export default function ReportModal({ isOpen, onClose, targetId, targetType, targetName }: ReportModalProps) {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    if (!isOpen) return null;

    const reasons = [
        "Spam or misleading",
        "Harassment or bullying",
        "Hate speech or symbols",
        "Underage content",
        "Violence or dangerous organizations",
        "Non-consensual content",
        "Other"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) return;

        setIsSubmitting(true);
        // Simulate API call to backend moderation system
        await new Promise((resolve) => setTimeout(resolve, 800));
        setIsSubmitting(false);
        setIsSubmitted(true);

        // Normally we'd post to a 'reports' table in Supabase
        // await supabase.from('reports').insert({ target_id: targetId, target_type: targetType, reason, details })
    };

    const handleClose = () => {
        setReason("");
        setDetails("");
        setIsSubmitted(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="bg-[#0a0a0a] border border-red-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)] relative">
                
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Flag className="w-5 h-5 text-red-500" />
                        Report Content
                    </h2>
                    <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6">
                    {isSubmitted ? (
                        <div className="text-center space-y-4 py-8">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                                <ShieldCheck className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Report Submitted</h3>
                                <p className="text-sm text-gray-400">
                                    Thank you for keeping PlayGroundX safe. Our moderation team will review this report against our <a href="/content-moderation" className="text-cyan-400 hover:underline">Content Moderation Policy</a>.
                                </p>
                            </div>
                            <button 
                                onClick={handleClose}
                                className="mt-4 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="text-sm text-gray-400">
                                You are reporting a <span className="font-bold text-gray-200">{targetType}</span> 
                                {targetName && <span> ({targetName})</span>}.
                                Your report will be kept confidential.
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Select a reason</label>
                                <div className="space-y-2">
                                    {reasons.map((r) => (
                                        <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${reason === r ? 'bg-red-500/10 border-red-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                            <div className={`w-4 h-4 rounded-full border-2 flex flex-shrink-0 items-center justify-center ${reason === r ? 'border-red-500' : 'border-gray-500'}`}>
                                                {reason === r && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                            </div>
                                            <span className={`text-sm ${reason === r ? 'text-red-300 font-medium' : 'text-gray-300'}`}>{r}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Additional Details (Optional)</label>
                                <textarea 
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Provide any additional context..."
                                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 resize-none transition"
                                />
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                <p className="text-xs text-yellow-200/80 leading-relaxed">
                                    If you are in immediate danger or suspect a severe emergency, please contact your local law enforcement directly.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-semibold transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!reason || isSubmitting}
                                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition flex items-center justify-center gap-2 min-w-[120px]"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Report"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
