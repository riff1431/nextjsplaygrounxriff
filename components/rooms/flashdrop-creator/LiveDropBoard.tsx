"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Zap, Image, Video, Upload } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { cs } from "@/utils/currency";

interface FlashDrop {
    id: string;
    title: string;
    kind: string;
    rarity: "Common" | "Rare" | "Epic" | "Legendary";
    price: number;
    ends_at: string;
    status: string;
    inventory_total: number;
    inventory_remaining: number;
    media_url?: string;
}

const RARITIES = ["Common", "Rare", "Epic", "Legendary"] as const;
const KINDS = ["Photo", "Video"] as const;

const rarityColor: Record<string, string> = {
    Common: "text-pink-300 border-pink-400/30",
    Rare: "text-yellow-300 border-yellow-400/30",
    Epic: "text-orange-400 border-orange-400/30",
    Legendary: "text-red-400 border-red-400/30",
};

const statusColor: Record<string, string> = {
    Live: "bg-green-500",
    Scheduled: "bg-yellow-500",
    Ended: "bg-gray-500",
};

function formatCountdown(endsAt: string): string {
    const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
    if (diff === 0) return "ENDED";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

interface LiveDropBoardProps {
    roomId?: string | null;
    sessionId?: string | null;
}

export default function LiveDropBoard({ roomId, sessionId }: LiveDropBoardProps) {
    const supabase = createClient();
    const [drops, setDrops] = useState<FlashDrop[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [tick, setTick] = useState(0);
    const [kindFilter, setKindFilter] = useState<"all" | "photos" | "videos">("all");
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [form, setForm] = useState({
        title: "",
        kind: "Photo" as typeof KINDS[number],
        rarity: "Common" as typeof RARITIES[number],
        price: "",
        endsInMin: "15",
        inventoryTotal: "100",
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setMediaFile(file);
        const url = URL.createObjectURL(file);
        setMediaPreview(url);
    };

    const clearMediaFile = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Tick every second for countdown
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const fetchDrops = useCallback(async () => {
        if (!roomId) return;
        let query = supabase
            .from("flash_drops")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false });
        if (sessionId) query = query.eq("session_id", sessionId);
        let { data, error } = await query;
        // Fallback if session_id column doesn't exist yet
        if (error && error.message?.includes('session_id')) {
            ({ data } = await supabase
                .from("flash_drops")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false }));
        }
        if (data) {
            const now = Date.now();
            // Auto-end any drops whose timer has expired but still marked "Live"
            const expiredLiveDrops = data.filter(
                (d: any) => d.status === "Live" && d.ends_at && new Date(d.ends_at).getTime() <= now
            );
            if (expiredLiveDrops.length > 0) {
                // Batch-update expired drops to "Ended" in DB
                for (const d of expiredLiveDrops) {
                    supabase
                        .from("flash_drops")
                        .update({ status: "Ended" })
                        .eq("id", d.id)
                        .then(() => {});
                    d.status = "Ended"; // Also update local state immediately
                }
            }
            setDrops(data as FlashDrop[]);
        }
        setLoading(false);
    }, [roomId, sessionId]);

    useEffect(() => {
        if (!roomId) return;
        fetchDrops();

        const channel = supabase
            .channel(`creator-drops-${roomId}-${sessionId || 'all'}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "flash_drops",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                // Session isolation: skip drops from other sessions
                const newDrop = payload.new as any;
                if (sessionId && newDrop?.session_id && newDrop.session_id !== sessionId) return;
                fetchDrops();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, sessionId, fetchDrops]);

    const handleAddDrop = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId || !form.title.trim()) return;
        setSubmitting(true);
        try {
            let media_url: string | undefined;

            // Upload media file via server-side API (admin privileges)
            if (mediaFile) {
                console.log("[LiveDropBoard] Uploading media file:", mediaFile.name, mediaFile.size);
                const uploadForm = new FormData();
                uploadForm.append("file", mediaFile);
                uploadForm.append("folder", `flash-drops/${roomId}`);

                const uploadRes = await fetch("/api/v1/storage/upload", {
                    method: "POST",
                    body: uploadForm,
                });

                if (!uploadRes.ok) {
                    const errorText = await uploadRes.text();
                    console.error("[LiveDropBoard] Upload HTTP Error:", uploadRes.status, errorText);
                    toast.error(`Media upload failed: ${uploadRes.status}`);
                    setSubmitting(false);
                    return;
                }

                const uploadData = await uploadRes.json();
                if (!uploadData.success) {
                    console.error("[LiveDropBoard] Upload Data Error:", uploadData.error);
                    toast.error("Upload Error: " + (uploadData.error || "Unknown error"));
                    setSubmitting(false);
                    return;
                }
                media_url = uploadData.publicUrl;
                console.log("[LiveDropBoard] Media uploaded successfully:", media_url);
            }

            const res = await fetch(`/api/v1/rooms/${roomId}/flash-drops`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: form.title.trim(),
                    kind: form.kind,
                    rarity: form.rarity,
                    price: parseFloat(form.price) || 0,
                    endsInMin: parseInt(form.endsInMin) || 15,
                    inventoryTotal: parseInt(form.inventoryTotal) || 100,
                    status: "Live",
                    media_url,
                    sessionId,
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("[LiveDropBoard] API Error:", res.status, errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    toast.error(errorData.error || `API Error: ${res.status}`);
                } catch {
                    toast.error(`Server Error: ${res.status}`);
                }
                setSubmitting(false);
                return;
            }

            const data = await res.json();
            if (data.success) {
                toast.success(`⚡ Drop "${form.title}" is now LIVE!`);
                setShowModal(false);
                setForm({ title: "", kind: "Photo", rarity: "Common", price: "", endsInMin: "15", inventoryTotal: "100" });
                clearMediaFile();
            } else {
                toast.error(data.error || "Failed to add drop");
            }
        } catch (err: any) {
            console.error("[LiveDropBoard] Network/Unexpected Error:", err);
            toast.error(`Network error: ${err.message || 'Unknown'}`);
        }
        setSubmitting(false);
    };

    const handleEndDrop = async (dropId: string, title: string) => {
        if (!roomId) return;
        const res = await fetch(`/api/v1/rooms/${roomId}/flash-drops/${dropId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Ended" }),
        });
        if (res.ok) {
            toast.info(`💀 Drop "${title}" ended`);
        }
    };

    // A drop is truly active if it's not "Ended" AND its timer hasn't expired
    const isDropActive = (d: FlashDrop) =>
        d.status !== "Ended" && (!d.ends_at || new Date(d.ends_at).getTime() > Date.now());

    // Count of truly active drops (used for the 12-drop cap)
    const liveDropsCount = drops.filter(isDropActive).length;

    const activeDrops = drops.filter(d => {
        if (!isDropActive(d)) return false;
        if (kindFilter === "photos") return d.kind === "Photo";
        if (kindFilter === "videos") return d.kind === "Video";
        return true;
    });

    const endedDrops = drops.filter(d => {
        if (isDropActive(d)) return false;
        if (kindFilter === "photos") return d.kind === "Photo";
        if (kindFilter === "videos") return d.kind === "Video";
        return true;
    });

    return (
        <div className="glass-panel rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(330 100% 55%), hsl(280 100% 60%))' }}>
                            <Zap size={12} className="text-white" />
                        </div>
                        <h2 className="font-display text-sm font-black tracking-wider uppercase" style={{ color: 'hsl(330 100% 75%)', textShadow: '0 0 12px hsl(330 100% 55% / 0.4)' }}>
                            Live Drop Board
                        </h2>
                    </div>
                    {/* Filter tabs */}
                    <div className="flex items-center gap-1 ml-1 bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.06]">
                        {(["all", "photos", "videos"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setKindFilter(tab)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${kindFilter === tab
                                    ? "text-white shadow-sm"
                                    : "text-white/35 hover:text-white/60"
                                    }`}
                                style={kindFilter === tab ? {
                                    background: 'linear-gradient(135deg, hsl(330 100% 50% / 0.3), hsl(280 80% 50% / 0.2))',
                                    boxShadow: '0 0 8px hsl(330 100% 55% / 0.2)',
                                    border: '1px solid hsl(330 100% 55% / 0.25)',
                                } : { border: '1px solid transparent' }}
                            >
                                {tab === "all" ? "All" : tab === "photos" ? "Photos" : "Videos"}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    disabled={!roomId}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 hover:brightness-110 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                        background: 'linear-gradient(135deg, hsl(330 100% 50%), hsl(280 80% 55%))',
                        boxShadow: '0 2px 8px hsl(330 100% 55% / 0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
                        color: '#fff',
                    }}
                >
                    <Plus size={11} strokeWidth={2.5} />
                    Add Drop
                </button>
            </div>

            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0 px-4 py-3 flex flex-col gap-3">
                {/* Connecting state */}
                {!roomId && (
                    <div className="flex flex-col items-center justify-center flex-1 gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse" style={{ background: 'hsl(330 100% 55% / 0.1)', border: '1px solid hsl(330 100% 55% / 0.15)' }}>
                            <Zap size={18} style={{ color: 'hsl(330 100% 65%)' }} />
                        </div>
                        <p className="text-[11px] font-medium text-white/30 tracking-wide">Connecting to session...</p>
                    </div>
                )}

                {/* Loading state */}
                {roomId && loading && (
                    <div className="flex flex-col items-center justify-center flex-1 gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center animate-spin" style={{ background: 'hsl(330 100% 55% / 0.1)', border: '1.5px solid hsl(330 100% 55% / 0.2)', borderTopColor: 'hsl(330 100% 65%)' }} />
                        <p className="text-[11px] font-medium text-white/30 tracking-wide">Loading drops...</p>
                    </div>
                )}

                {/* Empty state */}
                {roomId && !loading && activeDrops.length === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-8">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: 'hsl(330 100% 55% / 0.15)', transform: 'scale(2)' }} />
                            <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(330 100% 55% / 0.12), hsl(280 80% 50% / 0.08))', border: '1px solid hsl(330 100% 55% / 0.15)' }}>
                                <Zap size={24} strokeWidth={1.5} style={{ color: 'hsl(330 100% 65% / 0.6)' }} />
                            </div>
                        </div>
                        <div className="text-center space-y-1.5">
                            <p className="text-[13px] font-bold text-white/50">No active drops</p>
                            <p className="text-[11px] text-white/25 leading-relaxed max-w-[180px]">
                                Hit <span className="text-white/50 font-semibold">"Add Drop"</span> to create your first live drop and start selling!
                            </p>
                        </div>
                    </div>
                )}

                {/* 3 across × 2 rows grid layout */}
                {activeDrops.length > 0 && (
                    <div className="grid grid-cols-3 gap-2.5">
                        {activeDrops.slice(0, 6).map(drop => (
                            <div
                                key={drop.id}
                                className={`rounded-xl border p-2.5 flex flex-col gap-1.5 relative group hover:scale-[1.02] transition-all duration-200 ${rarityColor[drop.rarity] || "border-border"}`}
                                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)' }}
                            >
                                {/* Status dot + End button */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full animate-pulse ${statusColor[drop.status] || "bg-gray-500"}`} />
                                        <span className={`text-[9px] font-black uppercase tracking-wider ${rarityColor[drop.rarity]?.split(" ")[0]}`}>
                                            {drop.rarity}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleEndDrop(drop.id, drop.title)}
                                        className="p-1 rounded hover:bg-red-500/20 text-red-400/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        title="End this drop"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>

                                {/* Media thumbnail if available */}
                                {drop.media_url && (
                                    <div className="w-full h-14 rounded-lg overflow-hidden bg-black/40">
                                        {drop.kind === "Photo" ? (
                                            <img src={drop.media_url} alt={drop.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <video src={drop.media_url} className="w-full h-full object-cover" muted />
                                        )}
                                    </div>
                                )}

                                {/* Title */}
                                <span className="font-display font-bold text-[11px] text-foreground/90 truncate leading-tight">
                                    {drop.title}
                                </span>

                                {/* Info row */}
                                <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-[9px] text-white/40 font-medium">{drop.kind}</span>
                                    <span className="text-[9px] text-white/15">·</span>
                                    <span className="text-[9px] text-white/40 font-mono tabular-nums">
                                        {formatCountdown(drop.ends_at)}
                                    </span>
                                </div>

                                {/* Price + Stock */}
                                <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-white/[0.06]">
                                    <span className="text-sm font-black font-display" style={{ color: 'hsl(330 100% 70%)', textShadow: '0 0 8px hsl(330 100% 55% / 0.3)' }}>{cs()}{drop.price}</span>
                                    <span className="text-[9px] text-white/30 font-mono tabular-nums">
                                        {drop.inventory_remaining}/{drop.inventory_total}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Show overflow count if more than 6 active */}
                {activeDrops.length > 6 && (
                    <p className="text-[10px] text-white/25 text-center font-medium">
                        +{activeDrops.length - 6} more active drops
                    </p>
                )}

                {endedDrops.length > 0 && (
                    <div className="mt-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">Ended</span>
                            <span className="text-[9px] font-bold text-white/15 bg-white/[0.04] px-1.5 py-0.5 rounded">{endedDrops.length}</span>
                            <div className="flex-1 h-px bg-white/[0.04]" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {endedDrops.slice(0, 3).map(drop => (
                                <div key={drop.id} className="rounded-lg border border-white/[0.04] px-2.5 py-1.5 opacity-35" style={{ background: 'rgba(255,255,255,0.015)' }}>
                                    <span className="font-display font-bold text-[10px] text-white/50 truncate block">{drop.title}</span>
                                    <span className="text-[10px] text-white/30 font-mono">{cs()}{drop.price}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Drop Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="glass-panel rounded-2xl p-6 w-full max-w-sm mx-4 border border-primary/30 shadow-[0_0_40px_hsl(var(--neon-pink)/0.2)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-display text-lg font-bold neon-text tracking-wider">⚡ New Drop</h3>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddDrop} className="flex flex-col gap-3">
                            <div>
                                <label className="text-xs font-semibold neon-text uppercase tracking-wider mb-1 block">Title *</label>
                                <input
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. Vault Drop: Full Reel"
                                    required
                                    className="w-full bg-black/40 border border-primary/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/70 transition-all"
                                />
                            </div>
                            {/* Kind selector — Photo / Video */}
                            <div>
                                <label className="text-xs font-semibold neon-text uppercase tracking-wider mb-1.5 block">Kind</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {KINDS.map(k => (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => { setForm(f => ({ ...f, kind: k })); clearMediaFile(); }}
                                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-bold font-display tracking-wider transition-all ${form.kind === k
                                                ? "border-primary bg-primary/20 text-primary shadow-[0_0_15px_hsl(var(--neon-pink)/0.3)]"
                                                : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40"
                                                }`}
                                        >
                                            {k === "Photo" ? <Image size={16} /> : <Video size={16} />}
                                            {k}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* File upload area */}
                            <div>
                                <label className="text-xs font-semibold neon-text uppercase tracking-wider mb-1.5 block">
                                    {form.kind === "Photo" ? "Attach Photo" : "Attach Video"}
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={form.kind === "Photo" ? "image/*" : "video/*"}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="drop-media-upload"
                                />
                                {!mediaPreview ? (
                                    <label
                                        htmlFor="drop-media-upload"
                                        className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-primary/30 bg-black/30 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
                                    >
                                        <Upload size={24} className="text-primary/60" />
                                        <span className="text-xs text-muted-foreground">
                                            Click to upload {form.kind === "Photo" ? "an image" : "a video"}
                                        </span>
                                    </label>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-primary/30 bg-black/30">
                                        {form.kind === "Photo" ? (
                                            <img src={mediaPreview} alt="Preview" className="w-full h-28 object-cover" />
                                        ) : (
                                            <video src={mediaPreview} className="w-full h-28 object-cover" controls />
                                        )}
                                        <button
                                            type="button"
                                            onClick={clearMediaFile}
                                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-red-500/40 text-white transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-semibold neon-text uppercase tracking-wider mb-1 block">Rarity</label>
                                    <select
                                        value={form.rarity}
                                        onChange={e => setForm(f => ({ ...f, rarity: e.target.value as any }))}
                                        className="w-full bg-black/40 border border-primary/30 rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:border-primary/70"
                                    >
                                        {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs font-semibold neon-text uppercase tracking-wider mb-1 block">Price {cs()}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={form.price}
                                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                        placeholder="25"
                                        className="w-full bg-black/40 border border-primary/30 rounded-lg px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/70"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold neon-text uppercase tracking-wider mb-1 block">Mins</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1440"
                                        value={form.endsInMin}
                                        onChange={e => setForm(f => ({ ...f, endsInMin: e.target.value }))}
                                        className="w-full bg-black/40 border border-primary/30 rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:border-primary/70"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold neon-text uppercase tracking-wider mb-1 block">Stock</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.inventoryTotal}
                                        onChange={e => setForm(f => ({ ...f, inventoryTotal: e.target.value }))}
                                        className="w-full bg-black/40 border border-primary/30 rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:border-primary/70"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground text-sm font-bold font-display transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-bold font-display tracking-wider hover:shadow-[0_0_20px_hsl(var(--neon-pink)/0.5)] transition-all disabled:opacity-60"
                                >
                                    {submitting ? "Adding..." : "🚀 Go Live"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
