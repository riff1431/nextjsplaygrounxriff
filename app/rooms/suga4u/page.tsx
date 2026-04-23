"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, ArrowLeft } from "lucide-react";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import dynamic from "next/dynamic";
import SugaLogo from "@/components/rooms/suga4u/SugaLogo";
import UserProfile from "@/components/rooms/suga4u/UserProfile";
import S4uGroupVotePanel from "@/components/rooms/suga4u/S4uGroupVotePanel";
import CreatorSecrets from "@/components/rooms/suga4u/CreatorSecrets";
import LiveChat from "@/components/rooms/suga4u/LiveChat";
import CreatorFavorites from "@/components/rooms/suga4u/CreatorFavorites";
import PaidRequestMenu from "@/components/rooms/suga4u/PaidRequestMenu";
import SendSugarGifts from "@/components/rooms/suga4u/SendSugarGifts";
import QuickPaidActions from "@/components/rooms/suga4u/QuickPaidActions";
import InviteModal from "@/components/rooms/InviteModal";
import InvitationPopup from "@/components/rooms/InvitationPopup";

import { createClient } from "@/utils/supabase/client";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const Suga4URoom = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlRoomId = searchParams.get("roomId");
    const { user } = useAuth();
    const supabase = createClient();
    const [roomId, setRoomId] = React.useState<string | null>(null);
    const [hostId, setHostId] = React.useState<string | null>(null);
    const [hostAvatar, setHostAvatar] = React.useState<string | null>(null);
    const [hostName, setHostName] = React.useState("Alexis Rose");
    const [showInviteModal, setShowInviteModal] = useState(false);

    React.useEffect(() => {
        async function fetchRoom() {
            let query = supabase
                .from('rooms')
                .select('id, host_id')
                .eq('status', 'live')
                .eq('type', 'suga-4-u');

            if (urlRoomId) {
                query = query.eq('id', urlRoomId);
            } else {
                query = query.order('created_at', { ascending: false }).limit(1);
            }

            const { data: room } = await query.maybeSingle();

            if (room) {
                setRoomId(room.id);
                setHostId(room.host_id);
                // Fetch host name + avatar
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, full_name, avatar_url')
                    .eq('id', room.host_id)
                    .single();

                if (profile) {
                    setHostName(profile.full_name || profile.username || "Creator");
                    setHostAvatar(profile.avatar_url || null);
                }
            } else {
                setHostName("No Active Room");
            }
        }
        fetchRoom();
    }, [supabase]);

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen relative fd-suga4u-theme text-foreground font-body overflow-hidden">
                {/* Full-screen background */}
                <div className="fixed inset-0 z-0">
                    <img src="/rooms/suga4u/bg1.jpeg" alt="" className="w-full h-full object-cover" />
                    <div className="suga-background-overlay" />
                </div>

                <div className="relative z-10 p-3 lg:p-4 h-screen flex flex-col">
                    {/* Header */}
                    <header className="flex items-center justify-between mb-3 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.back()}
                                className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md"
                                title="Go back"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="hover:opacity-80 transition-opacity cursor-pointer" onClick={() => router.push("/home")}>
                                <SugaLogo />
                            </div>
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="btn-pink px-3.5 py-1.5 text-xs flex items-center gap-1.5 rounded-full transition-all hover:scale-105 shadow-lg shadow-pink-500/20"
                            >
                                <UserPlus size={14} />
                                Invite
                            </button>
                        </div>
                        <UserProfile name={hostName} avatarUrl={hostAvatar} />
                    </header>

                    {/* Main Layout matching wireframe */}
                    <div className="grid grid-cols-1 lg:grid-cols-[55%_1fr_280px] gap-3 flex-1 min-h-0">

                        {/* LEFT: Video (top) + Secrets & Favorites (bottom) */}
                        <div className="flex flex-col gap-3 min-h-0">
                            {/* Video Stream - takes ~60% height */}
                            <div className="flex-[1.6] min-h-0">
                                <div className="glass-panel overflow-hidden flex flex-col h-full bg-transparent border-gold/20">
                                    <div className="relative flex-1 min-h-[200px]">
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
                                            <div className="w-full h-full flex items-center justify-center bg-black/30 text-white/40 text-sm">
                                                {roomId ? "Connecting to stream..." : "No active session"}
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 flex items-center gap-2">
                                            <button
                                                onClick={() => router.push("/home")}
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 transition-all cursor-pointer"
                                                title="Go back"
                                            >
                                                <ArrowLeft size={16} className="text-white" />
                                            </button>
                                            <div className="flex items-center gap-1.5 bg-background/70 backdrop-blur-sm px-3 py-1 rounded-full">
                                                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-glow" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Live</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Secrets + Favorites side by side - takes ~40% height */}
                            <div className="flex-1 grid grid-cols-[1fr_1.5fr] gap-3 min-h-0">
                                <CreatorSecrets roomId={roomId} hostId={hostId} />
                                <CreatorFavorites roomId={roomId} hostId={hostId} />
                            </div>
                        </div>

                        {/* MIDDLE: Live Chat - full height */}
                        <div className="flex flex-col min-h-0">
                            <LiveChat roomId={roomId} />
                        </div>

                        {/* RIGHT: Paid Requests + Gifts + Actions + Offers - full height scrollable */}
                        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto chat-scroll">
                            <PaidRequestMenu roomId={roomId} hostId={hostId} />
                            <SendSugarGifts roomId={roomId} />
                            <QuickPaidActions roomId={roomId} hostId={hostId} />
                            <S4uGroupVotePanel roomId={roomId} />
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

export default Suga4URoom;
