"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import LiveChat from "@/components/rooms/x-chat-creator/LiveChat";
import VideoFeeds from "@/components/rooms/x-chat-creator/VideoFeeds";
import IncomingRequests from "@/components/rooms/x-chat-creator/IncomingRequests";
import SummaryPanel from "@/components/rooms/x-chat-creator/SummaryPanel";

const CreatorXChatRoom = () => {
    const router = useRouter();

    return (
        <div
            className="min-h-screen w-full bg-cover bg-center bg-fixed relative fd-x-chat-theme"
            style={{ backgroundImage: "url('/x-chat/casino-bg.jpeg')" }}
        >
            {/* Dark overlay */}
            <div className="absolute inset-0" style={{ background: "hsla(25, 15%, 8%, 0.20)" }} />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-screen overflow-hidden">
                {/* Top Bar */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="creator-panel-glass flex items-center px-4 py-3 relative"
                >
                    <button
                        onClick={() => router.push("/home")}
                        className="flex items-center gap-1 hover:opacity-80 transition-colors absolute left-4"
                        style={{ color: "hsl(40, 60%, 90%)" }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm hidden sm:inline">Back</span>
                    </button>
                    <h1
                        className="mx-auto text-2xl md:text-3xl"
                        style={{
                            fontFamily: "'Pacifico', cursive",
                            background: "linear-gradient(135deg, hsl(40, 70%, 55%), hsl(35, 80%, 45%))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        Creators View for X Chat
                    </h1>
                </motion.header>

                {/* Main 3-column layout */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr_400px] gap-3 px-3 pb-3 max-w-[1600px] mx-auto w-full overflow-hidden">
                    {/* Left - Live Chat */}
                    <div className="hidden lg:flex min-h-0">
                        <LiveChat />
                    </div>

                    {/* Center - Video Feeds */}
                    <div className="flex items-center justify-center w-full">
                        <VideoFeeds />
                    </div>

                    {/* Right - Requests + Summary */}
                    <div className="hidden lg:flex flex-col gap-1 min-h-0 overflow-y-auto creator-scrollbar">
                        <IncomingRequests />
                        <SummaryPanel />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatorXChatRoom;
