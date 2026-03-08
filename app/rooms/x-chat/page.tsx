"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import dynamic from "next/dynamic";
import CreatorCard from "@/components/rooms/x-chat/CreatorCard";
import ChatPanel from "@/components/rooms/x-chat/ChatPanel";
import PaidReactions from "@/components/rooms/x-chat/PaidReactions";
import WalletPill from "@/components/common/WalletPill";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const XChatRoom = () => {
    const router = useRouter();
    const { user } = useAuth();
    const supabase = createClient();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [hostId, setHostId] = useState<string | null>(null);
    const [hostAvatar, setHostAvatar] = useState<string | null>(null);
    const [hostName, setHostName] = useState("Loading...");
    const [creatorName, setCreatorName] = useState("Loading...");

    // Session metering state
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionStart, setSessionStart] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const RATE_PER_MIN = 2;

    useEffect(() => {
        async function fetchRoom() {
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
                setHostId(room.host_id);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, full_name, avatar_url')
                    .eq('id', room.host_id)
                    .single();

                if (profile) {
                    const name = profile.full_name || profile.username || "Host";
                    setHostName(name);
                    setCreatorName(name);
                    setHostAvatar(profile.avatar_url || null);
                }
            } else {
                setHostName("No Active Room");
                setCreatorName("None");
            }
        }
        fetchRoom();
    }, [supabase]);

    // Session timer
    useEffect(() => {
        if (!sessionActive || !sessionStart) return;
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionActive, sessionStart]);

    const toggleSession = async () => {
        if (!roomId) return;
        if (!sessionActive) {
            try {
                const res = await fetch(`/api/v1/rooms/${roomId}/x-chat/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "start" }),
                });
                const data = await res.json();
                if (data.success) {
                    setSessionActive(true);
                    setSessionStart(new Date());
                    setElapsed(0);
                }
            } catch (e) {
                console.error("Failed to start session:", e);
            }
        } else {
            try {
                const res = await fetch(`/api/v1/rooms/${roomId}/x-chat/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "end" }),
                });
                const data = await res.json();
                if (data.success) {
                    setSessionActive(false);
                    setSessionStart(null);
                }
            } catch (e) {
                console.error("Failed to end session:", e);
            }
        }
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const runningCharge = Math.ceil(elapsed / 60) * RATE_PER_MIN;

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen bg-background bg-cover bg-center bg-fixed relative fd-x-chat-theme"
                style={{ backgroundImage: `url(/x-chat/casino-bg.jpeg)` }}>

                <div className="absolute inset-0 bg-background/10 z-0" />

                <div className="relative z-10 max-w-8xl mx-auto p-4 px-4 md:px-40 py-8">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-8">
                            <button
                                onClick={() => router.push("/home")}
                                className="glass-card px-4 py-2 text-foreground hover:text-gold transition-colors flex items-center gap-2 text-sm"
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>
                            <h1 className="text-gold-gradient text-2xl md:text-3xl font-display">
                                X Chat Room
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Session Meter */}
                            <div className="glass-card px-4 py-2 flex items-center gap-3">
                                <button
                                    onClick={toggleSession}
                                    disabled={!roomId}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${sessionActive
                                        ? "bg-red-500/20 border border-red-400/40 text-red-300 hover:bg-red-500/30"
                                        : "bg-green-500/20 border border-green-400/40 text-green-300 hover:bg-green-500/30"
                                        } disabled:opacity-50`}
                                >
                                    <Clock size={12} />
                                    {sessionActive ? "End Session" : "Start Session"}
                                </button>
                                {sessionActive && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-foreground/70">{formatTime(elapsed)}</span>
                                        <span className="text-gold font-semibold">${runningCharge}</span>
                                        <span className="text-foreground/50 text-xs">(${RATE_PER_MIN}/min)</span>
                                    </div>
                                )}
                            </div>

                            <div className="text-right hidden md:block">
                                <p className="text-foreground text-sm">
                                    Host – <span className="text-gold-light">{hostName}</span>
                                </p>
                                <p className="text-foreground text-sm">
                                    Creator – <span className="text-gold-light">{creatorName}</span>
                                </p>
                                <WalletPill className="mt-1" />
                            </div>
                        </div>
                    </div>

                    {/* Main layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left: Stream + Chat Display + Reactions */}
                        <div className="lg:col-span-2 space-y-2">
                            {/* Live Stream */}
                            <div className="glass-card overflow-hidden" style={{ aspectRatio: "16/9" }}>
                                {roomId && user && hostId ? (
                                    <LiveStreamWrapper
                                        role="fan"
                                        appId={APP_ID}
                                        roomId={roomId}
                                        uid={user.id}
                                        hostId={hostId}
                                        hostAvatarUrl={hostAvatar || ""}
                                        hostName={hostName}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-black/50 text-gray-400 text-sm">
                                        {roomId ? "Connecting to stream..." : "No active session"}
                                    </div>
                                )}
                            </div>

                            <div className="glass-card p-4">
                                <h2 className="font-display text-gold text-base mb-4">
                                    Live X Chat
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CreatorCard username={hostName} tier="Rising" />
                                    <CreatorCard username={creatorName} tier="Popular" price="$2/min metered" />
                                </div>
                            </div>

                            <PaidReactions roomId={roomId} />
                        </div>

                        {/* Right: Message Terminal */}
                        <div className="lg:col-span-1">
                            <ChatPanel roomId={roomId} hostName={hostName} />
                        </div>

                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
};

export default XChatRoom;
