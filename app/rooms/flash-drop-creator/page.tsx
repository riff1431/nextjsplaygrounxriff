"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";
import CreatorExitModal from "@/components/rooms/shared/CreatorExitModal";
import "./flashdrop-creator.css";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

/** Inner component that renders the live studio (only when sessionId is present) */
function FlashdropCreatorStudio() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const [roomId, setRoomId] = useState<string | null>(null);
    const [showExitModal, setShowExitModal] = useState(false);

    useEffect(() => {
        if (!user) return;
        const supabase = createClient();
        async function findRoom() {
            const { data: rooms } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .eq("type", "flash-drop")
                .order("created_at", { ascending: true })
                .limit(1);

            if (rooms && rooms.length > 0) {
                setRoomId(rooms[0].id);
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

            <div className="relative z-10 px-3 py-2 flex flex-col gap-3 h-screen overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center shrink-0 relative">
                    <button
                        onClick={() => setShowExitModal(true)}
                        className="glass-card rounded-lg px-3 py-2 hover:bg-primary/20 transition-colors absolute left-0 flex items-center gap-2 cursor-pointer z-50"
                    >
                        <ArrowLeft className="text-primary" size={18} />
                        <span className="text-xs font-bold text-primary hidden sm:block">Back</span>
                    </button>
                    <h1 className="font-display text-2xl md:text-4xl font-black neon-text tracking-widest text-center w-full">
                        Flash Drop — Creator Room
                    </h1>
                    <div className="absolute right-0 z-50">
                        <SessionLiveControls
                            sessionId={sessionId!}
                            onEnd={() => router.push("/rooms/flash-drop-creator")}
                            accentHsl="170, 80%, 50%"
                        />
                    </div>
                </div>

                {/* Main Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 min-h-0 overflow-hidden">
                    {/* Left two columns */}
                    <div className="lg:col-span-2 flex flex-col gap-3 min-h-0 overflow-hidden">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 overflow-hidden">
                            <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
                                {/* Live Stream */}
                                <div className="rounded-xl overflow-hidden shrink-0" style={{ height: "180px", border: "1px solid rgba(255,255,255,0.1)" }}>
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
                                <LiveDropBoard roomId={roomId ?? undefined} sessionId={sessionId} />
                            </div>
                            <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
                                <SummaryBox roomId={roomId} />
                                <HighRollerPacks roomId={roomId} />
                            </div>
                        </div>
                        <BottomStrip roomId={roomId} />
                    </div>

                    {/* Right column — Drop Requests & Live Chat side by side */}
                    <div className="lg:col-span-2 flex flex-row gap-4 min-h-0">
                        {/* Drop Requests section */}
                        <div className="flex-1 flex flex-col min-h-0 glass-panel rounded-xl overflow-hidden">
                            <div className="flex items-center gap-1.5 px-4 py-2.5 shrink-0 border-b border-border/50">
                                <ClipboardList size={13} className="text-primary" />
                                <span className="text-xs font-bold font-display tracking-wider text-primary neon-text">Custom Request Drops</span>
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <DropRequests
                                    className="h-full border-none rounded-none"
                                    roomId={roomId ?? undefined}
                                />
                            </div>
                        </div>

                        {/* Live Chat section */}
                        <div className="flex-1 flex flex-col min-h-0 glass-panel rounded-xl overflow-hidden">
                            <div className="flex items-center gap-1.5 px-4 py-2.5 shrink-0 border-b border-border/50">
                                <MessageSquare size={13} className="text-primary" />
                                <span className="text-xs font-bold font-display tracking-wider text-primary neon-text">Live Chat</span>
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <FlashDropLiveChat
                                    roomId={roomId}
                                    hostId={user?.id}
                                    variant="creator"
                                    sessionId={sessionId}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CreatorExitModal
                isOpen={showExitModal}
                onClose={() => setShowExitModal(false)}
                onEndSession={async () => {
                    const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/end`, { method: "POST" });
                    if (res.ok) router.push("/rooms/flash-drop-creator");
                }}
                onMinimizeSession={() => router.push("/rooms/flash-drop-creator")}
                roomName="Flash Drop"
                accentHsl="330, 100%, 55%"
            />
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
                offlinePageRoute="/rooms/flash-drop-creator/setup"
                offlineLabel="Set Up Drops Offline"
                offlineDescription="Pre-load your Flash Drops before going live"
            />
        );
    }

    return <FlashdropCreatorStudio />;
};

export default FlashdropCreatorRoom;
