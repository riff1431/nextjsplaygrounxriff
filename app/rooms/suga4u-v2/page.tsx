"use client";

import React from "react";
import SugaLogo from "@/components/rooms/suga4u-v2/SugaLogo";
import UserProfile from "@/components/rooms/suga4u-v2/UserProfile";
import LiveStream from "@/components/rooms/suga4u-v2/LiveStream";
import PinnedOfferDrops from "@/components/rooms/suga4u-v2/PinnedOfferDrops";
import CreatorSecrets from "@/components/rooms/suga4u-v2/CreatorSecrets";
import LiveChat from "@/components/rooms/suga4u-v2/LiveChat";
import CreatorFavorites from "@/components/rooms/suga4u-v2/CreatorFavorites";
import PaidRequestMenu from "@/components/rooms/suga4u-v2/PaidRequestMenu";
import SendSugarGifts from "@/components/rooms/suga4u-v2/SendSugarGifts";
import QuickPaidActions from "@/components/rooms/suga4u-v2/QuickPaidActions";

const Index = () => {
    return (
        <div className="min-h-screen relative fd-suga4u-theme text-foreground font-body overflow-hidden">
            {/* Full-screen background */}
            <div className="fixed inset-0 z-0">
                <img src="/rooms/suga4u/bg1.jpeg" alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-background/30" />
            </div>

            <div className="relative z-10 p-3 lg:p-4 h-screen flex flex-col">
                {/* Header */}
                <header className="flex items-center justify-between mb-3 flex-shrink-0">
                    <SugaLogo />
                    <UserProfile />
                </header>

                {/* Main 3-Column Layout - fills remaining viewport */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_300px] gap-3 lg:gap-4 flex-1 min-h-0 px-40">
                    {/* Left Column: Stream + Offers + Secrets */}
                    <div className="flex flex-col gap-3 min-h-0">
                        <div className="flex-[1.5] min-h-0">
                            <LiveStream />
                        </div>
                        <div className="grid grid-cols lg:grid-cols-[1fr_1fr] gap-3 lg:gap-4 flex-1 min-h-0">
                            <CreatorSecrets />
                            <CreatorFavorites />
                        </div>
                    </div>

                    {/* Middle Column: Live Chat + Creator Favorites */}
                    <div className="flex flex-col gap-3 min-h-0">
                        <div className="flex-[3] min-h-0">
                            <LiveChat />
                        </div>
                    </div>

                    {/* Right Column: Paid Requests + Gifts + Actions */}
                    <div className="flex flex-col gap-3 min-h-0 pr-10">
                        <PaidRequestMenu />
                        <SendSugarGifts />
                        <QuickPaidActions />
                        <PinnedOfferDrops />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Index;
