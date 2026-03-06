"use client";

import { CsDashboardHeader, CsStatsBar } from "@/components/rooms/creator-studio/CsDashboardHeader";
import { CsCreatorStudio } from "@/components/rooms/creator-studio/CsCreatorStudio";
import { CsSubscriptionSettings } from "@/components/rooms/creator-studio/CsSubscriptionSettings";
import { CsRecentRoomHistory } from "@/components/rooms/creator-studio/CsRecentRoomHistory";
import { useCreatorDashboard } from "@/hooks/useCreatorDashboard";

const CreatorStudioDashboardPage = () => {
    const { profile, stats, recentRooms, isLoading, saveSubscriptionPrices } = useCreatorDashboard();

    return (
        <div className="cs-theme min-h-screen relative">
            {/* Background */}
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/rooms/creator-studio-bg.jpg')" }}
            />
            <div className="fixed inset-0 bg-black/60" />

            {/* Content */}
            <div className="relative z-10 p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
                <CsDashboardHeader
                    username={profile?.username}
                    avatarUrl={profile?.avatar_url}
                />
                <CsStatsBar
                    tipsEarned={stats.tipsEarned}
                    giftsCount={stats.giftsCount}
                    totalFollowers={stats.totalFollowers}
                    activeRooms={stats.activeRooms}
                    subscribers={stats.subscribers}
                    subscriptionEarnings={stats.subscriptionEarnings}
                    isLoading={isLoading}
                />
                <CsCreatorStudio />
                <CsSubscriptionSettings
                    weeklyPrice={profile?.subscription_price_weekly ?? null}
                    monthlyPrice={profile?.subscription_price_monthly ?? null}
                    onSave={saveSubscriptionPrices}
                />
                <CsRecentRoomHistory
                    rooms={recentRooms}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
};

export default CreatorStudioDashboardPage;
