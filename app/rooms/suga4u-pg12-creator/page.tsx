"use client";

import { motion } from "framer-motion";
import DashboardHeader from "@/components/rooms/suga4u-pg12-creator/DashboardHeader";
import LiveChat from "@/components/rooms/suga4u-pg12-creator/LiveChat";
import CreatorsFavorites from "@/components/rooms/suga4u-pg12-creator/CreatorsFavorites";
import PendingRequests from "@/components/rooms/suga4u-pg12-creator/PendingRequests";
import CreatorSecrets from "@/components/rooms/suga4u-pg12-creator/CreatorSecrets";
import SessionSummary from "@/components/rooms/suga4u-pg12-creator/SessionSummary";
import CameraPreview from "@/components/rooms/suga4u-pg12-creator/CameraPreview";
import "./creator-room.css";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

export default function Suga4UPG12CreatorPage() {
    return (
        <div className="suga4u-pg12-creator-theme">
            <div className="h-screen overflow-hidden sparkle-bg relative">
                <div className="absolute inset-0 bg-background/30" />
                <div className="relative z-10 p-4 pb-10 max-w-[1400px] mx-auto flex flex-col h-full">
                    <div className="mb-4 shrink-0">
                        <DashboardHeader />
                    </div>
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0"
                    >
                        {/* Left column: Live Chat + Summary */}
                        <motion.div variants={item} className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <LiveChat />
                            </div>
                        </motion.div>

                        {/* Pending Requests */}
                        <motion.div variants={item} className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <PendingRequests />
                            </div>
                        </motion.div>

                        {/* Middle column: Creators Favorites + Pending Requests */}
                        <motion.div variants={item} className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <CreatorsFavorites />
                            </div>
                            <div className="shrink-0">
                                <SessionSummary />
                            </div>
                        </motion.div>

                        {/* Right column: Creator Secrets + Camera Preview */}
                        <motion.div variants={item} className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <CreatorSecrets />
                            </div>
                            <div className="shrink-0">
                                <CameraPreview />
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
