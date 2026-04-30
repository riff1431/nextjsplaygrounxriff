"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import LoungeChat from "@/components/rooms/bar-lounge-creator/LoungeChat";
import VideoStage from "@/components/rooms/bar-lounge-creator/VideoStage";
import IncomingRequests from "@/components/rooms/bar-lounge-creator/IncomingRequests";
import SummaryPanel from "@/components/rooms/bar-lounge-creator/SummaryPanel";
import WalletPill from "@/components/common/WalletPill";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";
import CreatorExitModal from "@/components/rooms/shared/CreatorExitModal";


const CreatorBarLounge = () => {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const supabase = createClient();

    const [roomId, setRoomId] = useState<string | undefined>(undefined);
    const [sessionTitle, setSessionTitle] = useState<string | undefined>(undefined);
    const [showExitModal, setShowExitModal] = useState(false);

    // When we have a sessionId, find/create the room and go straight to live view
    useEffect(() => {
        if (!user) return;
        async function findRoomAndSession() {
            const { data: rooms } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .eq("type", "bar-lounge")
                .order("created_at", { ascending: true })
                .limit(1);

            if (rooms && rooms.length > 0) {
                setRoomId(rooms[0].id);
            }

            if (sessionId) {
                const { data: session } = await supabase
                    .from("room_sessions")
                    .select("title")
                    .eq("id", sessionId)
                    .single();
                if (session) setSessionTitle(session.title);
            }
        }
        findRoomAndSession();
    }, [user, sessionId]);

    // If no sessionId in URL, show session dashboard
    if (!sessionId) {
        return (
            <RoomSessionDashboard
                roomType="bar-lounge"
                roomEmoji="🍸"
                roomLabel="Bar Lounge"
                creatorPageRoute="/rooms/bar-lounge-creator"
                accentHsl="45, 90%, 55%"
                accentHslSecondary="280, 40%, 50%"
                backgroundImage="/rooms/bar-lounge/lounge-bg-v2.png"
            />
        );
    }






    // --- Live View ---
    return (
        <div
            className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col fd-bar-lounge-creator-theme"
            style={{ backgroundImage: "url('/rooms/bar-lounge/lounge-bg-v2.png')" }}
        >
            {/* Top Bar */}
            <div className="relative z-20 flex items-center justify-between sm:justify-center px-4 py-3 glass-panel rounded-none border-x-0 border-t-0 min-h-[70px]">
                <div className="sm:absolute sm:left-4 flex items-center gap-3">
                    <button
                        onClick={() => setShowExitModal(true)}
                        className="glass-panel px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-white/10 transition-colors"
                        style={{ borderColor: "hsla(45, 90%, 55%, 0.3)", color: "hsl(45, 90%, 55%)" }}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-sm font-medium hidden sm:inline">Back</span>
                    </button>
                    <WalletPill />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl gold-text" style={{ fontFamily: "'Pacifico', cursive" }}>Bar Lounge</h1>
                    <p className="text-[10px] font-medium uppercase tracking-widest flex items-center justify-center gap-2" style={{ color: "hsl(280, 15%, 55%)" }}>
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        {sessionTitle || "Live Session"}
                    </p>
                </div>
                <div className="absolute right-4">
                    <SessionLiveControls
                        sessionId={sessionId!}
                        onEnd={() => router.push("/rooms/bar-lounge-creator")}
                        accentHsl="45, 90%, 55%"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[350px_650px_350px] p-4 max-w-[1600px] mx-auto">
                {/* Left - Chat */}
                <div className="h-full hidden lg:flex">
                    <LoungeChat roomId={roomId} sessionId={sessionId} />
                </div>

                {/* Center - Video */}
                <div className="h-full flex items-center justify-center w-full">
                    <div className="w-full h-full">
                        <VideoStage roomId={roomId} />
                    </div>
                </div>

                {/* Right - Requests & Summary */}
                <div className="hidden lg:flex flex-col gap-4 h-full">
                    <div className="flex-1">
                        <IncomingRequests roomId={roomId} />
                    </div>
                    <SummaryPanel roomId={roomId} />
                </div>
            </div>

            <CreatorExitModal
                isOpen={showExitModal}
                onClose={() => setShowExitModal(false)}
                onEndSession={async () => {
                    const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/end`, { method: "POST" });
                    if (res.ok) router.push("/rooms/bar-lounge-creator");
                }}
                onMinimizeSession={() => router.push("/rooms/bar-lounge-creator")}
                roomName="Bar Lounge"
                accentHsl="45, 90%, 55%"
            />
        </div>
    );
};

export default CreatorBarLounge;
