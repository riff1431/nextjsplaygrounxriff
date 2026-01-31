"use client";

import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

interface AccountType {
    id: string;
    name: string;
    display_name: string;
    badge_icon_url: string | null;
    badge_color: string;
    description: string | null;
}

interface Props {
    onComplete: () => void;
}

export default function AccountTypeStep({ onComplete }: Props) {
    const supabase = createClient();
    const { user } = useAuth();
    const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAccountTypes();
    }, []);

    const fetchAccountTypes = async () => {
        const { data, error } = await supabase
            .from("account_types")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            toast.error("Failed to load account types");
            console.error(error);
        } else {
            setAccountTypes(data || []);
        }
        setLoading(false);
    };

    const handleContinue = async () => {
        if (!selectedType || !user) return;

        setSaving(true);
        const { error } = await supabase
            .from("profiles")
            .update({
                account_type_id: selectedType,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) {
            toast.error("Failed to save selection");
            console.error(error);
        } else {
            toast.success("Account type selected!");
            onComplete();
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="text-center py-20">
                <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 mt-4">Loading options...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Step Title */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-400 text-sm mb-4">
                    <Sparkles className="w-4 h-4" />
                    Step 1 of 2
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Choose Your Identity</h2>
                <p className="text-gray-400">
                    How would you like to be known on the platform?
                </p>
            </div>

            {/* Account Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {accountTypes.map((type) => (
                    <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`relative p-8 rounded-3xl border-2 transition-all duration-300 text-left group ${selectedType === type.id
                                ? "border-pink-500 bg-gradient-to-br from-pink-500/20 to-purple-500/20 scale-[1.02]"
                                : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60"
                            }`}
                    >
                        {/* Selection indicator */}
                        {selectedType === type.id && (
                            <div className="absolute top-4 right-4 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}

                        {/* Icon/Badge */}
                        <div
                            className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center text-3xl"
                            style={{ backgroundColor: `${type.badge_color}20` }}
                        >
                            {type.name === "sugar_daddy" ? "🤴" : "👸"}
                        </div>

                        {/* Badge Preview */}
                        <div className="flex items-center gap-2 mb-3">
                            <span
                                className="px-3 py-1 rounded-full text-xs font-bold"
                                style={{
                                    backgroundColor: `${type.badge_color}20`,
                                    color: type.badge_color,
                                    border: `1px solid ${type.badge_color}40`,
                                }}
                            >
                                {type.display_name}
                            </span>
                            <span className="text-xs text-gray-500">← Your badge</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-white mb-2">{type.display_name}</h3>

                        {/* Description */}
                        <p className="text-gray-400 text-sm">
                            {type.description || "Join as a generous supporter of amazing creators"}
                        </p>
                    </button>
                ))}
            </div>

            {/* Continue Button */}
            <div className="mt-10 text-center">
                <button
                    onClick={handleContinue}
                    disabled={!selectedType || saving}
                    className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${selectedType
                            ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/25"
                            : "bg-gray-800 text-gray-500 cursor-not-allowed"
                        }`}
                >
                    {saving ? (
                        <span className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                        </span>
                    ) : (
                        "Continue →"
                    )}
                </button>
            </div>
        </div>
    );
}
