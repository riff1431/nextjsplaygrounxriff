"use client";

import React, { useState, useEffect } from "react";
import { Star, Check, CreditCard, FileText, DollarSign, ArrowLeft, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import OnboardingPaymentModal from "@/components/onboarding/OnboardingPaymentModal";

interface CreatorLevel {
    id: string;
    name: string;
    display_name: string;
    price: number;
    required_posts: number | null;
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
    badge_color: string;
    price: number;
    is_active: boolean;
}

const LEVEL_ICONS: Record<string, string> = {
    rookie: "🌱",
    rising: "⭐",
    star: "🌟",
    elite: "👑",
};

export default function CreatorLevelsPage() {
    const supabase = createClient();
    const { user, role } = useAuth();
    const router = useRouter();

    const [levels, setLevels] = useState<CreatorLevel[]>([]);
    const [currentLevelId, setCurrentLevelId] = useState<string | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<CreatorLevel | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [userPostCount, setUserPostCount] = useState(0);
    const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
    const [currentAccountTypeId, setCurrentAccountTypeId] = useState<string | null>(null);
    const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);
    const [paymentContext, setPaymentContext] = useState<"creator_level" | "account_type">("creator_level");

    useEffect(() => {
        if (role !== 'creator') {
            router.replace('/account/membership');
            return;
        }
        if (user) {
            Promise.all([fetchLevels(), fetchAccountTypes(), fetchUserProfile(), fetchUserPostCount()]).then(() => {
                setLoading(false);
            });
        }
    }, [user, role]);

    const fetchLevels = async () => {
        const { data, error } = await supabase
            .from("creator_level_plans")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            console.error("Error fetching levels:", error);
            toast.error("Failed to load plans");
        } else {
            setLevels(data || []);
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
            setAccountTypes(data || []);
        }
    };

    const fetchUserProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from("profiles").select("creator_level_id, account_type_id").eq("id", user.id).single();
        if (data) {
            setCurrentLevelId(data.creator_level_id);
            setCurrentAccountTypeId(data.account_type_id);
        }
    };

    const fetchUserPostCount = async () => {
        if (!user) return;
        const { count } = await supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);
        setUserPostCount(count || 0);
    };

    const canUnlockWithPosts = (level: CreatorLevel) => {
        return level.required_posts !== null && userPostCount >= level.required_posts;
    };

    const needsToPay = (level: CreatorLevel) => {
        // Free tier
        if (level.price === 0 && !level.required_posts) return false;
        // Can unlock with posts
        if (canUnlockWithPosts(level)) return false;
        // Has a price
        return level.price > 0;
    };

    const handleSelectLevel = (level: CreatorLevel) => {
        // Can't select current level
        if (currentLevelId === level.id) return;
        setSelectedLevel(level);
    };

    const handleUpgrade = async () => {
        if (!selectedLevel || !user) return;

        // If needs to pay, show payment modal
        if (needsToPay(selectedLevel)) {
            setPaymentContext("creator_level");
            setShowPaymentModal(true);
            return;
        }

        // Free or post-unlocked
        await saveLevel();
    };

    const saveLevel = async () => {
        if (!selectedLevel || !user) return;

        setSaving(true);
        const { error } = await supabase
            .from("profiles")
            .update({
                creator_level_id: selectedLevel.id,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) {
            toast.error("Failed to update membership");
            console.error(error);
        } else {
            toast.success(`You are now a ${selectedLevel.display_name} creator!`);
            setCurrentLevelId(selectedLevel.id);
            setSelectedLevel(null);
        }
    };

    const handleSelectAccountType = (type: AccountType) => {
        if (currentAccountTypeId === type.id) {
            setSelectedAccountType(null);
            return;
        }
        setSelectedAccountType(type);
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
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="fixed inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20 pointer-events-none" />

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
                        <h1 className="text-2xl font-bold">Creator Levels</h1>
                        <p className="text-gray-400 text-sm">Upgrade your status to unlock more features</p>
                    </div>
                </div>

                {/* Stats */}
                {userPostCount > 0 && (
                    <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm">
                        <FileText className="w-4 h-4" />
                        <span>You have {userPostCount} post{userPostCount !== 1 ? "s" : ""}</span>
                    </div>
                )}

                {/* Level Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {levels.map((level) => {
                        const isCurrent = currentLevelId === level.id;
                        const isSelected = selectedLevel?.id === level.id;
                        const canPostUnlock = canUnlockWithPosts(level);

                        return (
                            <button
                                key={level.id}
                                onClick={() => handleSelectLevel(level)}
                                disabled={isCurrent}
                                className={`relative p-5 rounded-2xl border-2 transition-all duration-300 text-left h-full flex flex-col ${isSelected
                                    ? "border-cyan-500 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 scale-[1.02] shadow-lg shadow-cyan-500/10"
                                    : isCurrent
                                        ? "border-green-500/50 bg-green-500/5 cursor-default"
                                        : "border-white/10 bg-black/40 hover:border-white/20"
                                    }`}
                            >
                                {/* Badges */}
                                {level.name === "elite" && (
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full text-[10px] font-bold text-white z-10">
                                        TOP TIER
                                    </div>
                                )}

                                {isCurrent && (
                                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-bold">
                                        <Check className="w-3 h-3" />
                                        CURRENT
                                    </div>
                                )}

                                {isSelected && !isCurrent && (
                                    <div className="absolute top-3 right-3 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}

                                {/* Icon */}
                                <div className="text-3xl mb-3">
                                    {LEVEL_ICONS[level.name] || "📊"}
                                </div>

                                {/* Label */}
                                <div
                                    className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 w-fit"
                                    style={{
                                        backgroundColor: `${level.badge_color}20`,
                                        color: level.badge_color,
                                        border: `1px solid ${level.badge_color}40`,
                                    }}
                                >
                                    {level.display_name}
                                </div>

                                {/* Price / Req */}
                                <div className="mb-3 space-y-1">
                                    {level.price === 0 && !level.required_posts ? (
                                        <span className="text-lg font-bold text-green-400">Free</span>
                                    ) : (
                                        <>
                                            {level.price > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3 text-yellow-400" />
                                                    <span className="text-lg font-bold text-white">
                                                        ${level.price}
                                                    </span>
                                                </div>
                                            )}
                                            {level.required_posts && level.price > 0 && (
                                                <span className="text-[10px] text-gray-500 block">OR</span>
                                            )}
                                            {level.required_posts && (
                                                <div className="flex items-center gap-1">
                                                    <FileText className="w-3 h-3 text-blue-400" />
                                                    <span className={`text-sm ${canPostUnlock ? "text-green-400" : "text-gray-300"}`}>
                                                        {level.required_posts}+ posts
                                                        {canPostUnlock && " ✓"}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Features */}
                                <div className="space-y-1 flex-1">
                                    {level.features.slice(0, 4).map((feature, i) => (
                                        <div key={i} className="flex items-start gap-2 text-[11px]">
                                            <div
                                                className="w-3 h-3 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0"
                                                style={{ backgroundColor: `${level.badge_color}30` }}
                                            >
                                                <Check className="w-2 h-2" style={{ color: level.badge_color }} />
                                            </div>
                                            <span className="text-gray-400 leading-tight">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer Action */}
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleUpgrade}
                        disabled={!selectedLevel || saving}
                        className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 min-w-[300px] ${selectedLevel
                            ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/25"
                            : "bg-gray-800 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : selectedLevel ? (
                            needsToPay(selectedLevel) ? (
                                <span className="flex items-center justify-center gap-2">
                                    <CreditCard className="w-5 h-5" />
                                    Pay ${selectedLevel.price} & Upgrade
                                </span>
                            ) : (
                                "Confirm Upgrade"
                            )
                        ) : (
                            "Select a Plan to Upgrade"
                        )}
                    </button>
                </div>


                {/* Account Types Section */}
                {accountTypes.length > 0 && (
                    <div className="mt-16 border-t border-white/10 pt-12">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 text-pink-400 mb-2">
                                <Sparkles className="w-5 h-5" />
                                <span className="text-sm font-medium uppercase tracking-wider">Identity Badges</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white">Account Types</h2>
                            <p className="text-gray-400 text-sm mt-2">Express your style with a premium identity badge</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                            {accountTypes.map((type) => {
                                const isCurrent = currentAccountTypeId === type.id;
                                const isSelected = selectedAccountType?.id === type.id;

                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => handleSelectAccountType(type)}
                                        className={`relative p-6 rounded-3xl border-2 transition-all duration-300 text-left ${isSelected
                                            ? "border-pink-500 bg-gradient-to-br from-pink-500/10 to-purple-500/10 scale-[1.02] shadow-lg shadow-pink-500/25"
                                            : isCurrent
                                                ? "border-green-500/50 bg-green-500/5"
                                                : "border-white/10 bg-black/40 hover:border-white/20"
                                            }`}
                                    >
                                        {isCurrent && (
                                            <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                                                <Check className="w-3 h-3" />
                                                Active
                                            </div>
                                        )}

                                        {isSelected && !isCurrent && (
                                            <div className="absolute top-4 right-4 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        {/* Badge Icon */}
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                                            style={{ backgroundColor: `${type.badge_color}20` }}
                                        >
                                            {type.badge_icon || "✨"}
                                        </div>

                                        {/* Display Name */}
                                        <div
                                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mb-3"
                                            style={{
                                                backgroundColor: `${type.badge_color}15`,
                                                color: type.badge_color,
                                                border: `1px solid ${type.badge_color}40`,
                                            }}
                                        >
                                            <span>{type.badge_icon}</span>
                                            {type.display_name}
                                        </div>

                                        {/* Price */}
                                        <div className="mb-3">
                                            {type.price === 0 ? (
                                                <span className="text-xl font-bold text-green-400">Free</span>
                                            ) : (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xl font-bold text-white">${type.price}</span>
                                                    <span className="text-gray-400 text-sm">/month</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {type.description && (
                                            <p className="text-gray-400 text-sm">{type.description}</p>
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
                showPaymentModal && paymentContext === "creator_level" && selectedLevel && (
                    <OnboardingPaymentModal
                        amount={selectedLevel.price}
                        planName={selectedLevel.display_name}
                        planType="creator_level"
                        onSuccess={() => {
                            setShowPaymentModal(false);
                            saveLevel();
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
