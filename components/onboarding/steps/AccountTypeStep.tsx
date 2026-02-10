"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Check, ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import OnboardingPaymentModal from "../OnboardingPaymentModal";

interface AccountType {
    id: string;
    name: string;
    display_name: string;
    badge_icon: string | null;
    badge_icon_url: string | null;
    badge_color: string;
    description: string | null;
    price: number;
    billing_type: "one_time" | "recurring";
    features: string[] | null;
}

interface Props {
    onComplete: () => void;
    onBack?: () => void;
}

export default function AccountTypeStep({ onComplete, onBack }: Props) {
    const supabase = createClient();
    const { user } = useAuth();
    const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPaidType, setSelectedPaidType] = useState<AccountType | null>(null);

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

    const handleTypeSelect = (type: AccountType) => {
        if (type.price > 0) {
            // Paid type - show payment modal with all gateways
            setSelectedPaidType(type);
            setShowPaymentModal(true);
        } else {
            // Free type - just select it
            setSelectedType(type.id);
        }
    };

    const handleSkip = async () => {
        if (!user) return;
        setSaving(true);

        // Set account_type_skipped to true (explicitly skipped)
        const { error } = await supabase
            .from("profiles")
            .update({
                account_type_id: null,
                account_type_skipped: true,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) {
            toast.error("Failed to save");
            console.error(error);
        } else {
            toast.success("Moving to next step!");
            onComplete();
        }
        setSaving(false);
    };

    const handleContinueWithFree = async () => {
        if (!selectedType || !user) return;

        setSaving(true);
        const { error } = await supabase
            .from("profiles")
            .update({
                account_type_id: selectedType,
                account_type_skipped: false,
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

    const handlePaymentSuccess = async () => {
        if (!selectedPaidType || !user) return;

        // Save the account type selection after successful payment
        const { error } = await supabase
            .from("profiles")
            .update({
                account_type_id: selectedPaidType.id,
                account_type_skipped: false,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) {
            toast.error("Failed to save selection");
            console.error(error);
        } else {
            toast.success(`Welcome, ${selectedPaidType.display_name}! 🎉`);
            setShowPaymentModal(false);
            onComplete();
        }
    };

    const handlePaymentCancel = () => {
        setShowPaymentModal(false);
        setSelectedPaidType(null);
    };

    // Check if selected type is free
    const selectedTypeData = accountTypes.find(t => t.id === selectedType);
    const isFreeSelected = selectedTypeData && selectedTypeData.price === 0;

    if (loading) {
        return (
            <div className="text-center py-20">
                <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 mt-4">Loading options...</p>
            </div>
        );
    }

    return (
        <>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Back Button */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                )}

                {/* Step Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-400 text-sm mb-4">
                        <Sparkles className="w-4 h-4" />
                        Step 1 of 2
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Choose Your Identity</h2>
                    <p className="text-gray-400">
                        Become a Sugar Daddy or Sugar Mommy for premium perks, or skip to continue as a regular fan
                    </p>
                </div>

                {/* Account Type Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {accountTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => handleTypeSelect(type)}
                            className={`relative p-8 rounded-3xl border-2 transition-all duration-300 text-left group ${selectedType === type.id
                                ? "border-pink-500 bg-gradient-to-br from-pink-500/20 to-purple-500/20 scale-[1.02]"
                                : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60"
                                }`}
                        >
                            {/* Selection indicator */}
                            {selectedType === type.id && (
                                <div className="absolute top-4 right-4 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            )}

                            {/* Price Tag */}
                            {type.price > 0 && (
                                <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs font-bold text-white shadow-lg">
                                    ${type.price}{type.billing_type === "recurring" ? "/mo" : ""}
                                </div>
                            )}

                            {/* Icon/Badge */}
                            <div
                                className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center text-3xl"
                                style={{ backgroundColor: `${type.badge_color}20` }}
                            >
                                {type.badge_icon || (type.name === "sugar_daddy" ? "🤴" : "👸")}
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
                            <p className="text-gray-400 text-sm mb-4">
                                {type.description || "Join as a generous supporter of amazing creators"}
                            </p>

                            {/* Features */}
                            {type.features && type.features.length > 0 && (
                                <div className="space-y-1.5">
                                    {type.features.slice(0, 4).map((feature, i) => (
                                        <div key={i} className="text-xs text-gray-500 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: type.badge_color }} />
                                            {feature}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Price callout */}
                            {type.price > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-white">${type.price}</span>
                                        <span className="text-xs text-gray-400">
                                            {type.billing_type === "recurring" ? "/month" : " one-time"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="mt-10 flex flex-col items-center gap-4">
                    {/* Continue Button (only for free selected) */}
                    {selectedType && isFreeSelected && (
                        <button
                            onClick={handleContinueWithFree}
                            disabled={saving}
                            className="px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/25"
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
                    )}

                    {/* Skip Button */}
                    <button
                        onClick={handleSkip}
                        disabled={saving}
                        className="text-gray-500 hover:text-gray-300 text-sm underline underline-offset-4 transition-colors"
                    >
                        Skip for now (continue as regular fan)
                    </button>
                </div>
            </div>

            {/* Payment Modal with All Active Gateways */}
            {showPaymentModal && selectedPaidType && (
                <OnboardingPaymentModal
                    amount={selectedPaidType.price}
                    planName={selectedPaidType.display_name}
                    planType="account_type"
                    planId={selectedPaidType.id}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                    onBankPending={onComplete}
                />
            )}
        </>
    );
}
