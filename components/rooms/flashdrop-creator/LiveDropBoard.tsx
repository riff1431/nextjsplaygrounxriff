"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Zap, Image, Video, Upload } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

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
}

export default function LiveDropBoard({ roomId }: LiveDropBoardProps) {
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
        const { data } = await supabase
            .from("flash_drops")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false });
        if (data) setDrops(data as FlashDrop[]);
        setLoading(false);
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;
        fetchDrops();

        const channel = supabase
            .channel(`creator-drops-${roomId}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "flash_drops",
                filter: `room_id=eq.${roomId}`,
            }, () => fetchDrops())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchDrops]);

    const handleAddDrop = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId || !form.title.trim()) return;
        setSubmitting(true);
        try {
            let media_url: string | undefined;

            // Upload media file via server-side API (admin privileges)
            if (mediaFile) {
                const uploadForm = new FormData();
                uploadForm.append("file", mediaFile);
                uploadForm.append("folder", `flash-drops/${roomId}`);

                const uploadRes = await fetch("/api/v1/storage/upload", {
                    method: "POST",
                    body: uploadForm,
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok || !uploadData.success) {
                    toast.error("Failed to upload media: " + (uploadData.error || "Unknown error"));
                    setSubmitting(false);
                    return;
                }
                media_url = uploadData.publicUrl;
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
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`⚡ Drop "${form.title}" is now LIVE!`);
                setShowModal(false);
                setForm({ title: "", kind: "Photo", rarity: "Common", price: "", endsInMin: "15", inventoryTotal: "100" });
                clearMediaFile();
            } else {
                toast.error(data.error || "Failed to add drop");
            }
        } catch {
            toast.error("Network error");
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

    const activeDrops = drops.filter(d => {
        if (d.status !== "Live") return false;
        if (kindFilter === "photos") return d.kind === "Photo";
        if (kindFilter === "videos") return d.kind === "Video";
        return true;
    });

    const endedDrops = drops.filter(d => {
        if (d.status !== "Ended") return false;
        if (kindFilter === "photos") return d.kind === "Photo";
        if (kindFilter === "videos") return d.kind === "Video";
        return true;
    });

    return (
        <div className="glass-panel rounded-xl p-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold neon-text tracking-wider">
                        Live Drop Board
                    </h2>
                    {(["all", "photos", "videos"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setKindFilter(tab)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${kindFilter === tab
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-white/20 text-white/50 hover:border-primary/50"
                                }`}
                        >
                            {tab === "all" ? "All" : tab === "photos" ? "Photos" : "Videos"}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    disabled={!roomId}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold font-display tracking-wider text-primary border border-primary hover:bg-primary/20 hover:shadow-[0_0_15px_hsl(var(--neon-pink)/0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Plus size={14} />
                    Add Drop
                </button>
            </div>

            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0 flex flex-col gap-2">
                {!roomId && (
                    <p className="text-muted-foreground text-xs text-center py-6">Connecting to session...</p>
                )}
                {roomId && loading && (
                    <p className="text-muted-foreground text-xs text-center py-6">Loading drops...</p>
                )}
                {roomId && !loading && activeDrops.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                        <Zap className="text-primary/40" size={28} />
                        <p className="text-muted-foreground text-xs text-center">No active drops. Click &quot;Add Drop&quot; to go live!</p>
                    </div>
                )}

                {activeDrops.map(drop => (
                    <div
                        key={drop.id}
                        className={`glass-card rounded-lg border px-3 py-2 flex items-center justify-between gap-2 ${rarityColor[drop.rarity] || "border-border"}`}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusColor[drop.status] || "bg-gray-500"}`} />
                                <span className="font-display font-bold text-xs text-foreground truncate">{drop.title}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-semibold ${rarityColor[drop.rarity]?.split(" ")[0]}`}>{drop.rarity}</span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground">{drop.kind}</span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    {formatCountdown(drop.ends_at)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {drop.inventory_remaining}/{drop.inventory_total} left
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-black neon-text font-display">${drop.price}</span>
                            <button
                                onClick={() => handleEndDrop(drop.id, drop.title)}
                                className="p-1 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors"
                                title="End this drop"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                {endedDrops.length > 0 && (
                    <div className="mt-2">
                        <span className="text-[10px] font-semibold neon-text tracking-wide uppercase opacity-50">Ended ({endedDrops.length})</span>
                        {endedDrops.slice(0, 5).map(drop => (
                            <div key={drop.id} className="glass-card rounded-lg border border-border/30 px-3 py-1.5 flex items-center justify-between gap-2 mt-1 opacity-40">
                                <span className="font-display font-bold text-xs text-foreground/50 truncate">{drop.title}</span>
                                <span className="text-xs text-muted-foreground">${drop.price}</span>
                            </div>
                        ))}
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
                                    <label className="text-xs font-semibold neon-text uppercase tracking-wider mb-1 block">Price $</label>
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
