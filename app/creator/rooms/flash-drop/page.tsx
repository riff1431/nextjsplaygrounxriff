"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectRoute } from "../../../context/AuthContext";
import { createClient } from "@/utils/supabase/client";

// ---- Shared Logic/Components -----------------------------------------------

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-blue-500/25 bg-black",
                "shadow-[0_0_22px_rgba(59,130,246,0.14),0_0_52px_rgba(37,99,235,0.08)]",
                "hover:shadow-[0_0_34px_rgba(59,130,246,0.20),0_0_78px_rgba(37,99,235,0.12)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

// Tone helper
const toneClasses = (tone: "pink" | "purple" | "blue" | "green" | "yellow" | "red") => {
    const map = {
        pink: {
            border: "border-pink-500/30",
            text: "text-pink-200",
            glow: "shadow-[0_0_15px_rgba(236,72,153,0.15)]",
        },
        purple: {
            border: "border-purple-500/30",
            text: "text-purple-200",
            glow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
        },
        blue: {
            border: "border-cyan-400/30",
            text: "text-cyan-200",
            glow: "shadow-[0_0_15px_rgba(34,211,238,0.15)]",
        },
        green: {
            border: "border-emerald-400/30",
            text: "text-emerald-200",
            glow: "shadow-[0_0_15px_rgba(52,211,153,0.15)]",
        },
        yellow: {
            border: "border-yellow-400/30",
            text: "text-yellow-200",
            glow: "shadow-[0_0_15px_rgba(250,204,21,0.15)]",
        },
        red: {
            border: "border-red-500/30",
            text: "text-red-200",
            glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]",
        },
    };
    return map[tone] || map.pink;
};

// ---- Component -----------------------------------------------------------

