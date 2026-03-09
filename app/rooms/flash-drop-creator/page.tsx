"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare, ClipboardList } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import LiveDropBoard from "@/components/rooms/flashdrop-creator/LiveDropBoard";
import SummaryBox from "@/components/rooms/flashdrop-creator/SummaryBox";
import HighRollerPacks from "@/components/rooms/flashdrop-creator/HighRollerPacks";
import DropRequests from "@/components/rooms/flashdrop-creator/DropRequests";
import BottomStrip from "@/components/rooms/flashdrop-creator/BottomStrip";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";
import FlashDropLiveChat from "@/components/rooms/flash-drops/FlashDropLiveChat";
import "./flashdrop-creator.css";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

/** Inner component that renders the live studio (only when sessionId is present) */
function FlashdropCreatorStudio() {
    const { user } = useAuth();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [rightTab, setRightTab] = useState<"requests" | "chat">("requests");

    useEffect(() => {
        if (!user) return;
        const supabase = createClient();
        async function findRoom() {
            const { data: room } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .eq("type", "flash-drop")
                .eq("status", "live")
                .limit(1)
                .maybeSingle();

            if (room) {
                setRoomId(room.id);
            } else {
                const { data: newRoom } = await supabase
                    .from("rooms")
                    .insert({ host_id: user!.id, title: "Flash Drop Session", status: "live", type: "flash-drop" })
                    .select()
                    .single();
                if (newRoom) setRoomId(newRoom.id);
            }
        }
        findRoom();
    }, [user]);

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
                            <div className="flex flex-col gap-4 min-h-0">
                                {/* Live Stream */}
                                <div className="rounded-xl overflow-hidden" style={{ height: "200px", border: "1px solid rgba(255,255,255,0.1)" }}>
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
                                <LiveDropBoard roomId={roomId ?? undefined} />
                            </div>
                            <div className="flex flex-col gap-4 min-h-0">
                                <SummaryBox roomId={roomId} />
                                <HighRollerPacks />
                            </div>
                        </div>
                        <BottomStrip roomId={roomId} />
                    </div>

                    {/* Right column — tabbed: Drop Requests | Live Chat */}
                    <div className="lg:col-span-2 flex flex-col min-h-0 glass-panel rounded-xl overflow-hidden">
                        {/* Tab bar */}
                        <div className="flex shrink-0 border-b border-border/50">
                            <button
                                onClick={() => setRightTab("requests")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold font-display tracking-wider transition-all ${rightTab === "requests"
                                    ? "border-b-2 border-primary text-primary neon-text"
                                    : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
                                    }`}
                            >
                                <ClipboardList size={13} />
                                Drop Requests
                            </button>
                            <button
                                onClick={() => setRightTab("chat")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold font-display tracking-wider transition-all ${rightTab === "chat"
                                    ? "border-b-2 border-primary text-primary neon-text"
                                    : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
                                    }`}
                            >
                                <MessageSquare size={13} />
                                Live Chat
                            </button>
                        </div>

                        {/* Tab contents */}
                        <div className="flex-1 min-h-0 overflow-hidden">
                            {rightTab === "requests" ? (
                                <DropRequests
                                    className="h-full border-none rounded-none"
                                    roomId={roomId ?? undefined}
                                />
                            ) : (
                                <FlashDropLiveChat
                                    roomId={roomId}
                                    hostId={user?.id}
                                    variant="creator"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Page component — shows session dashboard or live studio based on URL */
const FlashdropCreatorRoom = () => {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");

    // If no sessionId in URL, show session dashboard
    if (!sessionId) {
        return (
            <RoomSessionDashboard
                roomType="flash-drop"
                roomEmoji="⚡"
                roomLabel="Flash Drops"
                creatorPageRoute="/rooms/flash-drop-creator"
                accentHsl="170, 80%, 50%"
                accentHslSecondary="150, 70%, 45%"
                backgroundImage="/images/bg-flashdrop.jpeg"
            />
        );
    }

    return <FlashdropCreatorStudio />;
};

export default FlashdropCreatorRoom;
