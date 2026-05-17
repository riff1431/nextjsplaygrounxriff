"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Zap, Image, Video, Upload, Loader2, Rocket, ChevronDown } from "lucide-react";
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
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        style={{
                            background: 'linear-gradient(145deg, hsl(270 30% 10%), hsl(330 20% 7%))',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px hsl(330 100% 55% / 0.08)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(330 100% 50%), hsl(280 80% 55%))' }}>
                                    <Zap size={14} className="text-white" />
                                </div>
                                <h3 className="font-display text-sm font-black uppercase tracking-wider" style={{ color: 'hsl(330 100% 80%)', textShadow: '0 0 12px hsl(330 100% 55% / 0.3)' }}>New Drop</h3>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal body — scrollable */}
                        <form onSubmit={handleAddDrop} className="flex flex-col gap-4 px-5 py-4 overflow-y-auto themed-scrollbar">
                            {/* Title */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 mb-1.5 block">Title <span style={{ color: 'hsl(330 100% 60%)' }}>*</span></label>
                                <input
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. Vault Drop: Full Reel"
                                    required
                                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-all"
                                    style={{ background: 'hsl(270 30% 6% / 0.8)', border: '1px solid hsl(330 100% 55% / 0.12)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.4)'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.12)'; }}
                                />
                            </div>

                            {/* Kind selector — Photo / Video */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 mb-1.5 block">Kind</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {KINDS.map(k => (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => { setForm(f => ({ ...f, kind: k })); clearMediaFile(); }}
                                            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200"
                                            style={form.kind === k
                                                ? { background: 'hsl(330 100% 55% / 0.1)', border: '1px solid hsl(330 100% 55% / 0.35)', color: 'hsl(330 100% 75%)', boxShadow: '0 0 12px hsl(330 100% 55% / 0.15)' }
                                                : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }
                                            }
                                        >
                                            {k === "Photo" ? <Image size={14} /> : <Video size={14} />}
                                            {k}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* File upload area */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 mb-1.5 block">
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
                                        className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl cursor-pointer transition-all"
                                        style={{ background: 'hsl(270 30% 6% / 0.5)', border: '1.5px dashed hsl(330 100% 55% / 0.15)' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.4)'; e.currentTarget.style.background = 'hsl(330 100% 55% / 0.04)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.15)'; e.currentTarget.style.background = 'hsl(270 30% 6% / 0.5)'; }}
                                    >
                                        <Upload size={20} style={{ color: 'hsl(330 100% 65% / 0.4)' }} />
                                        <span className="text-[11px] text-white/30">
                                            Click to upload {form.kind === "Photo" ? "an image" : "a video"}
                                        </span>
                                    </label>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                                        {form.kind === "Photo" ? (
                                            <img src={mediaPreview} alt="Preview" className="w-full h-32 object-cover" />
                                        ) : (
                                            <video src={mediaPreview} className="w-full h-32 object-cover" controls />
                                        )}
                                        <button
                                            type="button"
                                            onClick={clearMediaFile}
                                            className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm hover:bg-red-500 text-white/60 hover:text-white flex items-center justify-center transition-all"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Rarity */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 mb-1.5 block">Rarity</label>
                                <div className="relative">
                                    <select
                                        value={form.rarity}
                                        onChange={e => setForm(f => ({ ...f, rarity: e.target.value as any }))}
                                        className="w-full rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-all appearance-none cursor-pointer"
                                        style={{ background: 'hsl(270 30% 6% / 0.8)', border: '1px solid hsl(330 100% 55% / 0.12)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}
                                        onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.4)'; }}
                                        onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.12)'; }}
                                    >
                                        {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                                </div>
                            </div>

                            {/* Price / Mins / Stock row */}
                            <div className="grid grid-cols-3 gap-2.5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 mb-1.5 block">Price ({cs()})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/20 pointer-events-none">{cs()}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={form.price}
                                            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                            placeholder="25"
                                            className="w-full rounded-lg pl-7 pr-2 py-2.5 text-sm text-white font-bold placeholder:text-white/20 focus:outline-none transition-all"
                                            style={{ background: 'hsl(270 30% 6% / 0.8)', border: '1px solid hsl(330 100% 55% / 0.12)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}
                                            onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.4)'; }}
                                            onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.12)'; }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 mb-1.5 block">Duration</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max="1440"
                                            value={form.endsInMin}
                                            onChange={e => setForm(f => ({ ...f, endsInMin: e.target.value }))}
                                            className="w-full rounded-lg px-3 pr-9 py-2.5 text-sm text-white font-bold focus:outline-none transition-all"
                                            style={{ background: 'hsl(270 30% 6% / 0.8)', border: '1px solid hsl(330 100% 55% / 0.12)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}
                                            onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.4)'; }}
                                            onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.12)'; }}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white/20 pointer-events-none uppercase">min</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 mb-1.5 block">Stock</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.inventoryTotal}
                                        onChange={e => setForm(f => ({ ...f, inventoryTotal: e.target.value }))}
                                        className="w-full rounded-lg px-3 py-2.5 text-sm text-white font-bold focus:outline-none transition-all"
                                        style={{ background: 'hsl(270 30% 6% / 0.8)', border: '1px solid hsl(330 100% 55% / 0.12)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}
                                        onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.4)'; }}
                                        onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.12)'; }}
                                    />
                                </div>
                            </div>
                        </form>

                        {/* Modal footer */}
                        <div className="flex gap-2.5 px-5 py-4 border-t border-white/[0.06] shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 rounded-lg text-[11px] font-bold text-white/35 border border-white/[0.08] hover:text-white/60 hover:border-white/15 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddDrop}
                                disabled={submitting}
                                className="flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                                style={{
                                    background: 'linear-gradient(135deg, hsl(330 100% 50%), hsl(280 80% 55%))',
                                    boxShadow: '0 4px 15px hsl(330 100% 55% / 0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={12} className="animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Rocket size={12} />
                                        Go Live
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
