"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import ConfessionsTopBar from "@/components/rooms/confessions-creator/ConfessionsTopBar";
import ConfessionsLeftSidebar from "@/components/rooms/confessions-creator/ConfessionsLeftSidebar";
import ConfessionsCenterContent from "@/components/rooms/confessions-creator/ConfessionsCenterContent";
import ConfessionsLiveChat from "@/components/rooms/confessions-creator/ConfessionsLiveChat";
import ConfessionsFloatingHearts from "@/components/rooms/confessions-creator/ConfessionsFloatingHearts";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const ConfessionsCreatorPage = () => {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const [roomId, setRoomId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;
        const supabase = createClient();
        async function findRoom() {
            const { data: rooms } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .eq("type", "confessions")
                .order("created_at", { ascending: true })
                .limit(1);
            if (rooms && rooms.length > 0) {
                setRoomId(rooms[0].id);
            }
        }
        findRoom();
    }, [user]);

    if (!sessionId) {
        return (
            <RoomSessionDashboard
                roomType="confessions"
                roomEmoji="💜"
                roomLabel="Confessions"
                creatorPageRoute="/rooms/confessions-creator"
                offlinePageRoute="/creator/rooms/confessions"
                offlineLabel="Set Up Room & Wall"
                offlineDescription="Add permanent content to your Confession Wall without going live"
                accentHsl="280, 70%, 60%"
                accentHslSecondary="320, 65%, 55%"
                backgroundImage="/rooms/confessions-creator-bg.png"
            />
        );
    }

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
                <div className="relative flex items-center">
                    <div className="flex-1">
                        <ConfessionsTopBar />
                    </div>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20">
                        <SessionLiveControls
                            sessionId={sessionId!}
                            onEnd={() => router.push("/rooms/confessions-creator")}
                            accentHsl="280, 70%, 60%"
                        />
                    </div>
                </div>
                <div className="flex-1 flex items-stretch gap-16 px-4 pb-4 overflow-hidden xl:mx-40">
                    <ConfessionsLeftSidebar />
                    <div className="flex-1 flex flex-col gap-4 min-h-0">
                        {/* Live Stream */}
                        <div className="shrink-0 rounded-xl overflow-hidden" style={{ height: "240px", border: "1px solid rgba(255,255,255,0.1)" }}>
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
                                <div className="w-full h-full flex items-center justify-center bg-black/40 text-white/40 text-sm">
                                    Connecting to stream...
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-h-0">
                            <ConfessionsCenterContent variant="confessions" />
                        </div>
                    </div>
                    <ConfessionsLiveChat roomId={roomId} />
                </div>
            </div>
        </div>
    );
};

export default ConfessionsCreatorPage;
