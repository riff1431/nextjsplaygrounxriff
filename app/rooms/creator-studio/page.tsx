"use client";

import { CsDashboardHeader, CsStatsBar } from "@/components/rooms/creator-studio/CsDashboardHeader";
import { CsCreatorStudio } from "@/components/rooms/creator-studio/CsCreatorStudio";
import { CsSubscriptionSettings } from "@/components/rooms/creator-studio/CsSubscriptionSettings";
import { CsRecentRoomHistory } from "@/components/rooms/creator-studio/CsRecentRoomHistory";

const CreatorStudioDashboardPage = () => {
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
                <CsDashboardHeader />
                <CsStatsBar />
                <CsCreatorStudio />
                <CsSubscriptionSettings />
                <CsRecentRoomHistory />
            </div>
        </div>
    );
};

export default CreatorStudioDashboardPage;
