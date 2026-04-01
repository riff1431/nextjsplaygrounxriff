"use client";

import React, { useState } from "react";
import { ArrowLeft, MessageSquare, Send, Heart, Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth, ProtectRoute } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function SuggestionsPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const supabase = createClient();

    const [suggestion, setSuggestion] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!suggestion.trim() || !user) return;

        setIsSubmitting(true);
        setErrorMsg("");

        try {
            const { error } = await supabase
                .from("platform_suggestions")
                .insert([
                    {
                        user_id: user.id,
                        content: suggestion.trim(),
                        status: "pending"
                    }
                ]);

            if (error) {
                console.error("Submit error:", error);
                setErrorMsg("Failed to submit. Please try again later.");
            } else {
                setIsSuccess(true);
                setSuggestion("");
                // Auto reset success message after a few seconds
                setTimeout(() => setIsSuccess(false), 5000);
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            setErrorMsg("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) return null;

    return (
        <ProtectRoute>
            <div className="min-h-screen bg-black text-white relative">
                {/* ── Background Glow ── */}
                <div className="pointer-events-none fixed inset-0 opacity-40">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[120px] bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.15),transparent_70%)]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] blur-[140px] bg-[radial-gradient(ellipse_at_center,rgba(0,230,255,0.1),transparent_60%)]" />
                </div>

                <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">
                    <button
                        onClick={() => router.back()}
                        className="mb-6 flex items-center gap-2 text-pink-300 hover:text-pink-200 transition bg-pink-500/10 hover:bg-pink-500/20 px-3 py-1.5 rounded-full text-sm font-medium border border-pink-500/30"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <div className="rounded-3xl bg-black/60 border border-white/10 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)] relative overflow-hidden">
                        {/* Decorative Top Gradient */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-500" />

                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-pink-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">Platform Suggestions</h1>
                                <p className="text-white/40 text-sm mt-1">Help us improve the platform for everyone.</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            {isSuccess ? (
                                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center animate-in fade-in zoom-in duration-300">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-emerald-300 mb-2">Thank you!</h3>
                                    <p className="text-sm text-emerald-200/70">Your suggestion has been submitted successfully to the admin team.</p>
                                    <button 
                                        onClick={() => setIsSuccess(false)}
                                        className="mt-6 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-medium transition"
                                    >
                                        Submit Another
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                                            What would you like to suggest?
                                        </label>
                                        <textarea
                                            value={suggestion}
                                            onChange={(e) => setSuggestion(e.target.value)}
                                            placeholder="I would love to see a feature that..."
                                            className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition resize-none custom-scrollbar"
                                            required
                                            maxLength={1000}
                                        />
                                        <div className="flex justify-between items-center text-xs text-white/30 px-1">
                                            <span>We read every single suggestion. <Heart className="inline w-3 h-3 text-pink-500" /></span>
                                            <span>{suggestion.length}/1000</span>
                                        </div>
                                    </div>

                                    {errorMsg && (
                                        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                            {errorMsg}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !suggestion.trim()}
                                        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] border border-white/10"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" /> Submit Suggestion
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
}
