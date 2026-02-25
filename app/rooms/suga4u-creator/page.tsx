"use client";

import S4uDashboardHeader from "@/components/rooms/suga4u-creator/S4uDashboardHeader";
import S4uLiveChat from "@/components/rooms/suga4u-creator/S4uLiveChat";
import S4uCreatorsFavorites from "@/components/rooms/suga4u-creator/S4uCreatorsFavorites";
import S4uPendingRequests from "@/components/rooms/suga4u-creator/S4uPendingRequests";
import S4uCreatorSecrets from "@/components/rooms/suga4u-creator/S4uCreatorSecrets";
import S4uSessionSummary from "@/components/rooms/suga4u-creator/S4uSessionSummary";
import S4uCameraPreview from "@/components/rooms/suga4u-creator/S4uCameraPreview";

const Suga4UCreatorPage = () => {
    return (
        <div
            className="s4u-creator-theme h-screen overflow-hidden relative"
            style={{
                backgroundImage: "url('/rooms/suga4u-creator-bg.jpeg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
            }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Content */}
            <div className="relative z-10 p-4 pb-10 max-w-[1400px] mx-auto flex flex-col h-full">
                {/* Header */}
                <div className="mb-4 shrink-0">
                    <S4uDashboardHeader />
                </div>

                {/* Main 4-col grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">

                    {/* Left column: Live Chat + Summary */}
                    <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <S4uLiveChat />
                        </div>
                        <div className="shrink-0">
                            <S4uSessionSummary />
                        </div>
                    </div>

                    {/* Middle column (spans 2): Creators Favorites + Pending Requests */}
                    <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <S4uCreatorsFavorites />
                        </div>
                        <div className="shrink-0">
                            <S4uPendingRequests />
                        </div>
                    </div>

                    {/* Right column: Creator Secrets + Camera Preview */}
                    <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <S4uCreatorSecrets />
                        </div>
                        <div className="shrink-0">
                            <S4uCameraPreview />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Suga4UCreatorPage;
