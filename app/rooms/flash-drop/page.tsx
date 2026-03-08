"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import dynamic from "next/dynamic";
import LiveDropBoard from "@/components/rooms/flash-drops/LiveDropBoard";
import ImpulsePanel from "@/components/rooms/flash-drops/ImpulsePanel";
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

    // Pending purchase for SpendConfirmModal
    const [pendingSpend, setPendingSpend] = useState<{ amount: number; msg: string } | null>(null);

    // Discover room
    useEffect(() => {
        if (!user) return;
        async function findRoom() {
            const supabase = createClient();
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

    // Realtime listener for flash drop updates
    useEffect(() => {
        if (!roomId) return;
        const supabase = createClient();
        const channel = supabase
            .channel(`flash-drops-${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_drops' },
                () => {
                    // Drops updated — components will re-fetch
                    sonnerToast.info("🔥 Drop board updated!");
                }
            )
            .subscribe();
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

    const tickerItems = [
        "🔥 VAULT DROP LIVE NOW",
        "💎 Diamond Patron unlocked",
        "⚡ New flash drop in 3 minutes",
        "🌟 Lux Dungeon Preview RARE",
        "💰 Whale Bundle — 2 slots left",
        "🎁 Golden Key access — limited",
        "🔥 VAULT DROP LIVE NOW",
        "💎 Diamond Patron unlocked",
        "⚡ New flash drop in 3 minutes",
        "🌟 Lux Dungeon Preview RARE",
        "💰 Whale Bundle — 2 slots left",
        "🎁 Golden Key access — limited",
    ];

    const bundles = [
        { name: "Weekend Bundle", subtitle: "3 drops + 1 DM", price: 500 },
        { name: "Backstage Bundle", subtitle: "5 drops + Vault preview", price: 1000 },
        { name: "Whale Bundle", subtitle: "All drops + today priority", price: 2500 },
    ];

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen bg-black text-white fd-theme font-body">
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
                <div className="relative z-10 flex flex-col min-h-screen max-w-[1500px] mx-auto w-full">
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


                    {/* Main Content Area */}
                    <main className="flex-1">
                        <div className="flex flex-col">
                            {/* Mid-scale layout for better breathing room - Increased top padding */}
                            <div className="flex-1 flex justify-center gap-20 px-4 pt-8 pb-8">
                                {/* Left: Stream + Drop Board */}
                                <div className="w-[440px] space-y-4 pb-4">
                                    {/* Live Stream */}
                                    <div className="rounded-2xl overflow-hidden fd-neon-border-md" style={{ aspectRatio: "16/9" }}>
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
                                                {roomId ? "Connecting to stream..." : "No active session"}
                                            </div>
                                        )}
                                    </div>
                                    <LiveDropBoard onSpend={requestSpend} />
                                </div>

                                {/* Right: Impulse Panel */}
                                <div className="w-[400px] pb-4">
                                    <ImpulsePanel onSpend={requestSpend} />
                                </div>
                            </div>

                            {/* Adjusted bundle bar - more compact */}
                            <div className="px-10 py-3 pb-6">
                                <div className="flex flex-col md:flex-row items-center justify-center gap-0 rounded-2xl overflow-hidden fd-neon-border-md bg-black/40 backdrop-blur-md max-w-4xl mx-auto border border-primary/30">
                                    {bundles.map((bundle, i) => (
                                        <div key={bundle.name} className="flex-1 w-full flex flex-col items-center gap-0.5 px-4 py-2.5 relative hover:bg-white/5 transition-colors cursor-pointer group">
                                            {i < bundles.length - 1 && (
                                                <div className="hidden md:block absolute right-0 top-3 bottom-3 w-px bg-primary/30" />
                                            )}
                                            <div
                                                className="fd-font-display text-xl my-0.5 group-hover:scale-105 transition-transform"
                                                style={{
                                                    color: "hsl(330 100% 80%)",
                                                    textShadow: "0 0 10px hsl(330 100% 70% / 0.8), 0 0 30px hsl(330 100% 70% / 0.2)",
                                                }}
                                            >
                                                {bundle.name}
                                            </div>
                                            <div className="fd-font-body text-[10px] text-foreground/40 font-bold uppercase tracking-tight">{bundle.subtitle}</div>
                                            <button
                                                onClick={() => requestSpend(bundle.price, `🎁 Pack Unlocked: ${bundle.name}`)}
                                                className="mt-2 mb-0.5 px-6 py-1.5 rounded-lg fd-font-tech font-black text-xs text-white transition-all hover:scale-110 active:scale-95 uppercase tracking-widest"
                                                style={{
                                                    background: `linear-gradient(135deg, hsl(330 100% 40%), hsl(330 100% 55%))`,
                                                    boxShadow: "0 0 15px hsl(330 100% 55% / 0.4), 0 0 30px hsl(330 100% 55% / 0.2)",
                                                }}
                                            >
                                                Buy · ${bundle.price.toLocaleString()}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
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
