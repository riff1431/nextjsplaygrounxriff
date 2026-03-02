"use client";

import { useState, useEffect } from "react";
import ConfessionsTopBar from "@/components/rooms/confessions-creator/ConfessionsTopBar";
import ConfessionsLeftSidebar from "@/components/rooms/confessions-creator/ConfessionsLeftSidebar";
import ConfessionsCenterContent from "@/components/rooms/confessions-creator/ConfessionsCenterContent";
import ConfessionsLiveChat from "@/components/rooms/confessions-creator/ConfessionsLiveChat";
import ConfessionsFloatingHearts from "@/components/rooms/confessions-creator/ConfessionsFloatingHearts";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

const ConfessionsCreatorPage = () => {
    const { user } = useAuth();
    const [roomId, setRoomId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const supabase = createClient();
        async function findRoom() {
            const { data: room } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .limit(1)
                .maybeSingle();
            if (room) setRoomId(room.id);
        }
        findRoom();
    }, [user]);

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
                <ConfessionsTopBar />
                <div className="flex-1 flex items-stretch gap-16 px-4 pb-4 overflow-hidden xl:mx-40">
                    <ConfessionsLeftSidebar />
                    <ConfessionsCenterContent variant="confessions" />
                    <ConfessionsLiveChat roomId={roomId} />
                </div>
            </div>
        </div>
    );
};

export default ConfessionsCreatorPage;
