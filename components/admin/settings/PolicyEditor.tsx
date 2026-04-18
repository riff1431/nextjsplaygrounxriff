"use client";

import React, { useEffect, useState } from "react";
import { FileText, Save, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { toast } from "sonner";

export default function PolicyEditor() {
    const supabase = createClient();
    const [terms, setTerms] = useState("");
    const [policy, setPolicy] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchPolicies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("admin_settings")
            .select("key, value")
            .in("key", ["terms_and_conditions", "privacy_policy"]);
        
        if (data) {
            const t = data.find(item => item.key === "terms_and_conditions");
            const p = data.find(item => item.key === "privacy_policy");
            if (t) setTerms(t.value || "");
            if (p) setPolicy(p.value || "");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Upsert Terms
            const { error: tError } = await supabase
                .from("admin_settings")
                .upsert({ key: "terms_and_conditions", value: terms }, { onConflict: "key" });
            
            // Upsert Policy
            const { error: pError } = await supabase
                .from("admin_settings")
                .upsert({ key: "privacy_policy", value: policy }, { onConflict: "key" });

            if (tError || pError) throw new Error("Failed to update settings");
            toast.success("Policies updated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save policies");
        } finally {
            setSaving(false);
        }
    };

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<FileText className="w-5 h-5 text-cyan-400" />}
                title="Legal & Policies"
                sub="Modify platform Terms & Conditions and Privacy Policy natively via Markdown or plain text."
                right={
                    <div className="flex gap-2">
                        <NeonButton variant="blue" onClick={fetchPolicies} disabled={loading || saving}>
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </NeonButton>
                        <NeonButton variant="green" onClick={handleSave} disabled={loading || saving}>
                            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Policies"}
                        </NeonButton>
                    </div>
                }
            />

            <div className="mt-8 space-y-8">
                {/* Terms and Conditions */}
                <div className="space-y-3">
                    <label className="text-lg font-bold text-gray-200">Terms & Conditions</label>
                    <p className="text-xs text-gray-500">Supports markdown formatting (## Headers, **Bold**, etc.)</p>
                    {loading ? (
                        <div className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl animate-pulse" />
                    ) : (
                        <textarea
                            value={terms}
                            onChange={(e) => setTerms(e.target.value)}
                            placeholder="Type the Terms and Conditions here..."
                            className="w-full h-80 bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition resize-y font-mono text-sm custom-scrollbar"
                            spellCheck={false}
                        />
                    )}
                </div>

                {/* Privacy Policy */}
                <div className="space-y-3 border-t border-white/5 pt-8">
                    <label className="text-lg font-bold text-gray-200">Privacy Policy</label>
                    {loading ? (
                        <div className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl animate-pulse" />
                    ) : (
                        <textarea
                            value={policy}
                            onChange={(e) => setPolicy(e.target.value)}
                            placeholder="Type the Privacy Policy here..."
                            className="w-full h-80 bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition resize-y font-mono text-sm custom-scrollbar"
                            spellCheck={false}
                        />
                    )}
                </div>
            </div>
        </NeonCard>
    );
}
