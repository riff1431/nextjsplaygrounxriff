"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LiveDropBoard from "@/components/rooms/flashdrop-creator/LiveDropBoard";
import SummaryBox from "@/components/rooms/flashdrop-creator/SummaryBox";
import HighRollerPacks from "@/components/rooms/flashdrop-creator/HighRollerPacks";
import DropRequests from "@/components/rooms/flashdrop-creator/DropRequests";
import BottomStrip from "@/components/rooms/flashdrop-creator/BottomStrip";
import "./flashdrop-creator.css";

const FlashdropCreatorRoom = () => {
    return (
        <div
            className="flashdrop-creator-theme h-screen overflow-hidden bg-background bg-cover bg-center bg-no-repeat relative"
            style={{ backgroundImage: "url('/images/bg-flashdrop.jpeg')" }}
        >
            {/* Overlay for readability */}
            <div className="absolute inset-0 bg-background/40" />

            <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-4 h-screen overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center shrink-0 relative">
                    <Link
                        href="/rooms/creator-studio"
                        className="glass-card rounded-lg p-2 hover:bg-primary/20 transition-colors absolute left-0 flex items-center justify-center cursor-pointer"
                    >
                        <ArrowLeft className="text-primary" size={20} />
                    </Link>
                    <h1 className="font-display text-2xl md:text-4xl font-black neon-text tracking-widest text-center w-full">
                        Flash Drop — Creator Room
                    </h1>
                </div>

                {/* Main Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
                    {/* Left two columns */}
                    <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
                            <LiveDropBoard />
                            <div className="flex flex-col gap-4 min-h-0">
                                <SummaryBox />
                                <HighRollerPacks />
                            </div>
                        </div>
                        <BottomStrip />
                    </div>

                    {/* Right column stretches full height */}
                    <DropRequests className="flex col-span-2" />
                </div>
            </div>
        </div>
    );
};

export default FlashdropCreatorRoom;
