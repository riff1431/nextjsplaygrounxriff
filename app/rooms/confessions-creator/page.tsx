"use client";

import ConfessionsTopBar from "@/components/rooms/confessions-creator/ConfessionsTopBar";
import ConfessionsLeftSidebar from "@/components/rooms/confessions-creator/ConfessionsLeftSidebar";
import ConfessionsCenterContent from "@/components/rooms/confessions-creator/ConfessionsCenterContent";
import ConfessionsLiveChat from "@/components/rooms/confessions-creator/ConfessionsLiveChat";
import ConfessionsFloatingHearts from "@/components/rooms/confessions-creator/ConfessionsFloatingHearts";

const ConfessionsCreatorPage = () => {
    return (
        <div
            className="conf-theme h-screen overflow-hidden relative"
            style={{
                backgroundImage: "url('/rooms/confessions-creator-bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
            }}
        >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/20" />
            <ConfessionsFloatingHearts />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-screen">
                <ConfessionsTopBar />
                <div className="flex-1 flex items-stretch gap-16 px-4 pb-4 overflow-hidden xl:mx-40">
                    <ConfessionsLeftSidebar />
                    <ConfessionsCenterContent variant="confessions" />
                    <ConfessionsLiveChat />
                </div>
            </div>
        </div>
    );
};

export default ConfessionsCreatorPage;
