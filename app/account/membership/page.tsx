"use client";

import React, { useState, useEffect } from "react";
import { Check, Crown, CreditCard, ArrowLeft, Star, Sparkles } from "lucide-react";
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

interface AccountType {
    id: string;
    name: string;
    display_name: string;
    description: string | null;
    badge_icon: string;
    badge_icon_url: string | null;
    badge_color: string;
    price: number;
    is_active: boolean;
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
    const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [currentAccountTypeId, setCurrentAccountTypeId] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
    const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentContext, setPaymentContext] = useState<"membership" | "account_type">("membership");
    const [viewFilter, setViewFilter] = useState<"all" | "memberships" | "badges">("all");

    useEffect(() => {
        if (user) {
            Promise.all([fetchPlans(), fetchAccountTypes(), fetchUserProfile()]).then(() => {
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

    const fetchAccountTypes = async () => {
        const { data, error } = await supabase
            .from("account_types")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            console.error("Error fetching account types:", error);
        } else {
            // Only show Sugar Daddy and Sugar Mama to fan users (exclude Sugar Baby)
            const fanTypes = (data || []).filter(
                (t: AccountType) => !t.name.toLowerCase().includes("baby")
            );
            setAccountTypes(fanTypes);
        }
    };

    const fetchUserProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from("profiles").select("fan_membership_id, account_type_id").eq("id", user.id).single();
        if (data) {
            setCurrentPlanId(data.fan_membership_id);
            setCurrentAccountTypeId(data.account_type_id);
        }
    };

    const handleSelectPlan = (plan: MembershipPlan) => {
        if (currentPlanId === plan.id) return;
        setSelectedPlan(plan);
    };

    const handleSelectAccountType = (type: AccountType) => {
        if (currentAccountTypeId === type.id) {
            setSelectedAccountType(null);
            return;
        }
        setSelectedAccountType(type);
    };

    const handleUpgrade = async () => {
        if (!selectedPlan || !user) return;

        // If paid plan, show payment modal
        if (selectedPlan.price > 0) {
            setPaymentContext("membership");
            setShowPaymentModal(true);
            return;
        }

        // Free plan - save directly
        await saveMembership();
    };

    const handleSelectAccountTypePayment = async () => {
        if (!selectedAccountType || !user) return;

        // If paid account type, show payment modal
        if (selectedAccountType.price > 0) {
            setPaymentContext("account_type");
            setShowPaymentModal(true);
            return;
        }

        // Free account type - save directly
        await saveAccountType();
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

    const saveAccountType = async () => {
        if (!selectedAccountType || !user) return;

        setSaving(true);
        const { error } = await supabase
            .from("profiles")
            .update({
                account_type_id: selectedAccountType.id,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) {
            toast.error("Failed to update account type");
            console.error(error);
        } else {
            toast.success(`You're now a ${selectedAccountType.display_name}!`);
            setCurrentAccountTypeId(selectedAccountType.id);
            setSelectedAccountType(null);
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

                {/* Filter Options */}
                <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-none">
                    {[
                        { id: "all", label: "All Plans" },
                        { id: "memberships", label: "Memberships" },
                        { id: "badges", label: "Identity Badges" },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setViewFilter(f.id as "all" | "memberships" | "badges")}
                            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                                viewFilter === f.id
                                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/25 border border-transparent"
                                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Membership Cards */}
                {(viewFilter === "all" || viewFilter === "memberships") && (
                    <>
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
                </>
                )}

                {/* Account Types Section */}
                {accountTypes.length > 0 && (viewFilter === "all" || viewFilter === "badges") && (
                    <div className={viewFilter === "all" ? "mt-16 border-t border-white/10 pt-12" : ""}>
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 text-pink-400 mb-2">
                                <Sparkles className="w-5 h-5" />
                                <span className="text-sm font-medium uppercase tracking-wider">Identity Badges</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white">Account Types</h2>
                            <p className="text-gray-400 text-sm mt-2">Express your style with a premium identity badge</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto px-4">
                            {accountTypes.map((type) => {
                                const isCurrent = currentAccountTypeId === type.id;
                                const isSelected = selectedAccountType?.id === type.id;

                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => handleSelectAccountType(type)}
                                        disabled={isCurrent}
                                        className={`relative p-8 rounded-[2rem] border-2 transition-all duration-500 flex flex-col items-center text-center group ${isSelected
                                            ? "border-pink-500 bg-gradient-to-br from-pink-500/15 to-purple-500/15 scale-[1.03] shadow-2xl shadow-pink-500/20 z-10"
                                            : isCurrent
                                                ? "border-green-500/40 bg-gradient-to-b from-green-500/10 to-transparent cursor-default ring-1 ring-inset ring-green-500/20"
                                                : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/[0.04] hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/5"
                                            }`}
                                    >
                                        {/* Background Glow Effect on Hover */}
                                        <div 
                                            className={`absolute inset-0 opacity-0 transition-opacity duration-500 rounded-[2rem] pointer-events-none ${!isCurrent && !isSelected ? "group-hover:opacity-100" : ""}`}
                                            style={{ background: `radial-gradient(circle at center, ${type.badge_color}10 0%, transparent 70%)` }}
                                        />

                                        {isCurrent && (
                                            <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold ring-1 ring-green-500/40 shadow-lg backdrop-blur-md z-20">
                                                <Check className="w-3.5 h-3.5" />
                                                Active
                                            </div>
                                        )}

                                        {isSelected && !isCurrent && (
                                            <div className="absolute top-5 right-5 w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.5)] transform transition-transform scale-110 z-20 ring-2 ring-black">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        {/* Badge Icon */}
                                        <div
                                            className={`w-28 h-28 rounded-[1.5rem] flex items-center justify-center text-6xl mb-6 overflow-hidden relative shadow-xl border border-white/10 transition-transform duration-500 z-10 ${!isCurrent && "group-hover:scale-110"}`}
                                            style={{ backgroundColor: `${type.badge_color}15` }}
                                        >
                                            <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at top left, ${type.badge_color}40 0%, transparent 60%)` }} />
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent z-0 pointer-events-none" />
                                            <div className="relative z-10 w-full h-full flex items-center justify-center p-3">
                                                {type.badge_icon_url ? (
                                                    <img
                                                        src={type.badge_icon_url}
                                                        alt={type.display_name}
                                                        className="w-full h-full object-contain drop-shadow-2xl"
                                                    />
                                                ) : (
                                                    <span className="drop-shadow-2xl">{type.badge_icon || "✨"}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Display Name */}
                                        <div
                                            className="relative z-10 inline-flex items-center gap-2 px-6 py-2 rounded-full text-base font-extrabold tracking-wide mb-5"
                                            style={{
                                                backgroundColor: `${type.badge_color}15`,
                                                color: type.badge_color,
                                                border: `1px solid ${type.badge_color}40`,
                                                boxShadow: `0 0 20px ${type.badge_color}20`
                                            }}
                                        >
                                            {!type.badge_icon_url && <span>{type.badge_icon}</span>}
                                            {type.display_name}
                                        </div>

                                        {/* Price */}
                                        <div className="relative z-10 mb-4 transition-transform duration-300 transform group-hover:scale-105">
                                            {type.price === 0 ? (
                                                <span className="text-4xl font-black text-green-400 drop-shadow-md">Free</span>
                                            ) : (
                                                <div className="flex items-baseline gap-1 justify-center">
                                                    <span className="text-5xl font-black text-white drop-shadow-md">€{type.price}</span>
                                                    <span className="text-gray-400 text-base font-bold uppercase tracking-wider">/mo</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {type.description && (
                                            <p className="relative z-10 text-gray-400 text-sm leading-relaxed max-w-[85%] font-medium">
                                                {type.description}
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Account Type Action Button */}
                        {selectedAccountType && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={handleSelectAccountTypePayment}
                                    disabled={saving}
                                    className="px-8 py-3 rounded-2xl font-bold text-base bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25 transition-all"
                                >
                                    {saving ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </span>
                                    ) : selectedAccountType.price > 0 ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <CreditCard className="w-5 h-5" />
                                            Pay ${selectedAccountType.price} & Activate
                                        </span>
                                    ) : (
                                        "Activate Badge"
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {
                showPaymentModal && paymentContext === "membership" && selectedPlan && (
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
                )
            }
            {
                showPaymentModal && paymentContext === "account_type" && selectedAccountType && (
                    <OnboardingPaymentModal
                        amount={selectedAccountType.price}
                        planName={selectedAccountType.display_name}
                        planType="account_type"
                        onSuccess={() => {
                            setShowPaymentModal(false);
                            saveAccountType();
                        }}
                        onCancel={() => setShowPaymentModal(false)}
                    />
                )
            }
        </div >
    );
}

