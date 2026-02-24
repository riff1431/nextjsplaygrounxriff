"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import LoungeChat from "@/components/rooms/bar-lounge-creator/LoungeChat";
import VideoStage from "@/components/rooms/bar-lounge-creator/VideoStage";
import IncomingRequests from "@/components/rooms/bar-lounge-creator/IncomingRequests";
import SummaryPanel from "@/components/rooms/bar-lounge-creator/SummaryPanel";

const CreatorBarLounge = () => {
    const router = useRouter();

    return (
        <div
            className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col fd-bar-lounge-creator-theme"
            style={{ backgroundImage: "url('/rooms/bar-lounge/lounge-bg-creator.jpeg')" }}
        >
            {/* Top Bar */}
            <div className="relative z-20 flex items-center justify-center px-4 py-3 glass-panel rounded-none" style={{ borderLeft: 0, borderRight: 0, borderTop: 0 }}>
                <button
                    onClick={() => router.push("/home")}
                    className="absolute left-4 glass-panel px-3 py-2 rounded-lg flex items-center gap-2 hover:opacity-80 transition-colors"
                    style={{
                        color: "hsl(45, 90%, 55%)",
                        border: "1px solid hsla(45, 90%, 55%, 0.35)",
                    }}
                >
                    <ChevronLeft className="w-[18px] h-[18px]" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <h1
                    className="text-2xl text-gold"
                    style={{
                        fontFamily: "'Pacifico', cursive",
                        textShadow: "0 0 10px hsla(45, 90%, 55%, 0.6)",
                    }}
                >
                    Bar Lounge
                </h1>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[350px_650px_350px] p-4 max-w-[1600px] mx-auto">
                {/* Left - Chat */}
                <div className="h-full hidden lg:flex">
                    <LoungeChat />
                </div>

                {/* Center - Video */}
                <div className="h-full flex items-center justify-center w-full">
                    <div className="w-full h-full">
                        <VideoStage />
                    </div>
                </div>

                {/* Right - Requests & Summary */}
                <div className="hidden lg:flex flex-col gap-4 h-full">
                    <div className="flex-1">
                        <IncomingRequests />
                    </div>
                    <SummaryPanel />
                </div>
            </div>
        </div>
    );
};

export default CreatorBarLounge;
