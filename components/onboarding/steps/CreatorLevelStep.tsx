"use client";

import React, { useState, useEffect } from "react";
import { Star, Check, CreditCard, FileText, DollarSign } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import OnboardingPaymentModal from "../OnboardingPaymentModal";

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

interface Props {
    onComplete: () => void;
}

const LEVEL_ICONS: Record<string, string> = {
    rookie: "🌱",
    rising: "⭐",
    star: "🌟",
    elite: "👑",
};

export default function CreatorLevelStep({ onComplete }: Props) {
    const supabase = createClient();
    const { user } = useAuth();
    const [levels, setLevels] = useState<CreatorLevel[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<CreatorLevel | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [userPostCount, setUserPostCount] = useState(0);

    useEffect(() => {
        fetchLevels();
        fetchUserPostCount();
    }, []);

    const fetchLevels = async () => {
        const { data, error } = await supabase
            .from("creator_level_plans")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            toast.error("Failed to load creator levels");
            console.error(error);
        } else {
            setLevels(data || []);
        }
        setLoading(false);
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
        setSelectedLevel(level);
    };

    const handleContinue = async () => {
        if (!selectedLevel || !user) return;

        // If needs to pay, show payment modal
        if (needsToPay(selectedLevel)) {
            setShowPaymentModal(true);
            return;
        }

        // Free or post-unlocked - save directly
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
            toast.error("Failed to save level");
            console.error(error);
        } else {
            toast.success(`You're now a ${selectedLevel.display_name} creator!`);
            onComplete();
        }
        setSaving(false);
    };

    const handlePaymentSuccess = async () => {
        setShowPaymentModal(false);
        await saveLevel();
    };

    const handlePaymentCancel = () => {
        setShowPaymentModal(false);
    };

    if (loading) {
        return (
            <div className="text-center py-20">
                <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 mt-4">Loading creator levels...</p>
            </div>
        );
    }

    return (
        <>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Step Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm mb-4">
                        <Star className="w-4 h-4" />
                        Step 2 of 3
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Choose Your Creator Level</h2>
                    <p className="text-gray-400">
                        Start your journey and level up as you grow
                    </p>
                    {userPostCount > 0 && (
                        <p className="text-cyan-400 text-sm mt-2">
                            You have {userPostCount} post{userPostCount !== 1 ? "s" : ""} already!
                        </p>
                    )}
                </div>

                {/* Level Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                    {levels.map((level) => {
                        const canPostUnlock = canUnlockWithPosts(level);
                        const requiresPayment = needsToPay(level);

                        return (
                            <button
                                key={level.id}
                                onClick={() => handleSelectLevel(level)}
                                className={`relative p-5 rounded-2xl border-2 transition-all duration-300 text-left ${selectedLevel?.id === level.id
                                        ? "border-cyan-500 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 scale-[1.02]"
                                        : "border-white/10 bg-black/40 hover:border-white/20"
                                    }`}
                            >
                                {/* Elite badge */}
                                {level.name === "elite" && (
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full text-[10px] font-bold text-white">
                                        TOP TIER
                                    </div>
                                )}

                                {/* Selection indicator */}
                                {selectedLevel?.id === level.id && (
                                    <div className="absolute top-3 right-3 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}

                                {/* Icon */}
                                <div className="text-3xl mb-3">
                                    {LEVEL_ICONS[level.name] || "📊"}
                                </div>

                                {/* Badge Preview */}
                                <div
                                    className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold mb-2"
                                    style={{
                                        backgroundColor: `${level.badge_color}20`,
                                        color: level.badge_color,
                                        border: `1px solid ${level.badge_color}40`,
                                    }}
                                >
                                    {level.display_name}
                                </div>

                                {/* Requirements */}
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
                                                    <span
                                                        className={`text-sm ${canPostUnlock ? "text-green-400" : "text-gray-300"
                                                            }`}
                                                    >
                                                        {level.required_posts}+ posts
                                                        {canPostUnlock && " ✓"}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Features */}
                                <div className="space-y-1">
                                    {level.features.slice(0, 3).map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[11px]">
                                            <div
                                                className="w-3 h-3 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: `${level.badge_color}30` }}
                                            >
                                                <Check
                                                    className="w-2 h-2"
                                                    style={{ color: level.badge_color }}
                                                />
                                            </div>
                                            <span className="text-gray-400">{feature}</span>
                                        </div>
                                    ))}
                                    {level.features.length > 3 && (
                                        <span className="text-[10px] text-gray-500">
                                            +{level.features.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Continue Button */}
                <div className="mt-10 text-center">
                    <button
                        onClick={handleContinue}
                        disabled={!selectedLevel || saving}
                        className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${selectedLevel
                                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/25"
                                : "bg-gray-800 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : selectedLevel && needsToPay(selectedLevel) ? (
                            <span className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Pay ${selectedLevel.price} & Continue
                            </span>
                        ) : (
                            "Continue to Verification →"
                        )}
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedLevel && (
                <OnboardingPaymentModal
                    amount={selectedLevel.price}
                    planName={selectedLevel.display_name}
                    planType="creator_level"
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                />
            )}
        </>
    );
}
