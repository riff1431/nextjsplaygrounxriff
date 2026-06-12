"use client";

import { CsDashboardHeader, CsStatsBar } from "@/components/rooms/creator-studio/CsDashboardHeader";
import { CsCreatorStudio } from "@/components/rooms/creator-studio/CsCreatorStudio";
import { CsSubscriptionSettings } from "@/components/rooms/creator-studio/CsSubscriptionSettings";
import { CsRecentRoomHistory } from "@/components/rooms/creator-studio/CsRecentRoomHistory";
import CsKycVerificationBanner from "@/components/rooms/creator-studio/CsKycVerificationBanner";
import CsKycSkippedBanner from "@/components/rooms/creator-studio/CsKycSkippedBanner";
import CsKycSkippedPopup from "@/components/rooms/creator-studio/CsKycSkippedPopup";
import { useEffect } from "react";
import { useCreatorDashboard } from "@/hooks/useCreatorDashboard";
import { useAuth } from "@/app/context/AuthContext";
import { useKycStatus } from "@/components/onboarding/OnboardingGuard";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const CreatorStudioDashboardPage = () => {
    const { user, role, isLoading: authLoading, updateRole } = useAuth();
    const { profile, stats, recentRooms, isLoading, saveSubscriptionPrices } = useCreatorDashboard();
    const { kycStatus, isPending, isRejected, isApproved } = useKycStatus();
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push("/auth");
            return;
        }

        const handleRoleSync = async () => {
            const { data: profileData } = await supabase
                .from("profiles")
                .select("role, is_creator")
                .eq("id", user.id)
                .single();

            if (profileData) {
                // If they are not a creator at all, they shouldn't be here
                if (!profileData.is_creator && profileData.role !== "creator" && profileData.role !== "admin") {
                    router.push("/home");
                    return;
                }

                // If they are a creator but currently in fan view/role, auto-switch them back to creator
                if (profileData.is_creator && profileData.role === "fan") {
                    console.log("Auto-switching creator back to creator mode");
                    const toastId = toast.loading("Syncing Creator Studio session...");
                    try {
                        // 1. Update profiles table
                        const { error: profileError } = await supabase
                            .from("profiles")
                            .update({ role: "creator" })
                            .eq("id", user.id);
                        if (profileError) throw profileError;

                        // 2. Update auth user metadata
                        const { error: authError } = await supabase.auth.updateUser({
                            data: { role: "creator" }
                        });
                        if (authError) throw authError;

                        // 3. Update AuthContext state
                        updateRole("creator");
                        toast.success("Switched to Creator Hub! 👑", { id: toastId });
                    } catch (e) {
                        console.error("Failed to auto-switch role:", e);
                        toast.error("Failed to sync role", { id: toastId });
                    }
                }
            }
        };

        handleRoleSync();
    }, [user, authLoading, role, router, supabase, updateRole]);

    const kycLocked = kycStatus !== "approved";

    const isProfileIncomplete = !profile?.username || 
                                !profile?.avatar_url || 
                                !profile?.full_name ||
                                !profile?.cover_url ||
                                !profile?.bio ||
                                !profile?.location;

    return (
        <div className="cs-theme min-h-screen relative">
            {/* Background */}
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/rooms/creator-studio-bg.jpg')" }}
            />
            <div className="fixed inset-0 bg-black/60" />

            {/* Content */}
            <div className="relative z-10 p-3 sm:p-4 md:p-8 max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
                <div data-tour="profile-setup">
                    <CsDashboardHeader
                        profile={profile}
                        isProfileIncomplete={isProfileIncomplete}
                    />
                </div>

                {/* KYC Verification Banner — shows when KYC is pending or rejected */}
                {(isPending || isRejected) && (
                    <CsKycVerificationBanner kycStatus={kycStatus} />
                )}

                {/* KYC Skipped Banner — shows when KYC was skipped */}
                {kycStatus === "skipped" && (
                    <CsKycSkippedBanner />
                )}

                {/* KYC Skipped Popup Modal */}
                {kycStatus === "skipped" && (
                    <CsKycSkippedPopup />
                )}

                <div data-tour="earnings-dashboard">
                    <CsStatsBar
                        tipsEarned={stats.tipsEarned}
                        giftsCount={stats.giftsCount}
                        totalFollowers={stats.totalFollowers}
                        activeRooms={stats.activeRooms}
                        subscribers={stats.subscribers}
                        subscriptionEarnings={stats.subscriptionEarnings}
                        isLoading={isLoading}
                        kycLocked={kycLocked}
                    />
                </div>
                <div data-tour="live-streaming">
                    <CsCreatorStudio kycLocked={kycLocked} />
                </div>
                <div data-tour="subscription-settings">
                    <CsSubscriptionSettings
                        weeklyPrice={profile?.subscription_price_weekly ?? null}
                        monthlyPrice={profile?.subscription_price_monthly ?? null}
                        userId={user?.id ?? null}
                        onSave={saveSubscriptionPrices}
                    />
                </div>
                <div data-tour="recent-rooms">
                    <CsRecentRoomHistory
                        rooms={recentRooms}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreatorStudioDashboardPage;
