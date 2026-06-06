"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Video, LayoutList, MessageCircle } from "lucide-react";
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

const CONFESSIONS_TABS: MobileStudioTab[] = [
    { id: "sidebar", label: "Sidebar", icon: <LayoutList className="w-5 h-5" /> },
    { id: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
];

const ConfessionsCreatorPage = () => {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const supabase = createClient();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isWrongUser, setIsWrongUser] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [mobileTab, setMobileTab] = useState("sidebar");
    const router = useRouter();

    const [chatUnread, setChatUnread] = useState(0);
    const [requestsUnread, setRequestsUnread] = useState(0);

    useEffect(() => {
        if (mobileTab === "chat") {
            setChatUnread(0);
        }
    }, [mobileTab]);

    useEffect(() => {
        if (mobileTab === "sidebar") {
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
                setRequestsUnread(count);
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
                    if (mobileTab !== "chat") {
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
                        setRequestsUnread(count);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, sessionId, mobileTab]);

    const mappedTabs = CONFESSIONS_TABS.map(tab => {
        if (tab.id === "chat") return { ...tab, badge: chatUnread };
        if (tab.id === "sidebar") return { ...tab, badge: requestsUnread };
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
                <div className="relative flex items-center shrink-0">
                    <div className="flex-1">
                        <ConfessionsTopBar onBack={() => setShowExitModal(true)} />
                    </div>
                    <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 sm:gap-4">
                        <RoomTourHelpButton tourType="confession_creator" accentHsl="280, 70%, 60%" />
                        {isWrongUser && (
                            <div className="bg-red-500/20 text-red-500 border border-red-500 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold animate-pulse flex items-center gap-1 sm:gap-2">
                                <span>⚠️</span>
                                <span className="hidden sm:inline">WRONG ACCOUNT (RLS BLOCKED)</span>
                                <span className="sm:hidden">RLS ERR</span>
                            </div>
                        )}
                        <div data-tour="confession-start-end-room">
                            <SessionLiveControls
                                sessionId={sessionId!}
                                onEnd={() => router.push("/rooms/confessions-creator")}
                                accentHsl="280, 70%, 60%"
                            />
                        </div>
                    </div>
                </div>

                {/* Main content — responsive 3-col → mobile: content on top + tabs below */}
                <div className="flex-1 flex flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-8 xl:gap-16 px-3 sm:px-4 pb-20 lg:pb-4 overflow-hidden xl:mx-40 min-h-0">
                    {/* Desktop Center / Mobile Top - Confessions Center Content (Widescreen Video/Feed) */}
                    <div className="w-full shrink-0 lg:flex-1 lg:min-h-0 aspect-video lg:aspect-auto max-w-[600px] lg:max-w-none mx-auto lg:mx-0 rounded-xl overflow-hidden shadow-lg border border-purple-500/20 order-1 lg:order-2">
                        <ConfessionsCenterContent variant="confessions" roomId={roomId} sessionId={sessionId} />
                    </div>

                    {/* Left Sidebar (Mobile: bottom tab "sidebar") */}
                    <div className={`${mobileTab === "sidebar" ? "flex" : "hidden"} lg:flex flex-col flex-1 lg:flex-none lg:w-[320px] xl:w-[380px] min-h-0 overflow-hidden order-2 lg:order-1 confession-my-requests`} data-tour="confession-my-requests">
                        <ConfessionsLeftSidebar sessionId={sessionId} roomId={roomId} />
                    </div>

                    {/* Live Chat (Mobile: bottom tab "chat") */}
                    <div className={`${mobileTab === "chat" ? "flex" : "hidden"} lg:flex flex-col flex-1 lg:flex-none lg:w-[320px] xl:w-[380px] min-h-0 overflow-hidden order-3 confession-live-chat`} data-tour="confession-live-chat">
                        <ConfessionsLiveChat roomId={roomId} sessionId={sessionId} />
                    </div>
                </div>
            </div>

            {/* Mobile Tab Bar — hidden on lg+ */}
            <MobileStudioTabs
                tabs={mappedTabs}
                activeTab={mobileTab}
                onTabChange={setMobileTab}
                accentHsl="280, 70%, 60%"
            />

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
