"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import S4uDashboardHeader from "@/components/rooms/suga4u-creator/S4uDashboardHeader";
import S4uLiveChat from "@/components/rooms/suga4u-creator/S4uLiveChat";
import S4uCreatorsFavorites from "@/components/rooms/suga4u-creator/S4uCreatorsFavorites";
import S4uPendingRequests from "@/components/rooms/suga4u-creator/S4uPendingRequests";
import S4uCreatorSecrets from "@/components/rooms/suga4u-creator/S4uCreatorSecrets";
import S4uSessionSummary from "@/components/rooms/suga4u-creator/S4uSessionSummary";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const Suga4UCreatorPage = () => {
    const { user } = useAuth();
    const [roomId, setRoomId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const supabase = createClient();
        async function findRoom() {
            const { data: room } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .eq("type", "suga-4-u")
                .eq("status", "live")
                .limit(1)
                .maybeSingle();

            if (room) {
                setRoomId(room.id);
            } else {
                // Auto-create a live room for the creator
                const { data: newRoom } = await supabase
                    .from("rooms")
                    .insert({ host_id: user!.id, title: "Sugar 4 U Session", status: "live", type: "suga-4-u" })
                    .select()
                    .single();
                if (newRoom) setRoomId(newRoom.id);
            }
        }
        findRoom();
    }, [user]);

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

                    {/* Right column: Creator Secrets + Live Stream */}
                    <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <S4uCreatorSecrets />
                        </div>
                        <div className="shrink-0">
                            <div className="s4u-creator-glass-panel p-4">
                                <div className="relative rounded-lg overflow-hidden h-48 bg-white/5 border border-white/10 flex items-center justify-center">
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
                                        <div className="relative flex flex-col items-center gap-2 text-white/50">
                                            <span className="text-xs font-semibold">Connecting to stream...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Suga4UCreatorPage;
