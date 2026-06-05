"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, ClipboardList, BarChart3, Video } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import LiveDropBoard from "@/components/rooms/flashdrop-creator/LiveDropBoard";
import SummaryBox from "@/components/rooms/flashdrop-creator/SummaryBox";
import HighRollerPacks from "@/components/rooms/flashdrop-creator/HighRollerPacks";
import DropRequests from "@/components/rooms/flashdrop-creator/DropRequests";

import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";
import FlashDropLiveChat from "@/components/rooms/flash-drops/FlashDropLiveChat";
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";
import CreatorExitModal from "@/components/rooms/shared/CreatorExitModal";
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";
import "./flashdrop-creator.css";
import RoomTourHelpButton from "@/components/rooms/shared/RoomTourHelpButton";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const FLASH_DROP_TABS: MobileStudioTab[] = [
    { id: "board", label: "Board", icon: <BarChart3 className="w-5 h-5" /> },
    { id: "requests", label: "Requests", icon: <ClipboardList className="w-5 h-5" /> },
    { id: "chat", label: "Chat", icon: <MessageSquare className="w-5 h-5" /> },
];

function FlashdropCreatorStudio() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const supabase = createClient();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [showExitModal, setShowExitModal] = useState(false);
    const [mobileTab, setMobileTab] = useState("board");

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

        const fetchInitialCounts = async () => {
            let q = supabase
                .from("flash_drop_requests")
                .select("id, content")
                .eq("room_id", roomId)
                .eq("status", "pending");
            if (sessionId) q = q.eq("session_id", sessionId);
            const { data } = await q;
            if (data) {
                const count = data.filter(r => !r.content.includes('Impulse') && !r.content.includes('Reaction') && !r.content.includes('Purchased Pack')).length;
                setRequestsUnread(count);
            }
        };
        fetchInitialCounts();

        const channel = supabase
            .channel(`unread-badges-flash-drop-${roomId}`)
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
                { event: "*", schema: "public", table: "flash_drop_requests", filter: `room_id=eq.${roomId}` },
                async () => {
                    let q = supabase
                        .from("flash_drop_requests")
                        .select("id, content")
                        .eq("room_id", roomId)
                        .eq("status", "pending");
                    if (sessionId) q = q.eq("session_id", sessionId);
                    const { data } = await q;
                    if (data) {
                        const count = data.filter(r => !r.content.includes('Impulse') && !r.content.includes('Reaction') && !r.content.includes('Purchased Pack')).length;
                        setRequestsUnread(count);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, sessionId, mobileTab]);

    const mappedTabs = FLASH_DROP_TABS.map(tab => {
        if (tab.id === "chat") return { ...tab, badge: chatUnread };
        if (tab.id === "requests") return { ...tab, badge: requestsUnread };
        return tab;
    });

    useEffect(() => {
        if (!user) return;
        async function findRoom() {
            if (sessionId) {
                const { data: session } = await supabase
                    .from("room_sessions")
                    .select("room_id")
                    .eq("id", sessionId)
                    .single();

                if (session?.room_id) {
                    setRoomId(session.room_id);
                    return;
                }
            }

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
            className="flashdrop-creator-theme min-h-[100dvh] lg:h-screen lg:overflow-hidden bg-background bg-cover bg-center bg-no-repeat relative"
            style={{ backgroundImage: "url('/flash-drops/nightclub-bg.png')" }}
        >
            {/* Overlay for readability */}
            <div className="absolute inset-0 bg-background/40" />

            <div className="relative z-10 px-2 sm:px-3 py-2 flex flex-col gap-2 sm:gap-3 min-h-[100dvh] lg:h-screen lg:overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center shrink-0 relative min-h-[44px]">
                    <button
                        onClick={() => setShowExitModal(true)}
                        className="glass-card rounded-lg px-2.5 sm:px-3 py-2 hover:bg-primary/20 transition-colors absolute left-0 flex items-center gap-1.5 sm:gap-2 cursor-pointer z-50"
                    >
                        <ArrowLeft className="text-primary" size={18} />
                        <span className="text-xs font-bold text-primary hidden sm:block">Back</span>
                    </button>
                    <h1 className="font-display text-lg sm:text-2xl md:text-4xl font-black neon-text tracking-widest text-center w-full truncate px-16 sm:px-24">
                        Flash Drop — Creator Room
                    </h1>
                    <div className="absolute right-0 z-50 flex items-center gap-2">
                        <RoomTourHelpButton tourType="flashdrop_creator" accentHsl="170, 80%, 50%" />
                        <div data-tour="flashdrop-live-stream">
                            <SessionLiveControls
                                sessionId={sessionId!}
                                onEnd={() => router.push("/rooms/flash-drop-creator")}
                                accentHsl="170, 80%, 50%"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Grid — responsive: 1-col mobile (tabs), 2-col tablet, 4-col desktop */}
                <div className="flex-1 min-h-0 pb-16 lg:pb-0 overflow-y-auto lg:overflow-hidden">
                    {/* Desktop/Tablet: Grid layout */}
                    <div className="hidden lg:flex gap-3 h-full min-h-0">
                        {/* 1st: Summary Box + Live Drop Board */}
                        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0 overflow-hidden flashdrop-summary-box" data-tour="flashdrop-summary-box">
                            <SummaryBox roomId={roomId} sessionId={sessionId} />
                            <LiveDropBoard roomId={roomId ?? undefined} sessionId={sessionId} />
                        </div>

                        {/* 2nd: Video + High Roller Packs */}
                        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0 overflow-y-auto" data-tour="flashdrop-high-roller-packs">
                            <div className="rounded-xl overflow-hidden shrink-0" style={{ height: "360px", border: "1px solid rgba(255,255,255,0.1)" }}>
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
                            <HighRollerPacks roomId={roomId} sessionId={sessionId} />
                        </div>

                        {/* 3rd: Custom Request Drops */}
                        <div className="flex-1 min-w-0 flex flex-col min-h-0 glass-panel rounded-xl overflow-hidden" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }} data-tour="flashdrop-custom-request-drops">
                            <div className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-b border-white/[0.06]">
                                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(280 80% 55%), hsl(330 100% 55%))' }}>
                                    <ClipboardList size={10} className="text-white" />
                                </div>
                                <span className="text-xs font-black font-display tracking-wider uppercase" style={{ color: 'hsl(330 100% 75%)', textShadow: '0 0 10px hsl(330 100% 55% / 0.3)' }}>Custom Request Drops</span>
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <DropRequests
                                    className="h-full border-none rounded-none"
                                    roomId={roomId ?? undefined}
                                    sessionId={sessionId}
                                />
                            </div>
                        </div>

                        {/* 4th: Live Chat */}
                        <div className="flex-1 min-w-0 flex flex-col min-h-0 glass-panel rounded-xl overflow-hidden flashdrop-live-chat" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }} data-tour="flashdrop-live-chat">
                            <div className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-b border-white/[0.06]">
                                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(200 80% 50%), hsl(170 80% 45%))' }}>
                                    <MessageSquare size={10} className="text-white" />
                                </div>
                                <span className="text-xs font-black font-display tracking-wider uppercase" style={{ color: 'hsl(330 100% 75%)', textShadow: '0 0 10px hsl(330 100% 55% / 0.3)' }}>Live Chat</span>
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

                    {/* Mobile: Stream always on top + tab content below */}
                    <div className="lg:hidden flex flex-col gap-3">
                        {/* Stream — always visible at top */}
                        <div className="rounded-xl overflow-hidden shrink-0 aspect-square max-h-[360px] mx-auto w-full" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
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

                        {/* Tab content below stream */}
                        {/* Board tab */}
                        {mobileTab === "board" && (
                            <div className="flex flex-col gap-3">
                                <SummaryBox roomId={roomId} sessionId={sessionId} />
                                <LiveDropBoard roomId={roomId ?? undefined} sessionId={sessionId} />
                                <HighRollerPacks roomId={roomId} sessionId={sessionId} />
                            </div>
                        )}

                        {/* Requests tab */}
                        {mobileTab === "requests" && (
                            <div className="glass-panel rounded-xl overflow-hidden min-h-[400px]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                <div className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-b border-white/[0.06]">
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(280 80% 55%), hsl(330 100% 55%))' }}>
                                        <ClipboardList size={10} className="text-white" />
                                    </div>
                                    <span className="text-xs font-black font-display tracking-wider uppercase" style={{ color: 'hsl(330 100% 75%)', textShadow: '0 0 10px hsl(330 100% 55% / 0.3)' }}>Custom Request Drops</span>
                                </div>
                                <div className="overflow-y-auto" style={{ maxHeight: "calc(100dvh - 200px)" }}>
                                    <DropRequests
                                        className="border-none rounded-none"
                                        roomId={roomId ?? undefined}
                                        sessionId={sessionId}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Chat tab */}
                        {mobileTab === "chat" && (
                            <div className="glass-panel rounded-xl overflow-hidden min-h-[400px]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                <div className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-b border-white/[0.06]">
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(200 80% 50%), hsl(170 80% 45%))' }}>
                                        <MessageSquare size={10} className="text-white" />
                                    </div>
                                    <span className="text-xs font-black font-display tracking-wider uppercase" style={{ color: 'hsl(330 100% 75%)', textShadow: '0 0 10px hsl(330 100% 55% / 0.3)' }}>Live Chat</span>
                                </div>
                                <div className="overflow-hidden" style={{ height: "calc(100dvh - 200px)" }}>
                                    <FlashDropLiveChat
                                        roomId={roomId}
                                        hostId={user?.id}
                                        variant="creator"
                                        sessionId={sessionId}
                                    />
                                </div>
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
                accentHsl="170, 80%, 50%"
            />

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
                backgroundImage="/flash-drops/nightclub-bg.png"

            />
        );
    }

    return <FlashdropCreatorStudio />;
};

export default FlashdropCreatorRoom;
