"use client";

import { Crown, Lock, Loader2, Check, AlertCircle, Upload, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CreatePostModal from "@/components/posts/CreatePostModal";

interface CsSubscriptionSettingsProps {
    weeklyPrice: number | null;
    monthlyPrice: number | null;
    userId: string | null;
    onSave: (weekly: string, monthly: string) => Promise<boolean>;
}

/* ── Upload Content Box ── */
const CsUploadContentBox = ({ userId }: { userId: string | null }) => {
    return (
        <div className="cs-glass-card p-5 flex-1 min-w-0 flex flex-col">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2 text-white">
                <Upload size={20} className="text-cyan-400" /> Upload Content
            </h2>
            <p className="text-xs text-white/50 mb-5">
                Share exclusive photos, videos, and posts that only your subscribers can access.
            </p>

            {/* Big CTA button — opens CreatePostModal */}
            <CreatePostModal
                currentUserId={userId}
                onPostCreated={() => {}}
                trigger={
                    <button
                        className="mt-auto w-full group relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 hover:from-cyan-500/20 hover:to-purple-500/20 hover:border-cyan-400/60 transition-all duration-300 py-5 px-6 flex items-center justify-center gap-3"
                    >
                        {/* Glow pulse behind icon */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl" />
                        </div>
                        <div className="relative w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Upload size={20} className="text-cyan-400" />
                        </div>
                        <div className="relative text-left">
                            <span className="text-base font-semibold text-white block leading-tight">Upload New Content</span>
                            <span className="text-[11px] text-white/40">Photos, Videos & Posts</span>
                        </div>
                        <ArrowUpRight size={18} className="relative text-white/30 group-hover:text-cyan-400 ml-auto transition-colors duration-300" />
                    </button>
                }
            />
        </div>
    );
};

/* ── Subscription Settings Box ── */
const CsSubscriptionBox = ({ weeklyPrice, monthlyPrice, onSave }: CsSubscriptionSettingsProps) => {
    const [weekly, setWeekly] = useState("");
    const [monthly, setMonthly] = useState("");
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<"success" | "error" | null>(null);

    // Sync initial values from props
    useEffect(() => {
        setWeekly(weeklyPrice != null ? String(weeklyPrice) : "");
        setMonthly(monthlyPrice != null ? String(monthlyPrice) : "");
    }, [weeklyPrice, monthlyPrice]);

    const handleSave = async () => {
        setSaving(true);
        setFeedback(null);
        const ok = await onSave(weekly, monthly);
        setFeedback(ok ? "success" : "error");
        setSaving(false);
        if (ok) {
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    return (
        <div className="cs-glass-card p-5 flex-1 min-w-0 flex flex-col">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2 text-white">
                <Crown size={20} className="text-[hsl(45,100%,55%)]" /> Subscription Settings
            </h2>
            <p className="text-xs text-white/50 mb-4">
                Set your subscription prices. Fans can subscribe to unlock access to all your paid content. Leave blank to disable a tier.
            </p>
            <div className="flex flex-col gap-4 flex-1">
                <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                        <label className="text-sm font-medium mb-1.5 block text-white">Weekly Price ($)</label>
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                            <span className="text-white/40 mr-2">€</span>
                            <input
                                type="text"
                                placeholder="e.g. 4.99"
                                value={weekly}
                                onChange={(e) => setWeekly(e.target.value)}
                                className="bg-transparent outline-none w-full text-white placeholder:text-white/30"
                            />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <label className="text-sm font-medium mb-1.5 block text-white">Monthly Price ($)</label>
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                            <span className="text-white/40 mr-2">€</span>
                            <input
                                type="text"
                                placeholder="e.g. 14.99"
                                value={monthly}
                                onChange={(e) => setMonthly(e.target.value)}
                                className="bg-transparent outline-none w-full text-white placeholder:text-white/30"
                            />
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="cs-neon-glow-green bg-[hsl(150,80%,45%)] text-white font-semibold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all whitespace-nowrap disabled:opacity-60 mt-auto"
                >
                    {saving ? (
                        <><Loader2 size={16} className="animate-spin" /> Saving...</>
                    ) : feedback === "success" ? (
                        <><Check size={16} /> Saved!</>
                    ) : feedback === "error" ? (
                        <><AlertCircle size={16} /> Error</>
                    ) : (
                        <><Lock size={16} /> Save Changes</>
                    )}
                </button>
            </div>
        </div>
    );
};

/* ── Combined Row: Upload Content | Subscription Settings ── */
export const CsSubscriptionSettings = ({ weeklyPrice, monthlyPrice, userId, onSave }: CsSubscriptionSettingsProps) => {
    return (
        <div className="flex flex-col md:flex-row gap-4">
            <CsUploadContentBox userId={userId} />
            <CsSubscriptionBox
                weeklyPrice={weeklyPrice}
                monthlyPrice={monthlyPrice}
                userId={userId}
                onSave={onSave}
            />
        </div>
    );
};
