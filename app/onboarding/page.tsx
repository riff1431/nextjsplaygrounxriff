"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { createClient } from "@/utils/supabase/client";

// Step components
import AccountTypeStep from "@/components/onboarding/steps/AccountTypeStep";
import FanMembershipStep from "@/components/onboarding/steps/FanMembershipStep";
import CreatorLevelStep from "@/components/onboarding/steps/CreatorLevelStep";
import KYCVerificationStep from "@/components/onboarding/steps/KYCVerificationStep";
import DiditVerificationStep from "@/components/onboarding/steps/DiditVerificationStep";
import VerificationPendingScreen from "@/components/onboarding/VerificationPendingScreen";
import BankPaymentPendingScreen from "@/components/onboarding/BankPaymentPendingScreen";

interface ProfileData {
    account_type_id: string | null;
    account_type_skipped: boolean;
    bank_payment_pending: boolean;
    fan_membership_id: string | null;
    creator_level_id: string | null;
    onboarding_completed_at: string | null;
    kyc_status: string;
    role: string;
}

export default function OnboardingPage() {
    const { user, role, logout, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [currentStep, setCurrentStep] = useState(1);

    // Determine total steps based on role
    const totalSteps = role === "creator" ? 3 : 2;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
            return;
        }

        if (user) {
            checkOnboardingStatus();
        }
    }, [user, authLoading]);

    const checkOnboardingStatus = async () => {
        if (!user) return;

        const { data: profile, error } = await supabase
            .from("profiles")
            .select("account_type_id, account_type_skipped, bank_payment_pending, fan_membership_id, creator_level_id, onboarding_completed_at, kyc_status, role")
            .eq("id", user.id)
            .single();

        if (error) {
            console.error("Error fetching profile:", error);
            setLoading(false);
            return;
        }

        setProfileData(profile);

        // Determine current step based on what's completed
        // Step 1 is done if account_type_id is set OR account_type_skipped is true
        const step1Done = profile.account_type_id || profile.account_type_skipped;

        if (!step1Done) {
            setCurrentStep(1);
        } else if (profile.role === "fan" && !profile.fan_membership_id) {
            setCurrentStep(2);
        } else if (profile.role === "creator" && !profile.creator_level_id) {
            setCurrentStep(2);
        } else if (profile.role === "creator" && profile.kyc_status === "not_required") {
            setCurrentStep(3);
        } else if (profile.role === "creator" && profile.kyc_status === "rejected") {
            setCurrentStep(3);
        } else if (profile.onboarding_completed_at && profile.role === "fan") {
            // Fan is done, redirect
            router.push("/home");
            return;
        } else if (profile.role === "creator" && profile.kyc_status === "approved") {
            // Creator is done, redirect
            router.push("/creator/dashboard");
            return;
        }

        setLoading(false);
    };

    const handleStepComplete = async () => {
        // Refresh profile data and move to next step
        await checkOnboardingStatus();
    };

    const refreshProfile = async () => {
        await checkOnboardingStatus();
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                    <p className="text-gray-400">Setting up your profile...</p>
                </div>
            </div>
        );
    }

    // Show verification pending for creators awaiting KYC review
    if (profileData?.role === "creator" && profileData.kyc_status === "pending") {
        return <VerificationPendingScreen onStatusChange={refreshProfile} />;
    }

    // Show bank payment pending screen if user has a pending bank payment
    if (profileData?.bank_payment_pending) {
        return <BankPaymentPendingScreen />;
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Background gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-pink-900/20 via-black to-purple-900/20 pointer-events-none" />

            {/* Main content */}
            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Header */}
                <header className="p-6">
                    <div className="max-w-4xl mx-auto flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                                Complete Your Profile
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">
                                Just a few steps to get you started
                            </p>
                        </div>
                        <button
                            onClick={() => logout()}
                            className="text-gray-400 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-md text-sm transition-colors border border-gray-800 hover:border-gray-600"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Progress indicator */}
                <div className="px-6 pb-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-2">
                            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                                <React.Fragment key={step}>
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step < currentStep
                                            ? "bg-green-500 text-white"
                                            : step === currentStep
                                                ? "bg-pink-500 text-white"
                                                : "bg-gray-800 text-gray-500 border border-gray-700"
                                            }`}
                                    >
                                        {step < currentStep ? "✓" : step}
                                    </div>
                                    {step < totalSteps && (
                                        <div
                                            className={`flex-1 h-1 rounded-full transition-all ${step < currentStep ? "bg-green-500" : "bg-gray-800"
                                                }`}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-gray-500">Account Type</span>
                            <span className="text-xs text-gray-500">
                                {role === "creator" ? "Creator Level" : "Membership"}
                            </span>
                            {role === "creator" && (
                                <span className="text-xs text-gray-500">Verification</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Step content */}
                <div className="flex-1 px-6 py-8">
                    <div className="max-w-4xl mx-auto">
                        {currentStep === 1 && (
                            <AccountTypeStep onComplete={handleStepComplete} />
                        )}

                        {currentStep === 2 && role === "fan" && (
                            <FanMembershipStep onComplete={handleStepComplete} />
                        )}

                        {currentStep === 2 && role === "creator" && (
                            <CreatorLevelStep onComplete={handleStepComplete} />
                        )}

                        {currentStep === 3 && role === "creator" && (
                            <DiditVerificationStep
                                onComplete={handleStepComplete}
                                rejectionReason={
                                    profileData?.kyc_status === "rejected"
                                        ? "Please resubmit your verification"
                                        : undefined
                                }
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
