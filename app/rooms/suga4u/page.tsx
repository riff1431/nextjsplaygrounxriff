"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, ArrowLeft, Bell, Clock, Zap, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import WalletPill from "@/components/common/WalletPill";
import PrivateCallFanModal from "@/components/rooms/suga4u/PrivateCallFanModal";
import { usePrivateCall } from "@/hooks/usePrivateCall";
import { toast } from "sonner";
import { useGroupCall } from "@/hooks/useGroupCall";
import GroupCallFanModal from "@/components/rooms/truth-or-dare/GroupCallFanModal";

import { createClient } from "@/utils/supabase/client";
import { cs } from "@/utils/currency";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const Suga4URoom = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlRoomId = searchParams.get("roomId");
    const urlSessionId = searchParams.get("sessionId");
    const { user } = useAuth();
    const supabase = createClient();
    const [roomId, setRoomId] = React.useState<string | null>(null);
    const [hostId, setHostId] = React.useState<string | null>(null);
    const [hostAvatar, setHostAvatar] = React.useState<string | null>(null);
    const [hostName, setHostName] = React.useState("Alexis Rose");
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Incoming activity state
    const [showIncomingPanel, setShowIncomingPanel] = useState(false);
    const [incomingItems, setIncomingItems] = useState<any[]>([]);
    const [unseenCount, setUnseenCount] = useState(0);
    const [previewMedia, setPreviewMedia] = useState<{ url: string; label: string } | null>(null);

    // Private 1-on-1 call
    const privateCall = usePrivateCall(roomId, user?.id || null, "fan");

    // Group call (after vote campaign goal reached)
    const groupCall = useGroupCall(roomId, user?.id || null, "fan", "suga/group-vote");

    // Session Status Gating
    const [sessionStatus, setSessionStatus] = useState<string | null>(null);

    React.useEffect(() => {
        if (!roomId || !user) return;
        const fanName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Fan";
        const channel = supabase.channel(`toaster_fan_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'suga_paid_requests', filter: `room_id=eq.${roomId}` }, (payload: any) => {
                const r = payload.new;
                if (r.fan_name === fanName) {
                    if (r.status === 'accepted') {
                        toast.success(`Creator accepted your request: ${r.label} 🎉`, { duration: 5000 });
                    } else if (r.status === 'declined') {
                        toast.error(`Creator declined your request: ${r.label}`, { duration: 5000 });
                    }
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, user, supabase]);

    React.useEffect(() => {
        if (!urlSessionId) {
            setSessionStatus('active');
            return;
        }

        const fetchSessionStatus = async () => {
            const { data } = await supabase.from('room_sessions').select('status, live_started_at').eq('id', urlSessionId).single();
            if (data) {
                if (data.status === 'ended') setSessionStatus('ended');
                else if (!data.live_started_at) setSessionStatus('pending');
                else setSessionStatus('active');
            }
        };
        fetchSessionStatus();

        const channel = supabase.channel(`session-status-${urlSessionId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_sessions', filter: `id=eq.${urlSessionId}` }, (payload) => {
                const newData = payload.new;
                if (newData.status === 'ended') setSessionStatus('ended');
                else if (!newData.live_started_at) setSessionStatus('pending');
                else setSessionStatus('active');
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [urlSessionId, supabase]);

    React.useEffect(() => {
        async function fetchRoom() {
            // 1. Prioritize session_id as the source of truth
            if (urlSessionId) {
                const { data: session } = await supabase
                    .from("room_sessions")
                    .select("room_id, creator_id")
                    .eq("id", urlSessionId)
                    .single();

                if (session?.room_id) {
                    setRoomId(session.room_id);
                    setHostId(session.creator_id);
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username, full_name, avatar_url')
                        .eq('id', session.creator_id)
                        .single();

                    if (profile) {
                        setHostName(profile.full_name || profile.username || "Creator");
                        setHostAvatar(profile.avatar_url || null);
                    }
                    return;
                }
            }

            // 2. Fallback logic
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
    }, [supabase, urlRoomId, urlSessionId]);

    // ── Incoming Activity Tracking ──────────────────────────────────────────
    useEffect(() => {
        if (!roomId || !user) return;

        const fetchIncoming = async () => {
            // Fetch paid requests for this fan
            let query = supabase
                .from('suga_paid_requests')
                .select('*')
                .eq('room_id', roomId)
                .eq('fan_name', user.user_metadata?.full_name || user.email?.split('@')[0] || 'Fan')
                .order('created_at', { ascending: false })
                .limit(20);

            if (urlSessionId) {
                const { data, error } = await query.eq('session_id', urlSessionId);
                if (error && error.message?.includes('session_id')) {
                    const { data: fallback } = await supabase
                        .from('suga_paid_requests')
                        .select('*')
                        .eq('room_id', roomId)
                        .eq('fan_name', user.user_metadata?.full_name || user.email?.split('@')[0] || 'Fan')
                        .order('created_at', { ascending: false })
                        .limit(20);
                    if (fallback) setIncomingItems(fallback);
                } else if (data) {
                    setIncomingItems(data);
                }
            } else {
                const { data } = await query;
                if (data) setIncomingItems(data);
            }
        };
        fetchIncoming();

        // Real-time subscription for new/updated requests
        const channel = supabase
            .channel(`suga-fan-incoming-${roomId}-${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'suga_paid_requests',
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const item = payload.new as any;
                const fanName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Fan';
                if (item.fan_name !== fanName) return;
                setIncomingItems(prev => [item, ...prev].slice(0, 20));
                if (!showIncomingPanel) setUnseenCount(prev => prev + 1);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'suga_paid_requests',
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const updated = payload.new as any;
                const fanName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Fan';
                if (updated.fan_name !== fanName) return;
                setIncomingItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
                if (!showIncomingPanel) setUnseenCount(prev => prev + 1);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, user, supabase, showIncomingPanel, urlSessionId]);

    const toggleIncomingPanel = useCallback(() => {
        setShowIncomingPanel(prev => !prev);
        if (!showIncomingPanel) setUnseenCount(0);
    }, [showIncomingPanel]);

    // Helper functions for incoming panel
    const incomingTypeEmoji = (type: string) => {
        switch (type) {
            case 'shoutout': return '📢';
            case 'quick_tease': return '😘';
            case 'custom_clip': return '🎬';
            case 'say_my_name': return '💬';
            case 'voice_note': return '🎙️';
            case 'photo_drop': return '📸';
            case 'sponsor_room': return '💎';
            case 'private_1on1': return '🔒';
            case 'group_vote': return '🔥';
            case 'gift': return '🎁';
            default: return '⚡';
        }
    };

    const incomingStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': case 'completed': return { bg: 'hsla(140,60%,20%,0.3)', border: 'hsla(140,70%,45%,0.4)', text: 'hsl(140,70%,55%)' };
            case 'declined': case 'rejected': return { bg: 'hsla(0,60%,20%,0.3)', border: 'hsla(0,70%,55%,0.4)', text: 'hsl(0,70%,60%)' };
            case 'pending': return { bg: 'hsla(42,60%,20%,0.3)', border: 'hsla(42,90%,55%,0.4)', text: 'hsl(42,90%,55%)' };
            default: return { bg: 'hsla(340,40%,20%,0.2)', border: 'hsla(340,60%,45%,0.25)', text: 'hsl(340,20%,65%)' };
        }
    };

    const formatTimeAgo = (dateStr?: string) => {
        if (!dateStr) return '';
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    if (sessionStatus === 'pending') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative fd-suga4u-theme">
                <div className="absolute inset-0">
                    <img src="/rooms/suga4u/bg1.jpeg" alt="" className="w-full h-full object-cover" />
                    <div className="suga-background-overlay opacity-80" />
                </div>
                
                <button onClick={() => router.back()} className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all z-20">
                    <ArrowLeft size={18} />
                </button>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-gold/20 border-t-gold rounded-full animate-spin mb-8 shadow-[0_0_30px_hsl(42_90%_55%/0.4)]" />
                    <h1 className="text-2xl md:text-4xl font-black text-gold uppercase tracking-[0.2em] mb-3 text-center px-4 fd-font-tech" style={{ textShadow: '0 0 20px hsla(42, 90%, 55%, 0.5)' }}>
                        Waiting for Suga
                    </h1>
                    <p className="text-white/60 text-sm font-medium tracking-wide">
                        The session will begin shortly.
                    </p>
                </div>
            </div>
        );
    }

    if (sessionStatus === 'ended') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative fd-suga4u-theme">
                <div className="absolute inset-0">
                    <img src="/rooms/suga4u/bg1.jpeg" alt="" className="w-full h-full object-cover grayscale opacity-30" />
                    <div className="suga-background-overlay opacity-90" />
                </div>
                
                <div className="relative z-10 flex flex-col items-center bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-md">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
                        <span className="text-2xl">💔</span>
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-3 fd-font-tech">
                        Session Ended
                    </h1>
                    <p className="text-white/50 text-sm font-medium mb-8">
                        This session has concluded.
                    </p>
                    <button onClick={() => router.back()} className="px-8 py-3 rounded-xl bg-gold text-black font-bold tracking-widest uppercase hover:brightness-110 transition-all text-sm">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

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
                        <div className="flex items-center gap-2">
                            {/* Incoming Activity Button */}
                            <div className="relative">
                                <button
                                    onClick={toggleIncomingPanel}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 backdrop-blur-md ${
                                        showIncomingPanel
                                            ? 'bg-pink-500/30 border border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                                            : 'bg-pink-500/15 border border-pink-500/30 hover:bg-pink-500/25 text-pink-300'
                                    }`}
                                >
                                    <Bell className={`w-3.5 h-3.5 ${unseenCount > 0 ? 'animate-bounce' : ''}`} />
                                    <span className="hidden sm:inline">Incoming</span>
                                    {unseenCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-pink-500 text-white text-[10px] font-black px-1 shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                                            {unseenCount}
                                        </span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {showIncomingPanel && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full right-0 mt-3 w-80 bg-[#16161e]/95 border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl z-[60]"
                                        >
                                            {/* Panel Header */}
                                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                                        <Bell className="w-4 h-4 text-pink-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-white">My Activity</h3>
                                                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Latest Requests</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setShowIncomingPanel(false)}
                                                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Panel Body */}
                                            <div className="max-h-[360px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                                                {incomingItems.length === 0 ? (
                                                    <div className="py-12 px-4 text-center">
                                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                                            <Zap className="w-6 h-6 text-white/10" />
                                                        </div>
                                                        <p className="text-sm text-white/40">No recent activity</p>
                                                        <p className="text-[10px] text-white/25 mt-1">Your paid requests will appear here</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        {incomingItems.map((item) => {
                                                            const emoji = incomingTypeEmoji(item.type);
                                                            const sc = incomingStatusColor(item.status);
                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className="flex flex-col gap-1.5 p-3 rounded-xl hover:bg-white/5 transition-all group"
                                                                    style={{
                                                                        background: `linear-gradient(90deg, ${sc.bg}, transparent)`,
                                                                        border: `1px solid ${sc.border}`
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xl group-hover:scale-110 transition-transform">{emoji}</span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                                <span className="text-xs font-bold text-white truncate">
                                                                                    {item.label || item.type || 'Request'}
                                                                                </span>
                                                                                <span className="text-[10px] font-black text-pink-400">{cs()}{item.price || item.amount || 0}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span
                                                                                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border"
                                                                                    style={{
                                                                                        borderColor: sc.border,
                                                                                        color: sc.text,
                                                                                        background: `${sc.border}10`
                                                                                    }}
                                                                                >
                                                                                    {item.status}
                                                                                </span>
                                                                                <span className="text-[9px] text-white/30 flex items-center gap-1">
                                                                                    <Clock className="w-2.5 h-2.5" />
                                                                                    {formatTimeAgo(item.created_at)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Fan's original custom text */}
                                                                    {item.custom_text && (
                                                                        <div className="ml-8 bg-black/20 rounded-lg px-2.5 py-1.5 border-l-2 border-pink-500/30">
                                                                            <p className="text-[9px] text-pink-400/50 uppercase tracking-wider mb-0.5">Your Request</p>
                                                                            <p className="text-[10px] text-white/50 italic truncate">&quot;{item.custom_text}&quot;</p>
                                                                        </div>
                                                                    )}

                                                                    {/* Creator's response */}
                                                                    {item.status === 'accepted' && (item.response_text || item.response_media_url) && (
                                                                        <div className="ml-8 bg-emerald-500/5 rounded-lg px-2.5 py-1.5 border-l-2 border-emerald-500/30">
                                                                            <p className="text-[9px] text-emerald-400/60 uppercase tracking-wider mb-0.5">Creator Response</p>
                                                                            {item.response_text && (
                                                                                <p className="text-[10px] text-white/60">{item.response_text}</p>
                                                                            )}
                                                                            {item.response_media_url && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setPreviewMedia({ url: item.response_media_url, label: item.label || 'Response' });
                                                                                    }}
                                                                                    className="mt-1.5 w-full rounded-lg overflow-hidden border border-emerald-500/20 hover:border-emerald-400/40 transition-all cursor-pointer bg-transparent p-0 text-left group/media"
                                                                                >
                                                                                    {/* Thumbnail preview */}
                                                                                    {item.response_media_url.match(/\.(mp4|webm|mov|avi)$/i) || item.response_media_url.includes('video') ? (
                                                                                        <div className="w-full h-20 bg-black/40 flex items-center justify-center relative">
                                                                                            <span className="text-2xl">▶️</span>
                                                                                            <span className="absolute bottom-1 right-1.5 text-[8px] bg-black/60 text-white/60 px-1.5 py-0.5 rounded">VIDEO</span>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <img
                                                                                            src={item.response_media_url}
                                                                                            alt="Creator media"
                                                                                            className="w-full h-20 object-cover group-hover/media:brightness-110 transition-all"
                                                                                        />
                                                                                    )}
                                                                                    <div className="px-2 py-1 bg-emerald-500/10 flex items-center gap-1">
                                                                                        <span className="text-[9px] text-emerald-400 font-medium">📎 Tap to view</span>
                                                                                    </div>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Fallback: show note if no custom_text */}
                                                                    {!item.custom_text && item.note && (
                                                                        <p className="text-[10px] text-white/40 ml-8 italic truncate">&quot;{item.note}&quot;</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Panel Footer */}
                                            <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                                                <p className="text-[9px] text-white/30 uppercase tracking-widest">Powered by PlaygroundX</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <WalletPill />
                            <UserProfile name={hostName} avatarUrl={hostAvatar} hostId={hostId} />
                        </div>
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
                                <CreatorSecrets roomId={roomId} hostId={hostId} sessionId={urlSessionId} />
                                <CreatorFavorites roomId={roomId} hostId={hostId} sessionId={urlSessionId} />
                            </div>
                        </div>

                        {/* MIDDLE: Live Chat - full height */}
                        <div className="flex flex-col min-h-0">
                            <LiveChat roomId={roomId} sessionId={urlSessionId} />
                        </div>

                        {/* RIGHT: Paid Requests + Gifts + Actions + Offers - full height scrollable */}
                        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto chat-scroll">
                            <PaidRequestMenu roomId={roomId} hostId={hostId} sessionId={urlSessionId} />
                            <SendSugarGifts roomId={roomId} hostId={hostId} sessionId={urlSessionId} />
                            <QuickPaidActions
                                roomId={roomId}
                                hostId={hostId}
                                sessionId={urlSessionId}
                                initiatePrivateCall={privateCall.initiateCall}
                            />
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

                {/* Private 1-on-1 Call Modal */}
                {privateCall.callState && user && (
                    <PrivateCallFanModal
                        callState={privateCall.callState}
                        timeRemaining={privateCall.timeRemaining}
                        userId={user.id}
                        isLoading={privateCall.isLoading}
                        onAcceptRinging={privateCall.acceptRinging}
                        onRejectRinging={privateCall.rejectRinging}
                        onEndCall={privateCall.endCall}
                        onDismiss={privateCall.dismiss}
                        hostAvatarUrl={hostAvatar || undefined}
                        hostName={hostName}
                    />
                )}

                {/* Group Call Fan Modal */}
                {groupCall.callState && user && (
                    <GroupCallFanModal
                        callState={groupCall.callState}
                        userId={user.id}
                        userName={user.user_metadata?.full_name || user.email?.split('@')[0] || "Fan"}
                        onAcceptCall={groupCall.acceptCall}
                        onDeclineCall={groupCall.declineCall}
                        onDismiss={groupCall.dismiss}
                    />
                )}

                {/* Media Preview Modal */}
                <AnimatePresence>
                    {previewMedia && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center"
                        >
                            {/* Backdrop */}
                            <div
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                onClick={() => setPreviewMedia(null)}
                            />

                            {/* Modal Content */}
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                            <span className="text-sm">📎</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">{previewMedia.label}</h3>
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Creator Response Media</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setPreviewMedia(null)}
                                        className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Media */}
                                <div className="p-4 flex items-center justify-center bg-black/30 max-h-[70vh]">
                                    {previewMedia.url.match(/\.(mp4|webm|mov|avi)$/i) ||
                                     previewMedia.url.includes('video') ? (
                                        <video
                                            src={previewMedia.url}
                                            controls
                                            autoPlay
                                            className="max-w-full max-h-[65vh] rounded-lg"
                                        />
                                    ) : (
                                        <img
                                            src={previewMedia.url}
                                            alt="Creator response"
                                            className="max-w-full max-h-[65vh] rounded-lg object-contain"
                                        />
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                                    <p className="text-[10px] text-white/30">Delivered by creator</p>
                                    <a
                                        href={previewMedia.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                    >
                                        Open in new tab ↗
                                    </a>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </ProtectRoute>
    );
};

export default Suga4URoom;
