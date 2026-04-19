"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Plus, DollarSign, User, Eye, Edit3, Trash2, X } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import AddConfessionModal from "./AddConfessionModal";

interface Confession {
    id: string;
    title: string;
    teaser: string;
    content?: string;
    media_url?: string;
    type: string;
    tier: string;
    price: number;
    status: string;
    created_at: string;
}

const ConfessionsLeftSidebar = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ fans: 0, confessions: 0, tips: 0, earned: 0 });
    const [viewerCount, setViewerCount] = useState(0);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editConfessionTarget, setEditConfessionTarget] = useState<Confession | null>(null);
    const [viewConfessionTarget, setViewConfessionTarget] = useState<Confession | null>(null);

    const handleDelete = async (id: string) => {
        if (!roomId) return;
        if (!confirm("Are you sure you want to delete this confession?")) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/${id}`, { method: 'DELETE' });
            if (res.ok) refreshConfessions();
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (!user) return;
        const supabase = createClient();

        async function init() {
            // Get room
            const { data: room } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .eq("type", "confessions")
                .limit(1)
                .maybeSingle();

            if (!room) return;
            setRoomId(room.id);

            // Fetch confessions list
            const { data: confList } = await supabase
                .from("confessions")
                .select("id, title, teaser, content, media_url, type, tier, price, status, created_at")
                .eq("room_id", room.id)
                .order("created_at", { ascending: false });
            if (confList) setConfessions(confList);

            // Get confession count
            const { count: confCount } = await supabase
                .from("confessions")
                .select("*", { count: "exact", head: true })
                .eq("room_id", room.id);

            // Get wallet balance
            const { data: wallet } = await supabase
                .from("wallets")
                .select("balance")
                .eq("user_id", user!.id)
                .single();

            // Get follower count
            const { count: followers } = await supabase
                .from("subscriptions")
                .select("*", { count: "exact", head: true })
                .eq("creator_id", user!.id)
                .eq("status", "active");

            setStats({
                fans: followers || 0,
                confessions: confCount || 0,
                tips: 0,
                earned: wallet?.balance || 0,
            });
        }

        init();

        // Presence for live viewer count
        const channel = supabase.channel("confessions-presence", {
            config: { presence: { key: user.id } },
        });
        channel.on("presence", { event: "sync" }, () => {
            setViewerCount(Object.keys(channel.presenceState()).length);
        });
        channel.subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
                await channel.track({ user_id: user.id, role: "creator" });
            }
        });

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const refreshConfessions = async () => {
        if (!roomId) return;
        const supabase = createClient();
        const { data } = await supabase
            .from("confessions")
            .select("id, title, teaser, content, media_url, type, tier, price, status, created_at")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false });
        if (data) setConfessions(data);
    };

    return (
        <div className="flex flex-col gap-4 w-[260px] shrink-0 overflow-y-auto pb-4">
            {/* Profile Card */}
            <div className="conf-glass-card overflow-hidden relative">
                <div className="relative aspect-[4/3] w-full">
                    <Image
                        src="/rooms/confessions-profile.jpg"
                        alt="Profile"
                        fill
                        className="object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-[hsl(0,85%,55%)] text-white text-xs font-bold px-3 py-1 rounded-md conf-live-pulse tracking-wide">
                        LIVE
                    </div>
                    <div className="absolute bottom-3 left-3 text-white text-sm font-medium drop-shadow-md">
                        Fan:{viewerCount}
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="conf-glass-card p-4">
                <h3 className="conf-font-cinzel text-white font-semibold text-lg mb-3 border-b border-white/20 pb-2">
                    Summary
                </h3>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-white/60">
                        <User className="h-4 w-4 conf-text-gold" />
                        <span>Fans: <span className="conf-text-gold font-semibold">{stats.fans.toLocaleString()}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                        <MessageSquare className="h-4 w-4 conf-text-gold" />
                        <span>Confessions: <span className="conf-text-gold font-semibold">{stats.confessions.toLocaleString()}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                        <DollarSign className="h-4 w-4 conf-text-gold" />
                        <span>Tips: <span className="conf-text-gold font-semibold">€{stats.tips.toLocaleString()}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                        <DollarSign className="h-4 w-4 conf-text-gold" />
                        <span>Earned: <span className="conf-text-gold font-semibold">€{stats.earned.toLocaleString()}</span></span>
                    </div>
                </div>
            </div>

            {/* Random Request */}
            <div className="conf-glass-card p-4">
                <h3 className="conf-font-cinzel text-white font-semibold mb-3">Random Request</h3>
                <button 
                    onClick={() => { setEditConfessionTarget({ title: "Random Request", tier: "Spicy", price: 10, type: "Text" } as any); setShowAddModal(true); }}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-white/20 rounded-lg conf-text-gold hover:bg-white/5 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                </button>
            </div>

            {/* Confession Wall */}
            <div className="conf-glass-card p-4 flex-1 flex flex-col">
                <h3 className="conf-font-cinzel text-white font-semibold mb-3">Confession Wall</h3>
                <div className="flex flex-col gap-3 flex-1">
                    <button
                        onClick={() => { setEditConfessionTarget(null); setShowAddModal(true); }}
                        className="w-full flex items-center justify-center gap-2 py-3 border border-white/20 rounded-lg conf-text-gold hover:bg-white/5 transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                    </button>

                    {/* List existing confessions */}
                    {confessions.map((c) => (
                        <div
                            key={c.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-white font-medium truncate">{c.title}</p>
                                <p className="text-[10px] text-white/40">{c.tier} • €{c.price}</p>
                            </div>
                            <div className="flex items-center gap-2 text-white/40">
                                <button onClick={() => { setEditConfessionTarget(c); setShowAddModal(true); }} className="hover:text-white transition-colors"><Edit3 size={14} /></button>
                                <button onClick={() => handleDelete(c.id)} className="hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                <button onClick={() => setViewConfessionTarget(c)} className="hover:text-white transition-colors cursor-pointer"><Eye size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal - always rendered, controlled by showAddModal state */}
            {showAddModal && roomId && (
                <AddConfessionModal
                    isOpen={showAddModal}
                    onClose={() => { setShowAddModal(false); setEditConfessionTarget(null); }}
                    roomId={roomId}
                    onCreated={refreshConfessions}
                    editConfession={editConfessionTarget}
                />
            )}

            {/* View Modal */}
            {viewConfessionTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-[24px] border border-white/10 bg-[#120205] p-6 shadow-2xl relative">
                        <button onClick={() => setViewConfessionTarget(null)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-1.5 pr-8">{viewConfessionTarget.title}</h3>
                        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] uppercase font-bold text-white mb-4 shadow-sm">
                            {viewConfessionTarget.tier} • €{viewConfessionTarget.price}
                        </div>
                        <div className="text-sm font-medium italic text-white/80 leading-relaxed border-l-2 border-white/20 pl-4 py-1 mb-2 bg-white/5 rounded-r-lg">
                            {viewConfessionTarget.content || viewConfessionTarget.teaser || "No content available."}
                        </div>
                        {viewConfessionTarget.type !== "Text" && viewConfessionTarget.media_url && (
                            <div className="mt-4 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-2 rounded-lg flex items-center gap-2">
                                ✓ Media attached ({viewConfessionTarget.type})
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfessionsLeftSidebar;