export default function FlashDropsCreatorPreview() {
    const router = useRouter();
    const supabase = createClient();
    const onBack = () => router.push("/home");
    const onFanView = () => router.push("/rooms/flash-drop");

    type DropKind = "Photo Set" | "Video" | "Live Replay" | "DM Pack" | "Vault";
    type Rarity = "Common" | "Rare" | "Epic" | "Legendary";
    type DropStatus = "Scheduled" | "Live" | "Ended";

    type DropRow = {
        id: string;
        title: string;
        kind: DropKind;
        rarity: Rarity;
        price: number;
        endsInMin: number;
        status: DropStatus;
        inventoryTotal?: number;
        inventoryRemaining?: number;
        grossPreview: number;
        unlocksPreview: number;
        createdAt: string;
    };

    const creator = { handle: "@NovaHeat", level: "Star" as const }; // Still mockup-like for header

    const [toast, setToast] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [drops, setDrops] = useState<DropRow[]>([]);
    const [roomId, setRoomId] = useState<string | null>(null);

    // Form
    const [formTitle, setFormTitle] = useState("New Flash Drop");
    const [formKind, setFormKind] = useState<DropKind>("Video");
    const [formRarity, setFormRarity] = useState<Rarity>("Rare");
    const [formPrice, setFormPrice] = useState(250);
    const [formEnds, setFormEnds] = useState(15);
    const [formInv, setFormInv] = useState(100);
    const [formNote, setFormNote] = useState("Short teaser for fans…");

    const pushToast = (msg: string) => {
        setToast(msg);
        window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1400);
    };

    // 1. Init Room + Fetch + Subscribe
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Find room
            const { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('host_id', user.id)
                .limit(1)
                .single();

            let targetRoomId = room?.id;
            if (!targetRoomId) {
                const { data: newRoom } = await supabase
                    .from('rooms')
                    .insert([{ host_id: user.id, title: "Flash Drop Room", status: "live" }])
                    .select()
                    .single();
                targetRoomId = newRoom?.id;
            }

            if (targetRoomId) {
                setRoomId(targetRoomId);
                fetchDrops(targetRoomId);
                subscribeToDrops(targetRoomId);
            }
        }
        init();
    }, []);

    async function fetchDrops(rid: string) {
        try {
            const res = await fetch(`/api/v1/rooms/${rid}/flash-drops`);
            const data = await res.json();
            if (data.drops) {
                const mapped = data.drops.map(transformDrop);
                setDrops(mapped);
                if (mapped.length > 0 && !selected) setSelected(mapped[0].id);
            }
        } catch (e) {
            console.error(e);
        }
    }

    function subscribeToDrops(rid: string) {
        const channel = supabase.channel(`room_${rid}_flash_drops`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flash_drops', filter: `room_id=eq.${rid}` }, (payload) => {
                const newDrop = transformDrop(payload.new);
                setDrops(prev => [newDrop, ...prev]);
                if (!selected) setSelected(newDrop.id);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'flash_drops', filter: `room_id=eq.${rid}` }, (payload) => {
                const updated = transformDrop(payload.new);
                setDrops(prev => prev.map(d => d.id === updated.id ? updated : d));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }

    function transformDrop(row: any): DropRow {
        // Calculate minutes remaining
        const diff = new Date(row.ends_at).getTime() - Date.now();
        const mins = Math.max(0, Math.floor(diff / 60000));

        return {
            id: row.id,
            title: row.title,
            kind: row.kind as DropKind,
            rarity: row.rarity as Rarity,
            price: row.price,
            endsInMin: mins,
            status: row.status as DropStatus,
            inventoryTotal: row.inventory_total,
            inventoryRemaining: row.inventory_remaining,
            grossPreview: row.gross_preview,
            unlocksPreview: row.unlocks_preview,
            createdAt: row.created_at
        };
    }

    // Refresh times manually or rely on re-fetches/updates. For now, we rely on server pushing updates or re-fetch.
    const refreshMetrics = () => {
        if (roomId) fetchDrops(roomId);
        pushToast("🔄 Refreshed metrics");
    };

    const selectedDrop = drops.find((d) => d.id === selected) ?? drops[0];

    const createDrop = async () => {
        if (!roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/flash-drops`, {
                method: "POST",
                body: JSON.stringify({
                    title: formTitle,
                    kind: formKind,
                    rarity: formRarity,
                    price: formPrice,
                    endsInMin: formEnds,
                    inventoryTotal: formInv,
                    status: "Scheduled"
                })
            });
            const data = await res.json();
            if (data.success) {
                pushToast("✅ Drop created (Scheduled)");
                setSelected(data.drop.id);
            }
        } catch (e) {
            pushToast("❌ Failed to create drop");
        }
    };

    const setStatus = async (id: string, status: DropStatus) => {
        if (!roomId) return;
        // Optimistic
        setDrops(prev => prev.map(d => d.id === id ? { ...d, status } : d));

        await fetch(`/api/v1/rooms/${roomId}/flash-drops/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        pushToast(status === 'Live' ? "🟢 Drop set LIVE" : status === 'Ended' ? "⛔ Drop ended" : "🗓️ Scheduled");
    };

    const simulateUnlockBurst = async (id: string, n: number) => {
        if (!roomId) return;
        // Optimistic update difficult due to complex logic, best to wait realtime or response
        // But for responsiveness we can guess.

        await fetch(`/api/v1/rooms/${roomId}/flash-drops/${id}/unlock`, {
            method: "POST",
            body: JSON.stringify({ count: n })
        });

        pushToast(`⚡ +${n} unlocks simulated`);
    };

    const rarityTone = (rarity: Rarity) =>
        rarity === "Legendary" ? "yellow" : rarity === "Epic" ? "purple" : rarity === "Rare" ? "blue" : "pink";

    return (
        <ProtectRoute allowedRoles={["creator"]}>
            <div className="max-w-7xl mx-auto px-6 py-6 text-white">
                <style>{`
        .vip-glow {
          box-shadow:
            0 0 16px rgba(255, 215, 0, 0.55),
            0 0 44px rgba(255, 215, 0, 0.28),
            0 0 22px rgba(255, 0, 200, 0.20);
        }
      `}</style>

                {toast && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] rounded-2xl border border-white/10 bg-black/75 px-4 py-2 text-sm text-gray-100 shadow-[0_0_40px_rgba(255,215,0,0.16)]">
                        {toast}
                    </div>
                )}

                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="rounded-xl border border-yellow-400/25 bg-black/40 px-3 py-2 text-sm text-yellow-200 hover:bg-white/5 inline-flex items-center gap-2 vip-glow"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>

                        <button
                            onClick={onFanView}
                            className="rounded-xl border border-blue-500/25 bg-black/40 px-3 py-2 text-sm text-blue-200 hover:bg-white/5 inline-flex items-center gap-2"
                            title="Switch to Fan room preview"
                        >
                            <Sparkles className="w-4 h-4" /> Fan View
                        </button>

                        <div>
                            <div className="text-yellow-200 text-sm">Flash Drops — Creator Console</div>
                            <div className="text-[11px] text-gray-400">Schedule drops, control live status, and monitor spend</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-blue-500/20 bg-black/35 px-3 py-2">
                            <div className="text-[10px] text-gray-400">Creator</div>
                            <div className="text-sm text-gray-100 font-semibold">
                                {creator.handle} <span className="text-[11px] text-blue-200">• {creator.level}</span>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 vip-glow">
                            <div className="text-[10px] text-gray-400">Total Gross</div>
                            <div className="text-sm text-yellow-100 font-semibold">
                                ${drops.reduce((s, d) => s + (d.grossPreview || 0), 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <NeonCard className="lg:col-span-7 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-yellow-200 text-sm">Drop Control Board</div>
                            <button
                                className="rounded-xl border border-yellow-400/25 bg-black/40 px-3 py-2 text-sm hover:bg-white/5 vip-glow"
                                onClick={refreshMetrics}
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="space-y-3">
                            {drops.length === 0 && <div className="text-gray-500 text-sm p-4">No drops created yet.</div>}
                            {drops.map((d) => {
                                const t = toneClasses(rarityTone(d.rarity) as any);
                                const active = selected === d.id;
                                const inv = typeof d.inventoryRemaining === "number" ? `${d.inventoryRemaining}/${d.inventoryTotal}` : "—";
                                return (
                                    <button
                                        key={d.id}
                                        onClick={() => setSelected(d.id)}
                                        className={cx(
                                            "w-full text-left rounded-2xl border bg-black/35 p-3 transition",
                                            t.border,
                                            t.glow,
                                            active && "ring-1 ring-yellow-300/30"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className={cx("text-sm font-semibold", t.text)}>{d.title}</div>
                                                <div className="mt-1 text-xs text-gray-300">
                                                    {d.kind} •{" "}
                                                    <span className={cx("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", t.border, t.text)}>
                                                        {d.rarity}
                                                    </span>
                                                    <span className="ml-2 text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                                                        {d.status}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-[11px] text-gray-400">Ends in {d.endsInMin}m • Inventory {inv}</div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                                <div className="text-sm text-yellow-200 font-semibold">${d.price.toLocaleString()}</div>
                                                <div className="mt-1 text-[11px] text-gray-300">Unlocks: {d.unlocksPreview.toLocaleString()}</div>
                                                <div className="mt-1 text-[11px] text-gray-300">Gross: ${d.grossPreview.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </NeonCard>

                    <div className="lg:col-span-5 space-y-6">
                        {selectedDrop && (
                            <NeonCard className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-yellow-200 text-sm">Selected Drop Controls</div>
                                    <span className="text-[10px] px-2 py-[2px] rounded-full border border-yellow-400/30 text-yellow-200 bg-black/40 vip-glow">
                                        {selectedDrop.status}
                                    </span>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-sm text-gray-100 font-semibold">{selectedDrop.title}</div>
                                    <div className="mt-1 text-[11px] text-gray-300">Price: ${selectedDrop.price.toLocaleString()} • Ends in {selectedDrop.endsInMin}m</div>
                                    <div className="mt-1 text-[11px] text-gray-300">
                                        Inventory:{" "}
                                        {typeof selectedDrop.inventoryRemaining === "number"
                                            ? `${selectedDrop.inventoryRemaining}/${selectedDrop.inventoryTotal}`
                                            : "—"}
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    <button
                                        className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 py-2 text-sm hover:bg-emerald-500/15"
                                        onClick={() => setStatus(selectedDrop.id, "Live")}
                                    >
                                        Go Live
                                    </button>
                                    <button
                                        className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 py-2 text-sm hover:bg-yellow-500/15 vip-glow"
                                        onClick={() => setStatus(selectedDrop.id, "Scheduled")}
                                    >
                                        Schedule
                                    </button>
                                    <button
                                        className="rounded-xl border border-rose-400/30 bg-rose-600/15 py-2 text-sm hover:bg-rose-600/20"
                                        onClick={() => setStatus(selectedDrop.id, "Ended")}
                                    >
                                        End Now
                                    </button>
                                </div>

                                <div className="mt-3 rounded-2xl border border-blue-500/20 bg-black/35 p-3">
                                    <div className="text-[11px] text-gray-400">Simulate demand (preview)</div>
                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                        {[5, 25, 100].map((n) => (
                                            <button
                                                key={n}
                                                className="rounded-xl border border-blue-500/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                                onClick={() => simulateUnlockBurst(selectedDrop.id, n)}
                                            >
                                                +{n} unlocks
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-500">Preview only. Production must be server-authoritative.</div>
                                </div>

                                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-[11px] text-gray-400">Creator note / teaser</div>
                                    <textarea
                                        value={formNote}
                                        onChange={(e) => setFormNote(e.target.value)}
                                        className="w-full min-h-[80px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none text-white placeholder-gray-500"
                                    />
                                    <button
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 py-2 text-sm hover:bg-white/5"
                                        onClick={() => pushToast("💾 Note saved (Mock)")}
                                    >
                                        Save Note
                                    </button>
                                </div>
                            </NeonCard>
                        )}

                        <NeonCard className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-yellow-200 text-sm">Create New Drop</div>
                                <span className="text-[10px] text-gray-400">Scheduled by default</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-[11px] text-gray-400 mb-2">Title</div>
                                    <input
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        className="w-full rounded-xl border border-yellow-400/15 bg-black/40 px-3 py-2 text-sm outline-none text-white placeholder-gray-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                        <div className="text-[11px] text-gray-400 mb-2">Kind</div>
                                        <select
                                            value={formKind}
                                            onChange={(e) => setFormKind(e.target.value as DropKind)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                        >
                                            {(["Photo Set", "Video", "Live Replay", "DM Pack", "Vault"] as DropKind[]).map((k) => (
                                                <option key={k} value={k}>
                                                    {k}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                        <div className="text-[11px] text-gray-400 mb-2">Rarity</div>
                                        <select
                                            value={formRarity}
                                            onChange={(e) => setFormRarity(e.target.value as Rarity)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                        >
                                            {(["Common", "Rare", "Epic", "Legendary"] as Rarity[]).map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                        <div className="text-[11px] text-gray-400 mb-2">Price</div>
                                        <input
                                            type="number"
                                            value={formPrice}
                                            onChange={(e) => setFormPrice(Number(e.target.value))}
                                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none text-white placeholder-gray-500"
                                        />
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                        <div className="text-[11px] text-gray-400 mb-2">Ends (min)</div>
                                        <input
                                            type="number"
                                            value={formEnds}
                                            onChange={(e) => setFormEnds(Number(e.target.value))}
                                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none text-white placeholder-gray-500"
                                        />
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                        <div className="text-[11px] text-gray-400 mb-2">Inventory</div>
                                        <input
                                            type="number"
                                            value={formInv}
                                            onChange={(e) => setFormInv(Number(e.target.value))}
                                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none text-white placeholder-gray-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    className="w-full rounded-xl border border-yellow-400/30 bg-yellow-600/15 py-2 text-sm hover:bg-yellow-600/25 vip-glow"
                                    onClick={createDrop}
                                >
                                    Create Drop
                                </button>
                            </div>
                        </NeonCard>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
}
