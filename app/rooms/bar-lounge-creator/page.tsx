"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Phone, Video, MessageCircle, Inbox, BarChart3 } from "lucide-react";

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
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";
import RoomTourHelpButton from "@/components/rooms/shared/RoomTourHelpButton";

const BAR_LOUNGE_TABS: MobileStudioTab[] = [
    { id: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
    { id: "requests", label: "Requests", icon: <Inbox className="w-5 h-5" /> },
    { id: "summary", label: "Summary", icon: <BarChart3 className="w-5 h-5" /> },
];

const CreatorBarLoungeInner = () => {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const supabase = createClient();

    const [roomId, setRoomId] = useState<string | undefined>(undefined);
    const [sessionTitle, setSessionTitle] = useState<string | undefined>(undefined);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showIncomingCallsPanel, setShowIncomingCallsPanel] = useState(false);
    const [mobileTab, setMobileTab] = useState("chat");
    const [chatUnread, setChatUnread] = useState(0);
    const [requestsUnread, setRequestsUnread] = useState(0);
    const [summaryUnread, setSummaryUnread] = useState(false);

    const activeTabRef = useRef(mobileTab);
    useEffect(() => {
        activeTabRef.current = mobileTab;
        if (mobileTab === "chat") {
            setChatUnread(0);
        }
        if (mobileTab === "summary") {
            setSummaryUnread(false);
        }
    }, [mobileTab]);

    useEffect(() => {
        if (!roomId) return;

        const fetchInitialCounts = async () => {
            let q = supabase
                .from("bar_lounge_requests")
                .select("id", { count: "exact", head: true })
                .eq("room_id", roomId)
                .eq("status", "pending");
            if (sessionId) q = q.eq("session_id", sessionId);
            const { count } = await q;
            if (count !== null) {
                setRequestsUnread(count);
            }
        };
        fetchInitialCounts();

        const channel = supabase
            .channel(`unread-badges-bar-lounge-${roomId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "bar_lounge_messages", filter: `room_id=eq.${roomId}` },
                (payload) => {
                    const newMsg = payload.new as any;
                    if (sessionId && newMsg.session_id !== sessionId) return;
                    if (activeTabRef.current !== "chat") {
                        setChatUnread((prev) => prev + 1);
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "bar_lounge_requests", filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    if (payload.eventType === "INSERT" && activeTabRef.current !== "summary") {
                        setSummaryUnread(true);
                    }
                    let q = supabase
                        .from("bar_lounge_requests")
                        .select("id", { count: "exact", head: true })
                        .eq("room_id", roomId)
                        .eq("status", "pending");
                    if (sessionId) q = q.eq("session_id", sessionId);
                    const { count } = await q;
                    if (count !== null) {
                        setRequestsUnread(count);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, sessionId]);

    const mappedTabs = BAR_LOUNGE_TABS.map(tab => {
        if (tab.id === "chat") return { ...tab, badge: chatUnread };
        if (tab.id === "requests") return { ...tab, badge: requestsUnread };
        if (tab.id === "summary") return { ...tab, badge: summaryUnread };
        return tab;
    });

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
            className="h-[100dvh] w-screen bg-cover bg-center bg-no-repeat relative flex flex-col fd-bar-lounge-creator-theme overflow-hidden"
            style={{ backgroundImage: "url('/rooms/bar-lounge/lounge-bg-v2.png')" }}
        >
            {/* Top Bar */}
            <div className="relative z-20 flex items-center justify-between sm:justify-center px-3 sm:px-4 py-2 sm:py-3 glass-panel rounded-none border-x-0 border-t-0 min-h-[56px] sm:min-h-[70px]">
                <div className="sm:absolute sm:left-4 flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => setShowExitModal(true)}
                        className="glass-panel px-2 sm:px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-white/10 transition-colors"
                        style={{ borderColor: "hsla(45, 90%, 55%, 0.3)", color: "hsl(45, 90%, 55%)" }}
                        data-tour="bar-room-info"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-sm font-medium hidden md:inline">Back</span>
                    </button>
                    <div className="hidden sm:block">
                        <WalletPill />
                    </div>
                </div>
                <div className="text-center hidden sm:block">
                    <h1 className="text-xl lg:text-2xl gold-text" style={{ fontFamily: "'Pacifico', cursive" }}>Bar Lounge</h1>
                    <p className="text-[10px] font-medium uppercase tracking-widest flex items-center justify-center gap-2" style={{ color: "hsl(280, 15%, 55%)" }}>
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        {sessionTitle || "Live Session"}
                    </p>
                </div>
                <div className="absolute right-2 sm:right-4 flex items-center gap-1.5 sm:gap-2">
                    <RoomTourHelpButton tourType="bar_lounge_creator" accentHsl="45, 90%, 55%" />
                    {/* Incoming 1-on-1 calls */}
                    <div className="relative" data-incoming-btn data-tour="bar-incoming-button">
                        <button
                            onClick={() => setShowIncomingCallsPanel(prev => !prev)}
                            className="relative h-8 sm:h-9 px-2 sm:px-3 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all backdrop-blur-md shadow-lg"
                            style={{
                                background: "hsla(320, 80%, 45%, 0.8)",
                                border: "1px solid hsla(320, 80%, 60%, 0.4)",
                                color: "#fff",
                                boxShadow: "0 0 15px hsla(320, 80%, 50%, 0.3)",
                            }}
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
                    <div data-tour="bar-start-end-room">
                        <SessionLiveControls
                            sessionId={sessionId!}
                            onEnd={() => router.push("/rooms/bar-lounge-creator")}
                            accentHsl="45, 90%, 55%"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 min-h-0 w-full p-2 sm:p-4 max-w-[1600px] mx-auto overflow-hidden flex flex-col pb-20 lg:pb-4">
                {/* Desktop: 3-col grid */}
                <div className="hidden lg:grid w-full h-full grid-cols-[320px_1fr_320px] xl:grid-cols-[380px_1fr_380px] 2xl:grid-cols-[420px_1fr_420px] gap-4">
                    {/* Left - Chat */}
                    <div className="h-full flex min-h-[400px] bar-lounge-chat" data-tour="bar-lounge-chat">
                        <LoungeChat roomId={roomId} sessionId={sessionId} />
                    </div>

                    {/* Center - Video */}
                    <div className="h-full flex items-center justify-center w-full min-h-[400px]" data-tour="bar-tips-drinks-guide">
                        <div className="w-full h-full">
                            <VideoStage roomId={roomId} />
                        </div>
                    </div>

                    {/* Right - Requests & Summary */}
                    <div className="flex flex-col gap-4 h-full min-h-[400px] bar-incoming-section" data-tour="bar-incoming-section">
                        <div className="flex-1 min-h-0">
                            <IncomingRequests
                                roomId={roomId}
                                sessionId={sessionId}
                                pendingPrivateCalls={privateCall.pendingCalls}
                                onAcceptPrivateCall={privateCall.acceptCall}
                                onDeclinePrivateCall={privateCall.declineCall}
                            />
                        </div>
                        <SummaryPanel roomId={roomId} sessionId={sessionId} />
                    </div>
                </div>

                {/* Mobile: Stream always on top + tab content below */}
                <div className="lg:hidden flex flex-col gap-3 flex-1 min-h-0 overflow-hidden w-full">
                    {/* Video — always visible at top */}
                    <div className="w-full shrink-0 aspect-video max-w-[600px] mx-auto rounded-xl overflow-hidden border border-[hsla(45,90%,55%,0.2)]">
                        <VideoStage roomId={roomId} />
                    </div>

                    {/* Tab content below stream */}
                    {mobileTab === "chat" && (
                        <div className="w-full flex-1 min-h-0">
                            <LoungeChat roomId={roomId} sessionId={sessionId} />
                        </div>
                    )}

                    {mobileTab === "requests" && (
                        <div className="w-full flex-1 min-h-0">
                            <IncomingRequests
                                roomId={roomId}
                                sessionId={sessionId}
                                pendingPrivateCalls={privateCall.pendingCalls}
                                onAcceptPrivateCall={privateCall.acceptCall}
                                onDeclinePrivateCall={privateCall.declineCall}
                            />
                        </div>
                    )}

                    {mobileTab === "summary" && (
                        <div className="w-full flex-1 min-h-0 overflow-y-auto pb-4">
                            <SummaryPanel roomId={roomId} sessionId={sessionId} />
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Tab Bar */}
            <MobileStudioTabs
                tabs={mappedTabs}
                activeTab={mobileTab}
                onTabChange={setMobileTab}
                accentHsl="45, 90%, 55%"
            />

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

export default function CreatorBarLounge() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(270, 40%, 6%)" }}>
                <div className="w-8 h-8 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
        }>
            <CreatorBarLoungeInner />
        </Suspense>
    );
}
