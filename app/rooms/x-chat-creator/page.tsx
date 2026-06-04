"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Video, MessageCircle, Inbox, BarChart3 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import dynamic from "next/dynamic";
import LiveChat from "@/components/rooms/x-chat-creator/LiveChat";
import IncomingRequests from "@/components/rooms/x-chat-creator/IncomingRequests";
import SummaryPanel from "@/components/rooms/x-chat-creator/SummaryPanel";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";
import InviteModal from "@/components/rooms/InviteModal";
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";
import CreatorExitModal from "@/components/rooms/shared/CreatorExitModal";
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const XCHAT_TABS: MobileStudioTab[] = [
    { id: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
    { id: "requests", label: "Requests", icon: <Inbox className="w-5 h-5" /> },
    { id: "summary", label: "Summary", icon: <BarChart3 className="w-5 h-5" /> },
];

const XChatCreatorPage = () => {
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const urlRoomId = searchParams.get("roomId");
    const supabase = createClient();
    const [roomId, setRoomId] = useState<string | undefined>(urlRoomId || undefined);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
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
        if (!roomId) return;

        const fetchInitialCounts = async () => {
            let q = supabase
                .from("x_chat_requests")
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
            .channel(`unread-badges-x-chat-${roomId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "x_chat_messages", filter: `room_id=eq.${roomId}` },
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
                { event: "*", schema: "public", table: "x_chat_requests", filter: `room_id=eq.${roomId}` },
                async () => {
                    let q = supabase
                        .from("x_chat_requests")
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
    }, [roomId, sessionId, mobileTab]);

    const mappedTabs = XCHAT_TABS.map(tab => {
        if (tab.id === "chat") return { ...tab, badge: chatUnread };
        if (tab.id === "requests") return { ...tab, badge: requestsUnread };
        return tab;
    });

    // Must be called before any conditional return to satisfy Rules of Hooks
    useEffect(() => {
        if (!sessionId) return; // Only init when we have an active session
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

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

            if (urlRoomId) {
                setRoomId(urlRoomId);
                return;
            }

            // Fallback: Find creator's x-chat room
            const { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('host_id', user.id)
                .eq('type', 'x-chat')
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            let targetRoomId = room?.id;

            if (!targetRoomId) {
                // Auto-create room for the creator
                const { data: newRoom } = await supabase
                    .from('rooms')
                    .insert([{ host_id: user.id, title: "X Chat Room", status: "live", type: "x-chat" }])
                    .select()
                    .single();
                targetRoomId = newRoom?.id;
            }

            if (targetRoomId) {
                setRoomId(targetRoomId);
            }
        }
        init();
    }, [sessionId]);

    if (!sessionId) {
        return (
            <ProtectRoute allowedRoles={["creator"]}>
                <RoomSessionDashboard
                    roomType="x-chat"
                    roomEmoji="💬"
                    roomLabel="X Chat"
                    creatorPageRoute="/rooms/x-chat-creator"
                    accentHsl="45, 90%, 55%"
                    accentHslSecondary="35, 85%, 50%"
                    backgroundImage="/x-chat/casino-bg.jpeg"
                />
            </ProtectRoute>
        );
    }

    return (
        <ProtectRoute allowedRoles={["creator"]}>
            <div
                className="min-h-[100dvh] lg:h-screen w-full bg-background bg-cover bg-center bg-fixed relative fd-x-chat-theme"
                style={{ backgroundImage: "url('/x-chat/casino-bg.jpeg')" }}
            >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-background/20" />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full min-h-[100dvh] lg:h-screen lg:overflow-hidden">
                    {/* Top Bar */}
                    <motion.header
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="panel-glass flex items-center px-3 sm:px-4 py-2 sm:py-3 relative min-h-[48px] sm:min-h-[56px] shrink-0"
                    >
                        <button
                            onClick={() => setShowExitModal(true)}
                            className="flex items-center gap-1 text-foreground hover:text-primary transition-colors absolute left-3 sm:left-4"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm hidden sm:inline">Back</span>
                        </button>
                        <h1
                            className="mx-auto text-lg sm:text-2xl md:text-3xl gold-text truncate px-16 sm:px-24"
                            style={{ fontFamily: "'Pacifico', cursive" }}
                        >
                            <span className="hidden sm:inline">Creators View for </span>X Chat
                        </h1>
                        <div className="absolute right-2 sm:right-4">
                            <SessionLiveControls
                                sessionId={sessionId!}
                                onEnd={() => router.push("/rooms/x-chat-creator")}
                                accentHsl="45, 90%, 55%"
                            />
                        </div>
                    </motion.header>

                    {/* Main layout */}
                    <div className="flex-1 min-h-0 px-2 sm:px-3 pb-20 lg:pb-3 max-w-[1600px] mx-auto w-full overflow-y-auto lg:overflow-hidden">
                        {/* Desktop: 3-col grid */}
                        <div className="hidden lg:grid grid-cols-[400px_1fr_400px] gap-3 h-full">
                            {/* Left - Live Chat */}
                            <div className="flex min-h-0">
                                <LiveChat roomId={roomId} sessionId={sessionId} />
                            </div>

                            {/* Center - Video Feed */}
                            <div className="flex flex-col items-center justify-end w-full px-4 lg:px-12 h-full pb-10">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="relative rounded-xl overflow-hidden aspect-video"
                                    style={{
                                        width: '100%',
                                        maxWidth: '900px',
                                        boxShadow: '0 0 30px rgba(255, 215, 0, 0.35), 0 0 60px rgba(255, 215, 0, 0.15)',
                                        border: '2px solid rgba(255, 215, 0, 0.5)',
                                    }}
                                >
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
                                        <div className="w-full h-full flex items-center justify-center bg-black/60">
                                            <img
                                                src="/x-chat/streamer-male.png"
                                                alt="Creator stream"
                                                className="w-full h-full object-cover object-top"
                                            />
                                        </div>
                                    )}
                                    {/* Stat badge */}
                                    <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-background/70 backdrop-blur-sm rounded-full px-3 py-1">
                                        <span className="text-red-500 text-sm">❤️</span>
                                        <span className="text-sm font-bold text-foreground">800</span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Right - Requests + Summary */}
                            <div className="flex flex-col gap-1 min-h-0 overflow-y-auto scrollbar-thin">
                                <IncomingRequests roomId={roomId} sessionId={sessionId} />
                                <SummaryPanel roomId={roomId} sessionId={sessionId} />
                            </div>
                        </div>

                        {/* Mobile: Stream always on top + tab content below */}
                        <div className="lg:hidden flex flex-col gap-3 pt-2">
                            {/* Stream — always visible at top */}
                            <div className="w-full shrink-0">
                                <div
                                    className="relative rounded-xl overflow-hidden aspect-square max-h-[360px] mx-auto"
                                    style={{
                                        maxWidth: '600px',
                                        boxShadow: '0 0 30px rgba(255, 215, 0, 0.35), 0 0 60px rgba(255, 215, 0, 0.15)',
                                        border: '2px solid rgba(255, 215, 0, 0.5)',
                                    }}
                                >
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
                                        <div className="w-full h-full flex items-center justify-center bg-black/60">
                                            <img
                                                src="/x-chat/streamer-male.png"
                                                alt="Creator stream"
                                                className="w-full h-full object-cover object-top"
                                            />
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-background/70 backdrop-blur-sm rounded-full px-3 py-1">
                                        <span className="text-red-500 text-sm">❤️</span>
                                        <span className="text-sm font-bold text-foreground">800</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tab content below stream */}
                            {mobileTab === "chat" && (
                                <div className="w-full min-h-[300px]" style={{ height: "calc(100dvh - 380px)" }}>
                                    <LiveChat roomId={roomId} sessionId={sessionId} />
                                </div>
                            )}

                            {mobileTab === "requests" && (
                                <div className="w-full min-h-[300px]" style={{ height: "calc(100dvh - 380px)" }}>
                                    <IncomingRequests roomId={roomId} sessionId={sessionId} />
                                </div>
                            )}

                            {mobileTab === "summary" && (
                                <div className="w-full">
                                    <SummaryPanel roomId={roomId} sessionId={sessionId} />
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
                    accentHsl="45, 90%, 55%"
                />

                <InviteModal 
                    isOpen={isInviteModalOpen} 
                    onClose={() => setIsInviteModalOpen(false)} 
                    roomId={roomId || null} 
                />

                <CreatorExitModal
                    isOpen={showExitModal}
                    onClose={() => setShowExitModal(false)}
                    onEndSession={async () => {
                        const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/end`, { method: "POST" });
                        if (res.ok) router.push("/rooms/x-chat-creator");
                    }}
                    onMinimizeSession={() => router.push("/rooms/x-chat-creator")}
                    roomName="X Chat"
                    accentHsl="45, 90%, 55%"
                />
            </div>
        </ProtectRoute>
    );
};

export default XChatCreatorPage;
