"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectRoute } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import CreatorCard from "@/components/rooms/x-chat/CreatorCard";
import ChatPanel from "@/components/rooms/x-chat/ChatPanel";
import PaidReactions from "@/components/rooms/x-chat/PaidReactions";

const XChatRoom = () => {
    const router = useRouter();
    const supabase = createClient();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [hostName, setHostName] = useState("Loading...");
    const [creatorName, setCreatorName] = useState("Loading...");

    useEffect(() => {
        async function fetchRoom() {
            // Find the latest live "X Chat Room"
            const { data: room, error } = await supabase
                .from('rooms')
                .select('id, host_id, title')
                .eq('status', 'live')
                .eq('type', 'x-chat')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (room) {
                setRoomId(room.id);
                // Fetch host/creator name
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, full_name')
                    .eq('id', room.host_id)
                    .single();

                if (profile) {
                    const name = profile.full_name || profile.username || "Host";
                    setHostName(name);
                    setCreatorName(name); // Assuming host is the creator for now
                }
            } else {
                setHostName("No Active Room");
                setCreatorName("None");
            }
        }
        fetchRoom();
    }, [supabase]);

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen bg-background bg-cover bg-center bg-fixed relative fd-x-chat-theme"
                style={{ backgroundImage: `url(/x-chat/casino-bg.jpeg)` }}>

                {/* Dark overlay for better readability */}
                <div className="absolute inset-0 bg-black/60 z-0" />

                {/* Content */}
                <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => router.push("/home")}
                                className="glass-card px-4 py-2 text-foreground hover:text-gold transition-colors flex items-center gap-2 text-sm"
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>
                            <h1 className="text-gold-gradient text-3xl md:text-5xl font-bold tracking-tight">
                                X Chat Room
                            </h1>
                        </div>

                        <div className="text-left md:text-right glass-card px-4 py-2">
                            <p className="text-foreground text-sm">
                                Host – <span className="text-gold-light font-bold">{hostName}</span>
                            </p>
                            <p className="text-foreground text-sm">
                                Creator – <span className="text-gold-light font-bold">{creatorName}</span>
                            </p>
                        </div>
                    </div>

                    {/* Main layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left: Chat Display + Reactions */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Live X Chat Header Section */}
                            <div className="glass-card p-6">
                                <h2 className="fd-font-cinzel text-gold text-xl mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                                    Live X Chat
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <CreatorCard username={hostName} tier="Rising" />
                                    <CreatorCard username={creatorName} tier="Popular" price="$2/min metered" />
                                </div>
                            </div>

                            {/* Paid Reactions & Global Boosts */}
                            <PaidReactions />
                        </div>

                        {/* Right: Message Terminal */}
                        <div className="lg:col-span-1 h-[calc(100vh-200px)] sticky top-8">
                            <ChatPanel roomId={roomId} />
                        </div>

                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
};

export default XChatRoom;
