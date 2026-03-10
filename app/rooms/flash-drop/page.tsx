"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Video } from "lucide-react";
import { useRouter } from "next/navigation";
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

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

/**
 * Flash Drops Room — Fan View Preview
 * -----------------------------------
 * Purpose: Time-limited content drops with aggressive high-value purchase lanes.
 */

export default function FlashDropsRoomPreview() {
    const router = useRouter();
    const { user } = useAuth();
    const onBack = () => router.push("/home");
    const { balance: walletBalance, refresh: refreshWallet } = useWallet();

    const [toast, setToast] = useState<string | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
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

    // Discover room — prefer rooms that have active live drops
    useEffect(() => {
        if (!user) return;
        async function findRoom() {
            const supabase = createClient();

            // First: find a live flash-drop room that has active drops
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

            // Fallback: any live flash-drop room
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
    }, [user]);

    // Realtime ticker + drop event feed
    useEffect(() => {
        if (!roomId) return;
        const supabase = createClient();

        const addTickerItem = (item: string) => {
            setTickerItems(prev => [item, ...prev].slice(0, 16));
        };

        const channel = supabase
            .channel(`flash-drops-ticker-${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'flash_drops', filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const drop = payload.new as any;
                addTickerItem(`⚡ NEW DROP: ${drop.title} — $${drop.price} · ${drop.rarity}`);
                sonnerToast.info(`⚡ New drop: ${drop.title} just went live!`);
            })
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'flash_drops', filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const drop = payload.new as any;
                if (drop.status === 'Ended') {
                    addTickerItem(`💀 DROP ENDED: ${drop.title}`);
                }
            })
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'flash_drop_requests', filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const req = payload.new as any;
                if (req.fan_name) {
                    addTickerItem(`💰 ${req.fan_name} submitted a $${req.amount} drop request!`);
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
    }, [roomId]);

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
            const endpoint = msg.includes('Pack') || msg.includes('Bundle')
                ? `/api/v1/rooms/${roomId}/flash-drops/request`
                : `/api/v1/rooms/${roomId}/flash-drops/unlock`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, description: msg }),
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

    // Realtime bundle updates
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
                        <div className="flex items-center justify-between px-4">
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
                        {/* 3-column layout: Left (stream + board) | Center (chat) | Right (impulse) */}
                        <div className="flex-1 min-h-0 flex gap-3 px-3 pt-3">
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
                                    <LiveDropBoard roomId={roomId} onSpend={requestSpend} />
                                </div>
                            </div>

                            {/* Center: Live Chat */}
                            <div className="flex-[27] min-w-0 min-h-0">
                                <FlashDropLiveChat roomId={roomId} hostId={hostId} />
                            </div>

                            {/* Right: Impulse Panel */}
                            <div className="flex-[29] min-w-0 min-h-0 overflow-y-auto">
                                <ImpulsePanel roomId={roomId} onSpend={requestSpend} />
                            </div>
                        </div>

                        {/* Bundle strip — compact bottom bar */}
                        {bundles.length > 0 && (
                            <div className="shrink-0 px-4 py-2">
                                <div className="flex items-center justify-center gap-0 rounded-xl overflow-hidden bg-black/40 backdrop-blur-md border border-primary/25 max-w-3xl mx-auto">
                                    {bundles.map((bundle, i) => (
                                        <div key={bundle.id} className="flex-1 flex items-center justify-between px-4 py-2 relative hover:bg-white/5 transition-colors cursor-pointer group">
                                            {i < bundles.length - 1 && (
                                                <div className="absolute right-0 top-2 bottom-2 w-px bg-primary/25" />
                                            )}
                                            <div className="flex flex-col">
                                                <span
                                                    className="text-sm font-black"
                                                    style={{ color: "hsl(330 100% 80%)", textShadow: "0 0 8px hsl(330 100% 70% / 0.6)" }}
                                                >
                                                    {bundle.name}
                                                </span>
                                                {bundle.subtitle && (
                                                    <span className="text-[10px] text-white/35 uppercase tracking-wide">{bundle.subtitle}</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => requestSpend(bundle.price, `🎁 Pack Unlocked: ${bundle.name}`)}
                                                className="ml-3 px-3 py-1 rounded-lg fd-font-tech font-black text-[11px] text-white transition-all hover:scale-105 active:scale-95 uppercase tracking-wider shrink-0"
                                                style={{
                                                    background: `linear-gradient(135deg, hsl(330 100% 40%), hsl(330 100% 55%))`,
                                                    boxShadow: "0 0 10px hsl(330 100% 55% / 0.35)",
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
            </div>
        </ProtectRoute>
    );
}
