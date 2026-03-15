"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, MessageCircle, Clock, CheckCircle, XCircle, Loader2, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import dynamic from "next/dynamic";
import ChatPanel from "@/components/rooms/x-chat/ChatPanel";
import PaidReactions from "@/components/rooms/x-chat/PaidReactions";
import WalletPill from "@/components/common/WalletPill";
import InviteModal from "@/components/rooms/InviteModal";
import InvitationPopup from "@/components/rooms/InvitationPopup";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

type RequestStatus = "none" | "pending" | "accepted" | "declined";

const XChatRoom = () => {
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const urlRoomId = searchParams?.get("roomId");
    const supabase = createClient();
    const [roomId, setRoomId] = useState<string | null>(urlRoomId || null);
    const [hostId, setHostId] = useState<string | null>(null);
    const [hostAvatar, setHostAvatar] = useState<string | null>(null);
    const [hostName, setHostName] = useState("Loading...");
    const [creatorName, setCreatorName] = useState("Loading...");

    // Request state
    const [requestStatus, setRequestStatus] = useState<RequestStatus>("none");
    const [requestLoading, setRequestLoading] = useState(false);

    // Session metering state (only active after request accepted + session started)
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionStart, setSessionStart] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const RATE_PER_MIN = 2;
    const [showInviteModal, setShowInviteModal] = useState(false);

    // 1. Discover the live x-chat room
    useEffect(() => {
        async function fetchRoom() {
            let query = supabase
                .from('rooms')
                .select('id, host_id, title')
                .eq('status', 'live')
                .eq('type', 'x-chat');

            if (urlRoomId) {
                query = query.eq('id', urlRoomId);
            } else {
                query = query.order('created_at', { ascending: false }).limit(1);
            }
            
            const { data: rooms, error } = await query;
            const room = rooms?.[0];

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
    }, []);

    // 2. Check for existing request when room is found
    useEffect(() => {
        if (!roomId || !user) return;

        async function checkExistingRequest() {
            const { data: existing } = await supabase
                .from('x_chat_requests')
                .select('id, status')
                .eq('room_id', roomId)
                .eq('fan_id', user!.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (existing) {
                setRequestStatus(existing.status as RequestStatus);
            }
        }
        checkExistingRequest();

        // Subscribe to request status changes
        const channel = supabase
            .channel(`x-chat-request-status-${roomId}-${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'x_chat_requests',
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const updated = payload.new as any;
                if (updated.fan_id === user!.id) {
                    setRequestStatus(updated.status as RequestStatus);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, user]);

    // 3. Session timer
    useEffect(() => {
        if (!sessionActive || !sessionStart) return;
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionActive, sessionStart]);

    const sendRequest = async () => {
        if (!roomId || requestLoading) return;
        setRequestLoading(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/x-chat/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "Wants to chat" }),
            });
            const data = await res.json();
            if (data.success) {
                setRequestStatus("pending");
            }
        } catch (e) {
            console.error("Failed to send request:", e);
        } finally {
            setRequestLoading(false);
        }
    };

    const startSession = async () => {
        if (!roomId) return;
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
    };

    const endSession = async () => {
        if (!roomId) return;
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
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const runningCharge = Math.ceil(elapsed / 60) * RATE_PER_MIN;

    const renderRequestBanner = () => {
        if (requestStatus === "none") {
            return (
                <button
                    onClick={sendRequest}
                    disabled={!roomId || requestLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gold/20 border border-gold/40 text-gold hover:bg-gold/30 transition-all disabled:opacity-50"
                >
                    {requestLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                    Request to Chat
                </button>
            );
        }

        if (requestStatus === "pending") {
            return (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-yellow-500/15 border border-yellow-400/30 text-yellow-300">
                    <Clock size={14} className="animate-pulse" />
                    Request Pending…
                </div>
            );
        }

        if (requestStatus === "accepted") {
            if (!sessionActive) {
                return (
                    <button
                        onClick={startSession}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-500/20 border border-green-400/40 text-green-300 hover:bg-green-500/30 transition-all animate-pulse"
                    >
                        <CheckCircle size={14} />
                        Accepted! Start Session (${RATE_PER_MIN}/min)
                    </button>
                );
            }
            return (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-green-500/15 border border-green-400/30 text-green-300">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Live — {formatTime(elapsed)}
                    </div>
                    <span className="text-gold font-semibold text-sm">${runningCharge}</span>
                    <span className="text-foreground/50 text-xs">(${RATE_PER_MIN}/min)</span>
                    <button
                        onClick={endSession}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/20 border border-red-400/40 text-red-300 hover:bg-red-500/30 transition-all"
                    >
                        End Session
                    </button>
                </div>
            );
        }

        if (requestStatus === "declined") {
            return (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-red-500/15 border border-red-400/30 text-red-300">
                    <XCircle size={14} />
                    Request Declined
                </div>
            );
        }

        return null;
    };

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen bg-background bg-cover bg-center bg-fixed relative fd-x-chat-theme"
                style={{ backgroundImage: `url(/x-chat/casino-bg.jpeg)` }}>

                <div className="absolute inset-0 bg-background/10 z-0" />

                <div className="relative z-10 max-w-8xl mx-auto p-4 px-4 md:px-40 py-8">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4 sm:gap-8">
                            <button
                                onClick={() => router.push("/home")}
                                className="glass-card px-4 py-2 text-foreground hover:text-gold transition-colors flex items-center gap-2 text-sm"
                            >
                                <ArrowLeft size={16} />
                                <span className="hidden sm:inline">Back</span>
                            </button>

                            {/* Invite Button - Moved to top left */}
                            {roomId && (
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-gold/15 border border-gold/30 text-gold hover:bg-gold/25 transition-all hover:scale-105"
                                    title="Invite Friends"
                                >
                                    <UserPlus size={14} />
                                    <span className="hidden sm:inline">Invite</span>
                                </button>
                            )}

                            <h1 className="text-gold-gradient text-2xl md:text-3xl font-display hidden lg:block">
                                X Chat Room
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Request / Session Status */}
                            {renderRequestBanner()}

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

                        {/* Left: Stream + Reactions */}
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

                            <PaidReactions roomId={roomId} />
                        </div>

                        {/* Right: Message Terminal */}
                        <div className="lg:col-span-1">
                            <ChatPanel roomId={roomId} hostName={hostName} />
                        </div>

                    </div>
                </div>

                {/* Invite Modal */}
                <InviteModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    roomId={roomId}
                />

                {/* Invitation Popup (receiver side) */}
                <InvitationPopup />
            </div>
        </ProtectRoute>
    );
};

export default XChatRoom;
