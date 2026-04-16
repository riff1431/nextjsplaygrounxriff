"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import dynamic from "next/dynamic";
import LiveChat from "@/components/rooms/x-chat-creator/LiveChat";
import IncomingRequests from "@/components/rooms/x-chat-creator/IncomingRequests";
import SummaryPanel from "@/components/rooms/x-chat-creator/SummaryPanel";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const XChatCreatorPage = () => {
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const urlRoomId = searchParams.get("roomId");
    const supabase = createClient();
    const [roomId, setRoomId] = useState<string | undefined>(urlRoomId || undefined);

    // Must be called before any conditional return to satisfy Rules of Hooks
    useEffect(() => {
        if (!sessionId) return; // Only init when we have an active session
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (urlRoomId) {
                setRoomId(urlRoomId);
                return;
            }

            // Find creator's x-chat room
            const { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('host_id', user.id)
                .eq('type', 'x-chat')
                .limit(1)
                .single();

            let targetRoomId = room?.id;

            if (!targetRoomId) {
                // Auto-create room for the creator
                const { data: newRoom } = await supabase
                    .from('rooms')
                    .insert([{ host_id: user.id, title: "X Chat Room", status: "live", type: "x-chat" }])
                    .select()
                    .single();
                targetRoomId = newRoom?.id;
            }

            if (targetRoomId) {
                setRoomId(targetRoomId);
            }
        }
        init();
    }, [sessionId]);

    if (!sessionId) {
        return (
            <ProtectRoute allowedRoles={["creator"]}>
                <RoomSessionDashboard
                    roomType="x-chat"
                    roomEmoji="💬"
                    roomLabel="X Chat"
                    creatorPageRoute="/rooms/x-chat-creator"
                    accentHsl="45, 90%, 55%"
                    accentHslSecondary="35, 85%, 50%"
                    backgroundImage="/x-chat/casino-bg.jpeg"
                />
            </ProtectRoute>
        );
    }

    return (
        <ProtectRoute allowedRoles={["creator"]}>
            <div
                className="min-h-screen w-full bg-background bg-cover bg-center bg-fixed relative fd-x-chat-theme"
                style={{ backgroundImage: "url('/x-chat/casino-bg.jpeg')" }}
            >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-background/20" />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-screen overflow-hidden">
                    {/* Top Bar */}
                    <motion.header
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="panel-glass flex items-center px-4 py-3 relative"
                    >
                        <button
                            onClick={() => router.push("/home")}
                            className="flex items-center gap-1 text-foreground hover:text-primary transition-colors absolute left-4"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm hidden sm:inline">Back</span>
                        </button>
                        <h1
                            className="mx-auto text-2xl md:text-3xl gold-text"
                            style={{ fontFamily: "'Pacifico', cursive" }}
                        >
                            Creators View for X Chat
                        </h1>
                    </motion.header>

                    {/* Main 3-column layout */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr_400px] gap-3 px-3 pb-3 max-w-[1600px] mx-auto w-full overflow-hidden">
                        {/* Left - Live Chat */}
                        <div className="hidden lg:flex min-h-0">
                            <LiveChat roomId={roomId} />
                        </div>

                        {/* Center - Video Feeds */}
                        <div className="flex flex-col gap-4 items-center justify-center w-full px-4 lg:px-12">
                            {/* Top Feed - Creator Live Stream */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="relative w-full rounded-xl overflow-hidden"
                                style={{
                                    height: 'calc(50% - 8px)',
                                    maxHeight: '320px',
                                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.35), 0 0 60px rgba(255, 215, 0, 0.15)',
                                    border: '2px solid rgba(255, 215, 0, 0.5)',
                                }}
                            >
                                {roomId && user ? (
                                    <LiveStreamWrapper
                                        role="host"
                                        appId={APP_ID}
                                        roomId={roomId}
                                        uid={user.id}
                                        hostId={user.id}
                                        hostAvatarUrl={user.user_metadata?.avatar_url || ""}
                                        hostName={user.user_metadata?.full_name || "Creator"}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-black/60">
                                        <img
                                            src="/x-chat/streamer-male.png"
                                            alt="Creator stream"
                                            className="w-full h-full object-cover object-top"
                                        />
                                    </div>
                                )}
                                {/* Stat badge */}
                                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-background/70 backdrop-blur-sm rounded-full px-3 py-1">
                                    <span className="text-red-500 text-sm">❤️</span>
                                    <span className="text-sm font-bold text-foreground">800</span>
                                </div>
                            </motion.div>

                            {/* Bottom Feed - Secondary View */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35 }}
                                className="relative w-full rounded-xl overflow-hidden"
                                style={{
                                    height: 'calc(50% - 8px)',
                                    maxHeight: '320px',
                                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.35), 0 0 60px rgba(255, 215, 0, 0.15)',
                                    border: '2px solid rgba(255, 215, 0, 0.5)',
                                }}
                            >
                                {roomId && user ? (
                                    <LiveStreamWrapper
                                        role="fan"
                                        appId={APP_ID}
                                        roomId={`${roomId}_fan`}
                                        uid={user.id}
                                        hostId="pending"
                                        hostAvatarUrl=""
                                        hostName="Fan stream"
                                    />
                                ) : (
                                    <img
                                        src="/x-chat/streamer-female.png"
                                        alt="Fan stream"
                                        className="w-full h-full object-cover object-top"
                                    />
                                )}
                                {/* Stat badge */}
                                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-background/70 backdrop-blur-sm rounded-full px-3 py-1">
                                    <span className="text-primary text-sm">💎</span>
                                    <span className="text-sm font-bold text-foreground">650</span>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right - Requests + Summary */}
                        <div className="hidden lg:flex flex-col gap-1 min-h-0 overflow-y-auto scrollbar-thin">
                            <IncomingRequests roomId={roomId} />
                            <SummaryPanel roomId={roomId} />
                        </div>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
};

export default XChatCreatorPage;
