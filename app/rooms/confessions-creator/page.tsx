"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Video, LayoutList, MessageCircle } from "lucide-react";
import dynamic from "next/dynamic";
import ConfessionsTopBar from "@/components/rooms/confessions-creator/ConfessionsTopBar";
import ConfessionsLeftSidebar from "@/components/rooms/confessions-creator/ConfessionsLeftSidebar";
import ConfessionsCenterContent from "@/components/rooms/confessions-creator/ConfessionsCenterContent";
import ConfessionsLiveChat from "@/components/rooms/confessions-creator/ConfessionsLiveChat";
import ConfessionsFloatingHearts from "@/components/rooms/confessions-creator/ConfessionsFloatingHearts";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";
import CreatorExitModal from "@/components/rooms/shared/CreatorExitModal";
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";
import RoomTourHelpButton from "@/components/rooms/shared/RoomTourHelpButton";
import { useGuidedTour } from "@/components/guided-tour/GuidedTourProvider";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || undefined;

const CONFESSIONS_TABS: MobileStudioTab[] = [
    { id: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
    { id: "requests", label: "Requests", icon: <LayoutList className="w-5 h-5" /> },
    { id: "sidebar", label: "Studio", icon: <Video className="w-5 h-5" /> },
];

const ConfessionsCreatorPage = () => {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const supabase = createClient();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isWrongUser, setIsWrongUser] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [mobileTab, setMobileTab] = useState("chat");
    const [isMobile, setIsMobile] = useState<boolean | null>(null);
    const [creatorAvatar, setCreatorAvatar] = useState<string>("");
    const [creatorName, setCreatorName] = useState<string>("Creator");
    const router = useRouter();

    const { activeTour, currentStep } = useGuidedTour();

    useEffect(() => {
        if (!user) return;
        async function fetchProfile() {
            const { data: profile } = await supabase
                .from("profiles")
                .select("avatar_url, full_name")
                .eq("id", user.id)
                .single();
            if (profile) {
                setCreatorAvatar(profile.avatar_url || "");
                setCreatorName(profile.full_name || "Creator");
            }
        }
        fetchProfile();
    }, [user, supabase]);

    useEffect(() => {
        if (activeTour === "confession_creator") {
            if (currentStep === 0) setMobileTab("requests");
            else if (currentStep === 1) setMobileTab("requests");
            else if (currentStep === 2) setMobileTab("requests");
            else if (currentStep === 3) setMobileTab("sidebar");
            else if (currentStep === 5) setMobileTab("sidebar");
            else if (currentStep === 6) setMobileTab("sidebar");
            else if (currentStep === 7) setMobileTab("sidebar");
            else if (currentStep === 8) setMobileTab("chat");
        }
    }, [activeTour, currentStep]);

    const [chatUnread, setChatUnread] = useState(0);
    const [requestsUnread, setRequestsUnread] = useState(0);

    const activeTabRef = useRef(mobileTab);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        activeTabRef.current = mobileTab;
        if (mobileTab === "chat") {
            setChatUnread(0);
        }
        if (mobileTab === "requests") {
            setRequestsUnread(0);
        }
    }, [mobileTab]);

    useEffect(() => {
        if (!roomId) return;

        const fetchInitialCounts = async () => {
            let q = supabase
                .from("confession_requests")
                .select("id", { count: "exact", head: true })
                .eq("room_id", roomId)
                .eq("status", "pending_approval");
            if (sessionId) q = q.eq("session_id", sessionId);
            const { count } = await q;
            if (count !== null) {
                setRequestsUnread(activeTabRef.current === "requests" ? 0 : count);
            }
        };
        fetchInitialCounts();

        const channel = supabase
            .channel(`unread-badges-confessions-${roomId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "room_chat_messages", filter: `room_id=eq.${roomId}` },
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
                { event: "*", schema: "public", table: "confession_requests", filter: `room_id=eq.${roomId}` },
                async () => {
                    let q = supabase
                        .from("confession_requests")
                        .select("id", { count: "exact", head: true })
                        .eq("room_id", roomId)
                        .eq("status", "pending_approval");
                    if (sessionId) q = q.eq("session_id", sessionId);
                    const { count } = await q;
                    if (count !== null) {
                        setRequestsUnread(activeTabRef.current === "requests" ? 0 : count);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, sessionId]);

    const mappedTabs = CONFESSIONS_TABS.map(tab => {
        if (tab.id === "chat") return { ...tab, badge: chatUnread };
        if (tab.id === "requests") return { ...tab, badge: requestsUnread };
        return tab;
    });

    useEffect(() => {
        if (!user) return;
        async function findRoom() {
            // Try to get room_id from the active session first (most reliable)
            if (sessionId) {
                const { data: session } = await supabase
                    .from("room_sessions")
                    .select("room_id, creator_id")
                    .eq("id", sessionId)
                    .maybeSingle();
                if (session?.room_id) {
                    setRoomId(session.room_id);
                    if (session.creator_id !== user?.id) {
                        setIsWrongUser(true);
                    }
                    return;
                }
            }
            // Fallback: find the creator's confessions room
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
    }, [user, sessionId]);

    if (!sessionId) {
        return (
            <RoomSessionDashboard
                roomType="confessions"
                roomEmoji="💜"
                roomLabel="Confessions"
                creatorPageRoute="/rooms/confessions-creator"
                accentHsl="280, 70%, 60%"
                accentHslSecondary="320, 65%, 55%"
                backgroundImage="/rooms/confessions-creator-bg.png"
            />
        );
    }

    return (
        <div
            className="conf-theme h-[100dvh] w-screen overflow-hidden relative"
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
            <div className="relative z-10 flex flex-col h-full overflow-hidden">
                {/* Top bar — responsive */}
                <ConfessionsTopBar
                    onBack={() => setShowExitModal(true)}
                    rightElement={
                        <>
                            <RoomTourHelpButton tourType="confession_creator" accentHsl="280, 70%, 60%" />
                            {isWrongUser && (
                                <div className="bg-red-500/20 text-red-500 border border-red-500 px-2 py-0.5 rounded-full text-[9px] font-bold animate-pulse flex items-center gap-1">
                                    <span>⚠️</span>
                                    <span className="hidden xs:inline">WRONG ACCOUNT</span>
                                    <span className="xs:hidden">ERR</span>
                                </div>
                            )}
                            <div data-tour="confession-start-end-room">
                                <SessionLiveControls
                                    sessionId={sessionId!}
                                    onEnd={() => router.push("/rooms/confessions-creator")}
                                    accentHsl="280, 70%, 60%"
                                />
                            </div>
                        </>
                    }
                />

                {isMobile === null ? (
                    <div className="flex-grow flex items-center justify-center text-white/50 text-xs font-semibold">Initializing studio layout...</div>
                ) : isMobile ? (
                    <div className="flex-1 flex flex-col gap-3 px-3 pb-20 overflow-hidden min-h-0">
                        {/* Mobile Stream — always fixed at top below header */}
                        <div className="w-full shrink-0 aspect-video max-w-[500px] mx-auto rounded-xl overflow-hidden shadow-lg border border-purple-500/20 relative bg-black/40 mt-2">
                            {roomId && user ? (
                                <LiveStreamWrapper
                                    role="host"
                                    appId={APP_ID}
                                    roomId={roomId}
                                    uid={user.id}
                                    hostId={user.id}
                                    hostAvatarUrl={creatorAvatar || user.user_metadata?.avatar_url || ""}
                                    hostName={creatorName || user.user_metadata?.full_name || "Creator"}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                                    Connecting to stream...
                                </div>
                            )}
                            <div className="absolute top-3 left-3 bg-[hsl(0,85%,55%)] text-white text-xs font-bold px-3 py-1 rounded-md conf-live-pulse tracking-wide pointer-events-none z-10">
                                LIVE
                            </div>
                        </div>

                        {/* Active Tab Content */}
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                            {mobileTab === "chat" && (
                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden confession-live-chat" data-tour="confession-live-chat">
                                    <ConfessionsLiveChat roomId={roomId} sessionId={sessionId} />
                                </div>
                            )}
                            {mobileTab === "requests" && (
                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                    <ConfessionsCenterContent variant="confessions" roomId={roomId} sessionId={sessionId} />
                                </div>
                            )}
                            {mobileTab === "sidebar" && (
                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                    <ConfessionsLeftSidebar sessionId={sessionId} roomId={roomId} isMobile={true} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-row items-stretch gap-4 lg:gap-8 xl:gap-16 px-3 sm:px-4 pb-4 overflow-hidden xl:mx-40 min-h-0 mt-4">
                        {/* Left Sidebar */}
                        <div className="flex flex-col w-[320px] xl:w-[380px] min-h-0 overflow-hidden shrink-0">
                            <ConfessionsLeftSidebar sessionId={sessionId} roomId={roomId} isMobile={false} />
                        </div>

                        {/* Desktop Center - Requests Table */}
                        <div className="flex-grow flex-1 min-h-0 overflow-hidden flex flex-col">
                            <ConfessionsCenterContent variant="confessions" roomId={roomId} sessionId={sessionId} />
                        </div>

                        {/* Live Chat */}
                        <div className="flex flex-col w-[320px] xl:w-[380px] min-h-0 overflow-hidden confession-live-chat shrink-0" data-tour="confession-live-chat">
                            <ConfessionsLiveChat roomId={roomId} sessionId={sessionId} />
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Tab Bar — hidden on lg+ */}
            {isMobile && (
                <MobileStudioTabs
                    tabs={mappedTabs}
                    activeTab={mobileTab}
                    onTabChange={setMobileTab}
                    accentHsl="280, 70%, 60%"
                />
            )}

            <CreatorExitModal
                isOpen={showExitModal}
                onClose={() => setShowExitModal(false)}
                onEndSession={async () => {
                    const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/end`, { method: "POST" });
                    if (res.ok) router.push("/rooms/confessions-creator");
                }}
                onMinimizeSession={() => router.push("/rooms/confessions-creator")}
                roomName="Confessions"
                accentHsl="280, 70%, 60%"
            />
        </div>
    );
};

export default ConfessionsCreatorPage;
