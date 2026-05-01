"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

const ConfessionsCreatorPage = () => {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isWrongUser, setIsWrongUser] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;
        const supabase = createClient();
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
            className="conf-theme h-screen overflow-hidden relative"
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
            <div className="relative z-10 flex flex-col h-screen">
                <div className="relative flex items-center">
                    <div className="flex-1">
                        <ConfessionsTopBar onBack={() => setShowExitModal(true)} />
                    </div>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-4">
                        {isWrongUser && (
                            <div className="bg-red-500/20 text-red-500 border border-red-500 px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2">
                                <span>⚠️</span> WRONG ACCOUNT (RLS BLOCKED)
                            </div>
                        )}
                        <div className="text-xs text-white/50 bg-black/50 px-2 py-1 rounded">
                            Room: {roomId || "loading..."}
                        </div>
                        <SessionLiveControls
                            sessionId={sessionId!}
                            onEnd={() => router.push("/rooms/confessions-creator")}
                            accentHsl="280, 70%, 60%"
                        />
                    </div>
                </div>
                <div className="flex-1 flex items-stretch gap-16 px-4 pb-4 overflow-hidden xl:mx-40">
                    <ConfessionsLeftSidebar sessionId={sessionId} />
                    <div className="flex-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 min-h-0">
                            <ConfessionsCenterContent variant="confessions" roomId={roomId} sessionId={sessionId} />
                        </div>
                    </div>
                    <ConfessionsLiveChat roomId={roomId} sessionId={sessionId} />
                </div>
            </div>

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
