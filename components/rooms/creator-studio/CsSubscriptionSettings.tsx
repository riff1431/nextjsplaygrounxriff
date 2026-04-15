"use client";

import { Crown, Lock, Loader2, Check, AlertCircle, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CsSubscriptionSettingsProps {
    weeklyPrice: number | null;
    monthlyPrice: number | null;
    onSave: (weekly: string, monthly: string) => Promise<boolean>;
}

export const CsSubscriptionSettings = ({ weeklyPrice, monthlyPrice, onSave }: CsSubscriptionSettingsProps) => {
    const router = useRouter();
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
        <div className="cs-glass-card p-5">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2 text-white">
                <Crown size={20} className="text-[hsl(45,100%,55%)]" /> Subscription Settings
            </h2>
            <p className="text-xs text-white/50 mb-4">
                Set your subscription prices. Fans can subscribe to unlock access to all your paid content. Leave blank to disable a tier.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-sm font-medium mb-1.5 block text-white">Weekly Price ($)</label>
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                        <span className="text-white/40 mr-2">$</span>
                        <input
                            type="text"
                            placeholder="e.g. 4.99"
                            value={weekly}
                            onChange={(e) => setWeekly(e.target.value)}
                            className="bg-transparent outline-none w-full text-white placeholder:text-white/30"
                        />
                    </div>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-sm font-medium mb-1.5 block text-white">Monthly Price ($)</label>
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                        <span className="text-white/40 mr-2">$</span>
                        <input
                            type="text"
                            placeholder="e.g. 14.99"
                            value={monthly}
                            onChange={(e) => setMonthly(e.target.value)}
                            className="bg-transparent outline-none w-full text-white placeholder:text-white/30"
                        />
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="cs-neon-glow-green bg-[hsl(150,80%,45%)] text-white font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 hover:brightness-110 transition-all whitespace-nowrap disabled:opacity-60"
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
