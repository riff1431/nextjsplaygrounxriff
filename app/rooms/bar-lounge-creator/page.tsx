"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Phone } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { usePrivateCall } from "@/hooks/usePrivateCall";
import LoungeChat from "@/components/rooms/bar-lounge-creator/LoungeChat";
import VideoStage from "@/components/rooms/bar-lounge-creator/VideoStage";
import IncomingRequests from "@/components/rooms/bar-lounge-creator/IncomingRequests";
import SummaryPanel from "@/components/rooms/bar-lounge-creator/SummaryPanel";
import WalletPill from "@/components/common/WalletPill";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";
import CreatorExitModal from "@/components/rooms/shared/CreatorExitModal";
import PrivateCallCreatorModal from "@/components/rooms/suga4u-creator/PrivateCallCreatorModal";
import S4uIncomingCallsPanel from "@/components/rooms/suga4u-creator/S4uIncomingCallsPanel";


const CreatorBarLounge = () => {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const supabase = createClient();

    const [roomId, setRoomId] = useState<string | undefined>(undefined);
    const [sessionTitle, setSessionTitle] = useState<string | undefined>(undefined);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showIncomingCallsPanel, setShowIncomingCallsPanel] = useState(false);

    // Private 1-on-1 call
    const privateCall = usePrivateCall(roomId || null, user?.id || null, "creator");

    // When we have a sessionId, find/create the room and go straight to live view
    useEffect(() => {
        if (!user) return;
        async function findRoomAndSession() {
            // If we have a sessionId, get room_id directly from the session (most reliable)
            if (sessionId) {
                const { data: session } = await supabase
                    .from("room_sessions")
                    .select("title, room_id")
                    .eq("id", sessionId)
                    .single();
                if (session) {
                    setSessionTitle(session.title);
                    if (session.room_id) setRoomId(session.room_id);
                    return; // room_id resolved from session — skip rooms table lookup
                }
            }

            // Fallback: look up room from rooms table
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
            className="h-[100dvh] w-full bg-cover bg-center bg-no-repeat relative flex flex-col fd-bar-lounge-creator-theme overflow-hidden"
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
                <div className="absolute right-4 flex items-center gap-3">
                    {/* Incoming 1-on-1 calls */}
                    <div className="relative" data-incoming-btn>
                        <button
                            onClick={() => setShowIncomingCallsPanel(prev => !prev)}
                            className="relative h-9 px-3 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all backdrop-blur-md shadow-lg"
                            style={{
                                background: "hsla(320, 80%, 45%, 0.8)",
                                border: "1px solid hsla(320, 80%, 60%, 0.4)",
                                color: "#fff",
                                boxShadow: "0 0 15px hsla(320, 80%, 50%, 0.3)",
                            }}
                        >
                            <Phone className="w-4 h-4" />
                            <span className="hidden sm:inline">Incoming</span>
                            {/* Notification badge */}
                            {privateCall.pendingCalls.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/50 animate-pulse border-2 border-[#1a1a2e]">
                                    {privateCall.pendingCalls.length}
                                </span>
                            )}
                        </button>
                        <S4uIncomingCallsPanel
                            isOpen={showIncomingCallsPanel}
                            onClose={() => setShowIncomingCallsPanel(false)}
                            pendingCalls={privateCall.pendingCalls}
                            isLoading={privateCall.isLoading}
                            onAccept={(callId) => {
                                privateCall.acceptCall(callId);
                                setShowIncomingCallsPanel(false);
                            }}
                            onDecline={(callId) => {
                                privateCall.declineCall(callId);
                            }}
                        />
                    </div>
                    <SessionLiveControls
                        sessionId={sessionId!}
                        onEnd={() => router.push("/rooms/bar-lounge-creator")}
                        accentHsl="45, 90%, 55%"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 min-h-0 w-full p-2 sm:p-4 max-w-[1600px] mx-auto overflow-y-auto lg:overflow-hidden">
                <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] xl:grid-cols-[320px_1fr_320px] 2xl:grid-cols-[350px_1fr_350px] gap-4">
                    {/* Left - Chat */}
                    <div className="h-full hidden lg:flex min-h-[400px]">
                        <LoungeChat roomId={roomId} sessionId={sessionId} />
                    </div>

                    {/* Center - Video */}
                    <div className="h-full flex items-center justify-center w-full min-h-[400px]">
                        <div className="w-full h-full">
                            <VideoStage roomId={roomId} />
                        </div>
                    </div>

                    {/* Right - Requests & Summary */}
                    <div className="hidden lg:flex flex-col gap-4 h-full min-h-[400px]">
                        <div className="flex-1 min-h-0">
                            <IncomingRequests roomId={roomId} sessionId={sessionId} />
                        </div>
                        <SummaryPanel roomId={roomId} sessionId={sessionId} />
                    </div>
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

            {/* Private 1-on-1 Call Modal — only for ringing/active/ended states (pending is handled by the Incoming panel) */}
            {privateCall.callState && privateCall.callState.status !== "pending" && user && (
                <PrivateCallCreatorModal
                    callState={privateCall.callState}
                    timeRemaining={privateCall.timeRemaining}
                    userId={user.id}
                    isLoading={privateCall.isLoading}
                    onAcceptCall={() => privateCall.acceptCall()}
                    onDeclineCall={() => privateCall.declineCall()}
                    onEndCall={privateCall.endCall}
                    onDismiss={privateCall.dismiss}
                />
            )}
        </div>
    );
};

export default CreatorBarLounge;
