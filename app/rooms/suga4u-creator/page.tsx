"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { ArrowLeft, UserPlus, Bell, Phone } from "lucide-react";
import InviteModal from "@/components/rooms/InviteModal";
import InvitationPopup from "@/components/rooms/InvitationPopup";
import S4uLiveChat from "@/components/rooms/suga4u-creator/S4uLiveChat";
import S4uCreatorsFavorites from "@/components/rooms/suga4u-creator/S4uCreatorsFavorites";
import S4uPendingRequests from "@/components/rooms/suga4u-creator/S4uPendingRequests";
import S4uCreatorSecrets from "@/components/rooms/suga4u-creator/S4uCreatorSecrets";
import S4uSessionSummary from "@/components/rooms/suga4u-creator/S4uSessionSummary";
import S4uCreatorGroupVote from "@/components/rooms/suga4u-creator/S4uCreatorGroupVote";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";
import PrivateCallCreatorModal from "@/components/rooms/suga4u-creator/PrivateCallCreatorModal";
import { usePrivateCall } from "@/hooks/usePrivateCall";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const Suga4UCreatorPage = () => {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const [roomId, setRoomId] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Private 1-on-1 call
    const privateCall = usePrivateCall(roomId, user?.id || null, "creator");

    useEffect(() => {
        if (!user || !sessionId) return;
        const supabase = createClient();
        async function findRoom() {
            const { data: rooms } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .eq("type", "suga-4-u")
                .order("created_at", { ascending: true })
                .limit(1);

            if (rooms && rooms.length > 0) {
                setRoomId(rooms[0].id);
            }
        }
        findRoom();
    }, [user, sessionId]);

    if (!sessionId) {
        return (
            <RoomSessionDashboard
                roomType="suga-4-u"
                roomEmoji="🍬"
                roomLabel="Suga 4 U"
                creatorPageRoute="/rooms/suga4u-creator"
                accentHsl="340, 75%, 55%"
                accentHslSecondary="320, 70%, 50%"
                backgroundImage="/rooms/suga4u-creator-bg.jpeg"
            />
        );
    }

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

            {/* Scrollbar overrides for Creator Dashboard */}
            <style dangerouslySetInnerHTML={{__html: `
                .s4u-creator-theme .chat-scroll::-webkit-scrollbar,
                .s4u-creator-theme .custom-scroll::-webkit-scrollbar {
                    display: none;
                }
                .s4u-creator-theme .chat-scroll,
                .s4u-creator-theme .custom-scroll {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
            `}} />

            {/* Content */}
            <div className="relative z-10 p-2 pb-10 max-w-[1400px] mx-auto flex flex-col h-full">
                
                {/* Top Header Row */}
                <div className="mb-0 shrink-0 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        {/* Invite button (small) */}
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md"
                            title="Invite fans"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                        {/* Incoming 1-on-1 notifications */}
                        <button
                            onClick={() => {
                                if (!privateCall.callState) {
                                    // No pending calls — just show info
                                } 
                                // If there's a pending call, the modal is already showing
                            }}
                            className="relative h-10 px-4 rounded-xl bg-pink-600/80 border border-pink-400/30 flex items-center gap-2 text-white text-sm font-semibold hover:bg-pink-500/90 transition-all backdrop-blur-md shadow-lg shadow-pink-900/20"
                        >
                            <Phone className="w-4 h-4" />
                            Incoming
                            {/* Notification badge for pending private calls */}
                            {privateCall.callState && privateCall.callState.status === "pending" && (
                                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/50 animate-pulse border-2 border-[#1a1a2e]">
                                    1
                                </span>
                            )}
                        </button>
                        <SessionLiveControls
                            sessionId={sessionId!}
                            onEnd={() => router.push("/rooms/suga4u-creator")}
                            accentHsl="340, 75%, 55%"
                        />
                    </div>
                </div>

                {/* Main 4-col grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0 pt-2">

                    {/* Left column: Live Chat (Full Height) */}
                    <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <S4uLiveChat roomId={roomId || undefined} />
                        </div>
                    </div>

                    {/* Column 2: Pending Requests + Group Vote */}
                    <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <S4uPendingRequests roomId={roomId || undefined} />
                        </div>
                        <div className="shrink-0 flex flex-col">
                            <S4uCreatorGroupVote roomId={roomId || undefined} />
                        </div>
                    </div>

                    {/* Column 3: Creators Favorites + Session Summary */}
                    <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <S4uCreatorsFavorites roomId={roomId || undefined} />
                        </div>
                        <div className="shrink-0">
                            <S4uSessionSummary />
                        </div>
                    </div>

                    {/* Right column: Creator Secrets + Live Stream */}
                    <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <S4uCreatorSecrets roomId={roomId || undefined} />
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

            {/* Invite Modal */}
            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                roomId={roomId}
            />

            {/* Incoming Invitation Popup */}
            <InvitationPopup />

            {/* Private 1-on-1 Call Modal */}
            {privateCall.callState && user && (
                <PrivateCallCreatorModal
                    callState={privateCall.callState}
                    timeRemaining={privateCall.timeRemaining}
                    userId={user.id}
                    isLoading={privateCall.isLoading}
                    onAcceptCall={privateCall.acceptCall}
                    onDeclineCall={privateCall.declineCall}
                    onEndCall={privateCall.endCall}
                    onDismiss={privateCall.dismiss}
                />
            )}
        </div>
    );
};

export default Suga4UCreatorPage;
