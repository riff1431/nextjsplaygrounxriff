"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { ArrowLeft, UserPlus, Phone, MessageCircle, Inbox, Star, Video } from "lucide-react";
import InviteModal from "@/components/rooms/InviteModal";
import InvitationPopup from "@/components/rooms/InvitationPopup";
import { toast } from "sonner";
import S4uLiveChat from "@/components/rooms/suga4u-creator/S4uLiveChat";
import S4uCreatorsFavorites from "@/components/rooms/suga4u-creator/S4uCreatorsFavorites";
import S4uPendingRequests from "@/components/rooms/suga4u-creator/S4uPendingRequests";
import S4uCreatorSecrets from "@/components/rooms/suga4u-creator/S4uCreatorSecrets";
import S4uSessionSummary from "@/components/rooms/suga4u-creator/S4uSessionSummary";
import S4uCreatorGroupVote from "@/components/rooms/suga4u-creator/S4uCreatorGroupVote";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";
import PrivateCallCreatorModal from "@/components/rooms/suga4u-creator/PrivateCallCreatorModal";
import S4uIncomingCallsPanel from "@/components/rooms/suga4u-creator/S4uIncomingCallsPanel";
import { usePrivateCall } from "@/hooks/usePrivateCall";
import CreatorExitModal from "@/components/rooms/shared/CreatorExitModal";
import { cs } from "@/utils/currency";
import { useGroupCall } from "@/hooks/useGroupCall";
import GroupCallCreatorModal from "@/components/rooms/truth-or-dare-creator/GroupCallCreatorModal";
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";
import RoomTourHelpButton from "@/components/rooms/shared/RoomTourHelpButton";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const SUGA4U_TABS: MobileStudioTab[] = [
    { id: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
    { id: "requests", label: "Requests", icon: <Inbox className="w-5 h-5" /> },
    { id: "favorites", label: "Favorites", icon: <Star className="w-5 h-5" /> },
];

const Suga4UCreatorPage = () => {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const supabase = createClient();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showIncomingPanel, setShowIncomingPanel] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [mobileTab, setMobileTab] = useState("chat");

    const [chatUnread, setChatUnread] = useState(0);
    const [requestsUnread, setRequestsUnread] = useState(0);

    useEffect(() => {
        if (mobileTab === "chat") {
            setChatUnread(0);
        }
    }, [mobileTab]);

    useEffect(() => {
        if (mobileTab === "requests") {
            setRequestsUnread(0);
        }
    }, [mobileTab]);

    useEffect(() => {
        if (!roomId) return;

        const fetchInitialRequests = async () => {
            let q = supabase
                .from("suga_paid_requests")
                .select("id", { count: "exact", head: true })
                .eq("room_id", roomId)
                .eq("status", "pending");
            if (sessionId) q = q.eq("session_id", sessionId);
            const { count } = await q;
            if (count !== null) setRequestsUnread(count);
        };
        fetchInitialRequests();

        const channel = supabase
            .channel(`unread-badges-suga4u-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "suga_activity_events",
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const newEvent = payload.new as any;
                if (sessionId && newEvent.session_id !== sessionId) return;
                if (newEvent.type === "CHAT" && mobileTab !== "chat") {
                    setChatUnread(prev => prev + 1);
                }
            })
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "suga_paid_requests",
                filter: `room_id=eq.${roomId}`
            }, async () => {
                let q = supabase
                    .from("suga_paid_requests")
                    .select("id", { count: "exact", head: true })
                    .eq("room_id", roomId)
                    .eq("status", "pending");
                if (sessionId) q = q.eq("session_id", sessionId);
                const { count } = await q;
                if (count !== null) setRequestsUnread(count);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, sessionId, mobileTab]);

    const mappedTabs = SUGA4U_TABS.map(tab => {
        if (tab.id === "chat") return { ...tab, badge: chatUnread };
        if (tab.id === "requests") return { ...tab, badge: requestsUnread };
        return tab;
    });

    // Private 1-on-1 call
    const privateCall = usePrivateCall(roomId, user?.id || null, "creator");

    // Group call after vote goal reached
    const groupCall = useGroupCall(roomId, user?.id || null, "creator", "suga/group-vote");

    useEffect(() => {
        if (!roomId) return;
        const supabase = createClient();
        const channel = supabase.channel(`toaster_creator_${roomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suga_paid_requests', filter: `room_id=eq.${roomId}` }, (payload: any) => {
                const r = payload.new;
                toast.success(`New Paid Request from ${r.fan_name}`, {
                    description: `${r.label} (${cs()}${r.price})`,
                    duration: 5000,
                });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    useEffect(() => {
        if (!user || !sessionId) return;
        async function findRoom() {
            // Fetch room_id from the session (most reliable)
            const { data: session } = await supabase
                .from("room_sessions")
                .select("room_id")
                .eq("id", sessionId)
                .single();

            if (session?.room_id) {
                setRoomId(session.room_id);
                return;
            }

            // Fallback: Find creator's suga-4-u room
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
            className="s4u-creator-theme min-h-[100dvh] lg:h-screen lg:overflow-hidden relative"
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
            <div className="relative z-10 p-2 max-w-[1400px] mx-auto flex flex-col min-h-[100dvh] lg:h-screen">
                
                {/* Top Header Row */}
                <div className="mb-0 shrink-0 flex items-center justify-between min-h-[44px]">
                    <button
                        onClick={() => setShowExitModal(true)}
                        className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <RoomTourHelpButton tourType="suga4u_creator" accentHsl="340, 75%, 55%" />
                        {/* Invite button */}
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md"
                            title="Invite fans"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                        {/* Incoming 1-on-1 notifications */}
                        <div className="relative" data-incoming-btn>
                            <button
                                onClick={() => setShowIncomingPanel(prev => !prev)}
                                className="relative h-9 px-2 sm:px-3 rounded-xl bg-pink-600/80 border border-pink-400/30 flex items-center gap-1.5 text-white text-xs font-semibold hover:bg-pink-500/90 transition-all backdrop-blur-md shadow-lg shadow-pink-900/20"
                            >
                                <Phone className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Incoming</span>
                                {privateCall.pendingCalls.length > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold shadow-lg shadow-red-500/50 animate-pulse border-2 border-[#1a1a2e]">
                                        {privateCall.pendingCalls.length}
                                    </span>
                                )}
                            </button>
                            <S4uIncomingCallsPanel
                                isOpen={showIncomingPanel}
                                onClose={() => setShowIncomingPanel(false)}
                                pendingCalls={privateCall.pendingCalls}
                                isLoading={privateCall.isLoading}
                                onAccept={(callId) => {
                                    privateCall.acceptCall(callId);
                                    setShowIncomingPanel(false);
                                }}
                                onDecline={(callId) => {
                                    privateCall.declineCall(callId);
                                }}
                            />
                        </div>
                        <SessionLiveControls
                            sessionId={sessionId!}
                            onEnd={() => router.push("/rooms/suga4u-creator")}
                            accentHsl="340, 75%, 55%"
                        />
                    </div>
                </div>

                {/* Main grid — responsive */}
                <div className="flex-1 min-h-0 pt-2 pb-16 lg:pb-2 overflow-y-auto lg:overflow-hidden">
                    {/* Desktop: 4-col grid */}
                    <div className="hidden lg:grid grid-cols-4 gap-4 h-full">
                        {/* Left column: Live Chat (Full Height) */}
                        <div className="col-span-1 flex flex-col gap-4 min-h-0 suga-creator-live-chat">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <S4uLiveChat roomId={roomId || undefined} sessionId={sessionId || undefined} />
                            </div>
                        </div>

                        {/* Column 2: Pending Requests + Group Vote */}
                        <div className="col-span-1 flex flex-col gap-4 min-h-0">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <S4uPendingRequests roomId={roomId || undefined} sessionId={sessionId || undefined} />
                            </div>
                            <div className="shrink-0 flex flex-col">
                                <S4uCreatorGroupVote
                                    roomId={roomId || undefined}
                                    onStartCall={() => groupCall.initiateCall('sugar')}
                                />
                            </div>
                        </div>

                        {/* Column 3: Creators Favorites + Session Summary */}
                        <div className="col-span-1 flex flex-col gap-4 min-h-0 suga-creator-favorites">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <S4uCreatorsFavorites roomId={roomId || undefined} sessionId={sessionId || undefined} />
                            </div>
                            <div className="shrink-0">
                                <S4uSessionSummary roomId={roomId || undefined} sessionId={sessionId || undefined} />
                            </div>
                        </div>

                        {/* Right column: Creator Secrets + Live Stream */}
                        <div className="col-span-1 flex flex-col gap-4 min-h-0">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <S4uCreatorSecrets roomId={roomId || undefined} sessionId={sessionId || undefined} />
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

                    {/* Mobile: Stream always on top + tab content below */}
                    <div className="lg:hidden flex flex-col gap-3">
                        {/* Stream — always visible at top */}
                        <div className="s4u-creator-glass-panel p-3 shrink-0">
                            <div className="relative rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center aspect-square max-h-[360px] mx-auto">
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

                        {/* Tab content below stream */}
                        {mobileTab === "chat" && (
                            <div className="min-h-[300px]" style={{ height: "calc(100dvh - 360px)" }}>
                                <S4uLiveChat roomId={roomId || undefined} sessionId={sessionId || undefined} />
                            </div>
                        )}

                        {mobileTab === "requests" && (
                            <div className="flex flex-col gap-4">
                                <div className="min-h-[300px]">
                                    <S4uPendingRequests roomId={roomId || undefined} sessionId={sessionId || undefined} />
                                </div>
                                <S4uCreatorGroupVote
                                    roomId={roomId || undefined}
                                    onStartCall={() => groupCall.initiateCall('sugar')}
                                />
                                <S4uSessionSummary roomId={roomId || undefined} sessionId={sessionId || undefined} />
                            </div>
                        )}

                        {mobileTab === "favorites" && (
                            <div className="flex flex-col gap-4">
                                <div className="min-h-[300px]">
                                    <S4uCreatorsFavorites roomId={roomId || undefined} sessionId={sessionId || undefined} />
                                </div>
                                <S4uCreatorSecrets roomId={roomId || undefined} sessionId={sessionId || undefined} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Tab Bar */}
            <MobileStudioTabs
                tabs={mappedTabs}
                activeTab={mobileTab}
                onTabChange={setMobileTab}
                accentHsl="340, 75%, 55%"
            />

            {/* Invite Modal */}
            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                roomId={roomId}
            />

            {/* Incoming Invitation Popup */}
            <InvitationPopup />

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

            <CreatorExitModal
                isOpen={showExitModal}
                onClose={() => setShowExitModal(false)}
                onEndSession={async () => {
                    const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/end`, { method: "POST" });
                    if (res.ok) router.push("/rooms/suga4u-creator");
                }}
                onMinimizeSession={() => router.push("/rooms/suga4u-creator")}
                roomName="Suga4U"
                accentHsl="340, 75%, 55%"
            />

            {/* Group Call Creator Modal */}
            {groupCall.callState && user && (
                <GroupCallCreatorModal
                    callState={groupCall.callState}
                    userId={user.id}
                    creatorName={`${user.user_metadata?.full_name || "Creator"} (You)`}
                    onEndCall={groupCall.endCall}
                    onDismiss={groupCall.dismiss}
                />
            )}
        </div>
    );
};

export default Suga4UCreatorPage;
