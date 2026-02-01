"use client";

import React, { useState, useEffect } from "react";
import { Check, Crown, CreditCard, ArrowLeft, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import OnboardingPaymentModal from "@/components/onboarding/OnboardingPaymentModal";

interface MembershipPlan {
    id: string;
    name: string;
    display_name: string;
    price: number;
    badge_color: string;
    features: string[];
    description: string | null;
}

const PLAN_ICONS: Record<string, string> = {
    bronze: "🥉",
    silver: "🥈",
    gold: "🥇",
};

export default function MembershipPage() {
    const supabase = createClient();
    const { user } = useAuth();
    const router = useRouter();

    const [plans, setPlans] = useState<MembershipPlan[]>([]);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    useEffect(() => {
        if (user) {
            Promise.all([fetchPlans(), fetchUserProfile()]).then(() => {
                setLoading(false);
            });
        }
    }, [user]);

    const fetchPlans = async () => {
        const { data, error } = await supabase
            .from("fan_membership_plans")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            console.error("Error fetching plans:", error);
            toast.error("Failed to load membership plans");
        } else {
            setPlans(data || []);
        }
    };

    const fetchUserProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from("profiles").select("fan_membership_id").eq("id", user.id).single();
        if (data) setCurrentPlanId(data.fan_membership_id);
    };

    const handleSelectPlan = (plan: MembershipPlan) => {
        if (currentPlanId === plan.id) return;
        setSelectedPlan(plan);
    };

    const handleUpgrade = async () => {
        if (!selectedPlan || !user) return;

        // If paid plan, show payment modal
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
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) {
            toast.error("Failed to update membership");
            console.error(error);
        } else {
            toast.success(`Welcome to ${selectedPlan.display_name} membership!`);
            setCurrentPlanId(selectedPlan.id);
            setSelectedPlan(null);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="fixed inset-0 bg-gradient-to-br from-pink-900/20 via-black to-purple-900/20 pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Choose Your Membership</h1>
                        <p className="text-gray-400 text-sm">Select a plan that fits your style</p>
                    </div>
                </div>

                {/* Membership Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const isCurrent = currentPlanId === plan.id;
                        const isSelected = selectedPlan?.id === plan.id;

                        return (
                            <button
                                key={plan.id}
                                onClick={() => handleSelectPlan(plan)}
                                disabled={isCurrent}
                                className={`relative p-6 rounded-3xl border-2 transition-all duration-300 text-left h-full flex flex-col ${isSelected
                                        ? "border-pink-500 bg-gradient-to-br from-pink-500/10 to-purple-500/10 scale-[1.02] shadow-lg shadow-pink-500/25"
                                        : isCurrent
                                            ? "border-green-500/50 bg-green-500/5 cursor-default"
                                            : "border-white/10 bg-black/40 hover:border-white/20"
                                    }`}
                            >
                                {/* Popular badge */}
                                {plan.name === "gold" && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-xs font-bold text-black z-10">
                                        MOST POPULAR
                                    </div>
                                )}

                                {isCurrent && (
                                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                                        <Check className="w-3 h-3" />
                                        Current
                                    </div>
                                )}

                                {isSelected && !isCurrent && (
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
                                    className="inline-flex px-3 py-1 rounded-full text-xs font-bold mb-3 w-fit"
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
                                <div className="space-y-2 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <div
                                                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `${plan.badge_color}30` }}
                                            >
                                                <Check className="w-2.5 h-2.5" style={{ color: plan.badge_color }} />
                                            </div>
                                            <span className="text-gray-300">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer Action */}
                <div className="mt-10 flex justify-center">
                    <button
                        onClick={handleUpgrade}
                        disabled={!selectedPlan || saving}
                        className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 min-w-[300px] ${selectedPlan
                                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/25"
                                : "bg-gray-800 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : selectedPlan?.price && selectedPlan.price > 0 ? (
                            <span className="flex items-center justify-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Pay ${selectedPlan.price} & Upgrade
                            </span>
                        ) : selectedPlan ? (
                            "Switch Plan"
                        ) : (
                            "Select a Plan"
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
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        saveMembership();
                    }}
                    onCancel={() => setShowPaymentModal(false)}
                />
            )}
        </div>
    );
}
