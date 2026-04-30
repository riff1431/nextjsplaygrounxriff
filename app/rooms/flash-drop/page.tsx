"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Video, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import dynamic from "next/dynamic";
import LiveDropBoard from "@/components/rooms/flash-drops/LiveDropBoard";
import ImpulsePanel from "@/components/rooms/flash-drops/ImpulsePanel";
import FlashDropLiveChat from "@/components/rooms/flash-drops/FlashDropLiveChat";
import WalletPill from "@/components/common/WalletPill";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { useWallet } from "@/hooks/useWallet";
import { toast as sonnerToast } from "sonner";
import InviteModal from "@/components/rooms/InviteModal";
import InvitationPopup from "@/components/rooms/InvitationPopup";
import BillingOverlay from "@/components/rooms/shared/BillingOverlay";
import IncomingNotifications from "@/components/rooms/flash-drops/IncomingNotifications";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

/**
 * Flash Drops Room — Fan View Preview
 * -----------------------------------
 * Purpose: Time-limited content drops with aggressive high-value purchase lanes.
 */

export default function FlashDropsRoomPreview() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlRoomId = searchParams.get("roomId");
    const urlSessionId = searchParams.get("sessionId");
    const { user } = useAuth();
    const onBack = () => router.push("/home");
    const { balance: walletBalance, refresh: refreshWallet } = useWallet();

    const [toast, setToast] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [roomId, setRoomId] = useState<string | null>(urlRoomId || null);
    const [hostId, setHostId] = useState<string | null>(null);
    const [hostAvatar, setHostAvatar] = useState<string | null>(null);
    const [hostName, setHostName] = useState("Creator");
    const [tickerItems, setTickerItems] = useState<string[]>([
        "🔥 VAULT DROP LIVE NOW",
        "💎 Diamond Patron unlocked",
        "⚡ Flash drop session is live!",
        "🌟 Rare items available — grab fast",
        "💰 High Roller Packs available",
        "🎁 Limited inventory on select drops",
        "🔥 VAULT DROP LIVE NOW",
        "💎 Diamond Patron unlocked",
        "⚡ Flash drop session is live!",
        "🌟 Rare items available — grab fast",
    ]);

    // Pending purchase for SpendConfirmModal
    const [pendingSpend, setPendingSpend] = useState<{ amount: number; msg: string } | null>(null);

    // Session Status Gating
    const [sessionStatus, setSessionStatus] = useState<string | null>(null);

    useEffect(() => {
        if (!urlSessionId) {
            // If no session ID is provided, assume active for legacy direct-room joining, or let the room discovery handle it.
            setSessionStatus('active');
            return;
        }

        const supabase = createClient();
        
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
    }, [urlSessionId]);

    // Discover room — use URL params first (from sessions browse), fallback to auto-discovery
    useEffect(() => {
        if (!user) return;
        async function findRoom() {
            const supabase = createClient();

            // Priority 1: Use roomId from URL (passed from sessions browse page)
            if (urlRoomId) {
                const { data: room } = await supabase
                    .from('rooms')
                    .select('id, host_id')
                    .eq('id', urlRoomId)
                    .single();

                if (room) {
                    setRoomId(room.id);
                    setHostId(room.host_id);

                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, username, avatar_url')
                        .eq('id', room.host_id)
                        .single();
                    if (profile) {
                        setHostName(profile.full_name || profile.username || 'Creator');
                        setHostAvatar(profile.avatar_url || null);
                    }
                    return;
                }
            }

            // Priority 2: find a live flash-drop room that has active drops
            const { data: roomWithDrops } = await supabase
                .from('flash_drops')
                .select('room_id, rooms!inner(id, host_id, status, type)')
                .eq('status', 'Live')
                .eq('rooms.type', 'flash-drop')
                .eq('rooms.status', 'live')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (roomWithDrops) {
                const room = roomWithDrops.rooms as any;
                setRoomId(room.id);
                setHostId(room.host_id);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, username, avatar_url')
                    .eq('id', room.host_id)
                    .single();
                if (profile) {
                    setHostName(profile.full_name || profile.username || 'Creator');
                    setHostAvatar(profile.avatar_url || null);
                }
                return;
            }

            // Priority 3: any live flash-drop room
            const { data } = await supabase
                .from('rooms')
                .select('id, host_id')
                .eq('type', 'flash-drop')
                .eq('status', 'live')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                setRoomId(data.id);
                setHostId(data.host_id);

                // Fetch host profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, username, avatar_url')
                    .eq('id', data.host_id)
                    .single();
                if (profile) {
                    setHostName(profile.full_name || profile.username || 'Creator');
                    setHostAvatar(profile.avatar_url || null);
                }
            }
        }
        findRoom();
    }, [user, urlRoomId]);

    const [drops, setDrops] = useState<any[]>([]);
    const [loadingDrops, setLoadingDrops] = useState(true);

    const fetchDrops = useCallback(async () => {
        if (!roomId) return;
        const supabase = createClient();
        const { data } = await supabase
            .from("flash_drops")
            .select("*")
            .eq("room_id", roomId)
            .eq("status", "Live")
            .order("created_at", { ascending: false });
        if (data) setDrops(data);
        setLoadingDrops(false);
    }, [roomId]);

    // Realtime ticker + drop event feed
    useEffect(() => {
        if (!roomId) return;
        const supabase = createClient();

        fetchDrops();

        const addTickerItem = (item: string) => {
            setTickerItems(prev => [item, ...prev].slice(0, 16));
        };

        const channel = supabase
            .channel(`flash-drops-ticker-${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'flash_drops', filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const drop = payload.new as any;
                addTickerItem(`⚡ NEW DROP: ${drop.title} — €${drop.price} · ${drop.rarity}`);
                sonnerToast.info(`⚡ New drop: ${drop.title} just went live!`);
                fetchDrops();
            })
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'flash_drops', filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const drop = payload.new as any;
                if (drop.status === 'Ended') {
                    addTickerItem(`💀 DROP ENDED: ${drop.title}`);
                }
                fetchDrops();
            })
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'flash_drop_requests', filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const req = payload.new as any;
                if (req.fan_name) {
                    addTickerItem(`💰 ${req.fan_name} submitted a €${req.amount} drop request!`);
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Flash drops realtime ticker connected');
                } else if (status === 'CHANNEL_ERROR') {
                    console.warn('⚠️ Flash drops realtime subscription failed — continuing without live updates');
                }
            });
        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchDrops]);

    // Spend with confirmation
    const requestSpend = (amount: number, msg: string) => {
        setPendingSpend({ amount, msg });
    };

    const executeSpend = useCallback(async () => {
        if (!pendingSpend) return;
        const { amount, msg } = pendingSpend;
        if (!roomId) {
            // Local fallback if no room discovered
            setToast(msg);
            window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2500);
            return;
        }
        try {
            // All spends from the sidebar (Impulse, Packs, Bundles) are treated as generic requests/tips.
            // (LiveDropBoard handles its own actual 'unlock' API calls).
            const endpoint = `/api/v1/rooms/${roomId}/flash-drops/request`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, description: msg, sessionId: urlSessionId }),
            });
            const data = await res.json();
            if (data.success) {
                setToast(msg);
                refreshWallet();
                sonnerToast.success(`${msg}`);
            } else {
                sonnerToast.error(data.error || 'Purchase failed');
            }
        } catch (e) {
            sonnerToast.error('Network error');
        }
        window.setTimeout(() => setToast(null), 2500);
    }, [pendingSpend, roomId, refreshWallet]);




    // Dynamic bundles
    const [bundles, setBundles] = useState<{ id: string; name: string; subtitle?: string; price: number }[]>([]);

    const fetchBundles = useCallback(async () => {
        if (!roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/bundles`);
            const data = await res.json();
            if (data.bundles) setBundles(data.bundles);
        } catch { /* ignore */ }
    }, [roomId]);

    useEffect(() => {
        fetchBundles();
    }, [fetchBundles]);

    useEffect(() => {
        if (!roomId) return;
        const supabase = createClient();
        const channel = supabase
            .channel(`fan-bundles-${roomId}`)
            .on("postgres_changes", {
                event: "*", schema: "public", table: "flash_drop_bundles", filter: `room_id=eq.${roomId}`,
            }, fetchBundles)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchBundles]);

    if (sessionStatus === 'pending') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white relative fd-theme">
                <div className="absolute inset-0 bg-[url('/flash-drops/nightclub-bg.png')] bg-cover bg-center opacity-20" />
                <div className="absolute inset-0 bg-black/50" />
                
                <button onClick={onBack} className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all z-20">
                    <ArrowLeft size={18} />
                </button>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-8 shadow-[0_0_30px_hsl(330_100%_55%/0.4)]" />
                    <h1 className="text-2xl md:text-4xl font-black neon-text uppercase tracking-[0.2em] mb-3 text-center px-4 fd-font-tech">
                        Waiting for Creator
                    </h1>
                    <p className="text-white/60 text-sm font-medium tracking-wide">
                        The flash drop session will begin shortly.
                    </p>
                </div>
            </div>
        );
    }

    if (sessionStatus === 'ended') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white relative fd-theme">
                <div className="absolute inset-0 bg-[url('/flash-drops/nightclub-bg.png')] bg-cover bg-center opacity-20 filter grayscale" />
                <div className="absolute inset-0 bg-black/80" />
                
                <div className="relative z-10 flex flex-col items-center bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-md">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
                        <span className="text-2xl">🏁</span>
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-3 fd-font-tech">
                        Session Ended
                    </h1>
                    <p className="text-white/50 text-sm font-medium mb-8">
                        This flash drop session has concluded.
                    </p>
                    <button onClick={onBack} className="px-8 py-3 rounded-xl bg-primary text-white font-bold tracking-widest uppercase hover:brightness-110 transition-all text-sm">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="h-screen overflow-hidden bg-black text-white fd-theme font-body flex flex-col">
                {toast && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] rounded-2xl border border-primary/50 bg-black/80 px-4 py-2 text-sm text-foreground shadow-[0_0_40px_hsl(330_100%_55%/0.3)] animate-float">
                        {toast}
                    </div>
                )}

                {/* Background image */}
                <div
                    className="fixed inset-0 z-0"
                    style={{
                        backgroundImage: `url(/flash-drops/nightclub-bg.png)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }}
                />

                {/* Content separation overlay (shadow) */}
                <div
                    className="fixed inset-0 z-0 bg-black/45"
                    aria-hidden="true"
                />

                {/* Ambient neon glow orb */}
                <div
                    className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none z-0"
                    style={{
                        background: "radial-gradient(circle, hsl(330 100% 55% / 0.06) 0%, transparent 70%)",
                    }}
                />

                {/* Main content */}
                <div className="relative z-10 flex flex-col h-screen max-w-[1400px] mx-auto w-full">
                    {/* Top ticker bar */}
                    <div className="bg-black/65 border-b border-primary/20 overflow-hidden py-1">
                        <div className="flex items-center gap-2 px-4">
                            <div className="fd-ticker-content inline-flex gap-12 text-xs fd-font-tech text-primary/80 flex-1">
                                {tickerItems.map((item, i) => (
                                    <span key={i} className="shrink-0">{item}</span>
                                ))}
                            </div>
                            <WalletPill compact />
                        </div>
                    </div>


                    {/* Main Content Area — fills remaining viewport height */}
                    <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        {/* Left sidebar buttons + 3-column layout */}
                        <div className="flex-1 min-h-0 flex gap-3 px-3 pt-3">
                            {/* Left sidebar — Back + Invite */}
                            <div className="shrink-0 flex flex-col gap-2 pt-1">
                                <button
                                    onClick={() => router.back()}
                                    className="w-9 h-9 rounded-lg border border-primary/40 bg-black/60 flex items-center justify-center hover:bg-primary/20 hover:border-primary/70 transition-all"
                                    title="Go Back"
                                >
                                    <ArrowLeft size={16} className="text-primary" />
                                </button>
                                {roomId && (
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="w-9 h-9 rounded-lg border border-primary/40 bg-primary/10 flex items-center justify-center hover:bg-primary/25 hover:border-primary/80 transition-all text-primary"
                                        title="Invite Friends"
                                    >
                                        <UserPlus size={16} />
                                    </button>
                                )}
                                {roomId && user && (
                                    <IncomingNotifications roomId={roomId} />
                                )}
                            </div>
                            {/* Left: Stream + Drop Board */}
                            <div className="flex-[44] min-w-0 flex flex-col gap-2 min-h-0">
                                {/* Live Stream */}
                                <div className="rounded-xl overflow-hidden fd-neon-border-md shrink-0" style={{ aspectRatio: "16/9" }}>
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
                                        <div className="w-full h-full flex items-center justify-center bg-black/50 text-white/40 text-sm">
                                            {roomId ? "Connecting..." : "No active session"}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-h-0 overflow-hidden">
                                    <LiveDropBoard roomId={roomId} onSpend={requestSpend} drops={drops} loading={loadingDrops} />
                                </div>
                            </div>

                            {/* Center: Live Chat */}
                            <div className="flex-[27] min-w-0 min-h-0">
                                <FlashDropLiveChat roomId={roomId} hostId={hostId} sessionId={urlSessionId} />
                            </div>

                            {/* Right: Impulse Panel */}
                            <div className="flex-[29] min-w-0 min-h-0 flex flex-col overflow-hidden">
                                <ImpulsePanel roomId={roomId} onSpend={requestSpend} />
                            </div>

                        </div>

                        {/* Bundle strip — compact bottom bar */}
                        {false && bundles.length > 0 && (
                            <div className="shrink-0 px-6 py-4">
                                <div className="flex items-center justify-center gap-0 rounded-2xl overflow-hidden bg-black/50 backdrop-blur-xl border border-primary/30 max-w-5xl mx-auto shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
                                    {bundles.map((bundle, i) => (
                                        <div key={bundle.id} className="flex-1 flex items-center justify-between px-8 py-5 relative hover:bg-white/5 transition-colors cursor-pointer group">
                                            {i < bundles.length - 1 && (
                                                <div className="absolute right-0 top-3 bottom-3 w-px bg-primary/20" />
                                            )}
                                            <div className="flex flex-col">
                                                <span
                                                    className="text-lg font-black tracking-tight"
                                                    style={{ color: "hsl(330 100% 85%)", textShadow: "0 0 12px hsl(330 100% 70% / 0.7)" }}
                                                >
                                                    {bundle.name}
                                                </span>
                                                {bundle.subtitle && (
                                                    <span className="text-xs text-white/40 uppercase tracking-widest font-bold mt-0.5">{bundle.subtitle}</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => requestSpend(bundle.price, `🎁 Pack Unlocked: ${bundle.name}`)}
                                                className="ml-6 px-6 py-2.5 rounded-xl fd-font-tech font-black text-sm text-white transition-all hover:scale-105 active:scale-95 uppercase tracking-[0.15em] shrink-0"
                                                style={{
                                                    background: `linear-gradient(135deg, hsl(330 100% 45%), hsl(330 100% 60%))`,
                                                    boxShadow: "0 0 20px hsl(330 100% 60% / 0.45), inset 0 0 10px rgba(255,255,255,0.2)",
                                                    textShadow: "0 0 8px rgba(255,255,255,0.5)"
                                                }}
                                            >
                                                Buy · ${bundle.price.toLocaleString()}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </main>
                </div>

                {/* Spend Confirm Modal */}
                <SpendConfirmModal
                    isOpen={!!pendingSpend}
                    onClose={() => setPendingSpend(null)}
                    title="Confirm Purchase"
                    itemLabel={pendingSpend?.msg || ''}
                    amount={pendingSpend?.amount || 0}
                    walletBalance={walletBalance}
                    onConfirm={executeSpend}
                />

                {/* Invite Modal */}
                <InviteModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    roomId={roomId}
                />

                {/* Invitation Popup (receiver side) */}
                <InvitationPopup />

                {/* Per-Minute Billing */}
                <BillingOverlay
                    sessionId={urlSessionId}
                    accentHsl="330, 100%, 55%"
                    rateLabel="€2/min"
                    exitRoute="/rooms/flash-drop-sessions"
                />
            </div>
        </ProtectRoute>
    );
}
