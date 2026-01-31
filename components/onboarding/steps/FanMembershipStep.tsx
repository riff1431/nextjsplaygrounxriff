"use client";

import React, { useState, useEffect } from "react";
import { Crown, Check, CreditCard } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import OnboardingPaymentModal from "../OnboardingPaymentModal";

interface MembershipPlan {
    id: string;
    name: string;
    display_name: string;
    price: number;
    badge_color: string;
    features: string[];
    description: string | null;
}

interface Props {
    onComplete: () => void;
}

const PLAN_ICONS: Record<string, string> = {
    bronze: "🥉",
    silver: "🥈",
    gold: "🥇",
};

export default function FanMembershipStep({ onComplete }: Props) {
    const supabase = createClient();
    const { user } = useAuth();
    const [plans, setPlans] = useState<MembershipPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        const { data, error } = await supabase
            .from("fan_membership_plans")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            toast.error("Failed to load membership plans");
            console.error(error);
        } else {
            setPlans(data || []);
        }
        setLoading(false);
    };

    const handleSelectPlan = (plan: MembershipPlan) => {
        setSelectedPlan(plan);
    };

    const handleContinue = async () => {
        if (!selectedPlan || !user) return;

        // If it's a paid plan, show payment modal
        if (selectedPlan.price > 0) {
            setShowPaymentModal(true);
            return;
        }

        // Free plan - save directly
        await saveMembership();
    };

    const saveMembership = async () => {
        if (!selectedPlan || !user) return;

        setSaving(true);
        const { error } = await supabase
            .from("profiles")
            .update({
                fan_membership_id: selectedPlan.id,
                onboarding_completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) {
            toast.error("Failed to save membership");
            console.error(error);
        } else {
            toast.success(`Welcome to ${selectedPlan.display_name} membership!`);
            onComplete();
        }
        setSaving(false);
    };

    const handlePaymentSuccess = async () => {
        setShowPaymentModal(false);
        await saveMembership();
    };

    const handlePaymentCancel = () => {
        setShowPaymentModal(false);
    };

    if (loading) {
        return (
            <div className="text-center py-20">
                <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 mt-4">Loading membership plans...</p>
            </div>
        );
    }

    return (
        <>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Step Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-sm mb-4">
                        <Crown className="w-4 h-4" />
                        Step 2 of 2
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Choose Your Membership</h2>
                    <p className="text-gray-400">
                        Select a plan that fits your style
                    </p>
                </div>

                {/* Membership Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {plans.map((plan) => (
                        <button
                            key={plan.id}
                            onClick={() => handleSelectPlan(plan)}
                            className={`relative p-6 rounded-3xl border-2 transition-all duration-300 text-left ${selectedPlan?.id === plan.id
                                    ? "border-pink-500 bg-gradient-to-br from-pink-500/10 to-purple-500/10 scale-[1.02]"
                                    : "border-white/10 bg-black/40 hover:border-white/20"
                                }`}
                        >
                            {/* Popular badge for Gold */}
                            {plan.name === "gold" && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-xs font-bold text-black">
                                    MOST POPULAR
                                </div>
                            )}

                            {/* Selection indicator */}
                            {selectedPlan?.id === plan.id && (
                                <div className="absolute top-4 right-4 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            )}

                            {/* Icon */}
                            <div className="text-4xl mb-4">
                                {PLAN_ICONS[plan.name] || "⭐"}
                            </div>

                            {/* Badge Preview */}
                            <div
                                className="inline-flex px-3 py-1 rounded-full text-xs font-bold mb-3"
                                style={{
                                    backgroundColor: `${plan.badge_color}20`,
                                    color: plan.badge_color,
                                    border: `1px solid ${plan.badge_color}40`,
                                }}
                            >
                                {plan.display_name}
                            </div>

                            {/* Price */}
                            <div className="mb-4">
                                {plan.price === 0 ? (
                                    <span className="text-3xl font-bold text-green-400">Free</span>
                                ) : (
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-white">
                                            ${plan.price}
                                        </span>
                                        <span className="text-gray-400 text-sm">/month</span>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            {plan.description && (
                                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                            )}

                            {/* Features */}
                            <div className="space-y-2">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                        <div
                                            className="w-4 h-4 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: `${plan.badge_color}30` }}
                                        >
                                            <Check
                                                className="w-2.5 h-2.5"
                                                style={{ color: plan.badge_color }}
                                            />
                                        </div>
                                        <span className="text-gray-300">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Continue Button */}
                <div className="mt-10 text-center">
                    <button
                        onClick={handleContinue}
                        disabled={!selectedPlan || saving}
                        className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${selectedPlan
                                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/25"
                                : "bg-gray-800 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : selectedPlan?.price && selectedPlan.price > 0 ? (
                            <span className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Pay ${selectedPlan.price} & Continue
                            </span>
                        ) : (
                            "Get Started Free →"
                        )}
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedPlan && (
                <OnboardingPaymentModal
                    amount={selectedPlan.price}
                    planName={selectedPlan.display_name}
                    planType="membership"
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                />
            )}
        </>
    );
}
