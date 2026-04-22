"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Package, ImageIcon, Video, Upload, Loader2, FileX, ShoppingBag, BadgeCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface Bundle {
    id: string;
    name: string;
    subtitle?: string;
    price: number;
    sold_count?: number;
    media_url?: string | null;
    media_type?: "image" | "video" | null;
}

interface BottomStripProps {
    roomId?: string | null;
}

const BottomStrip = ({ roomId }: BottomStripProps) => {
    const supabase = createClient();
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [price, setPrice] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchBundles = useCallback(async () => {
        if (!roomId) return;
        const res = await fetch(`/api/v1/rooms/${roomId}/bundles`);
        const data = await res.json();
        if (data.bundles) setBundles(data.bundles);
    }, [roomId]);

    useEffect(() => { fetchBundles(); }, [fetchBundles]);

    useEffect(() => {
        if (!roomId) return;
        const channel = supabase
            .channel(`creator-bundles-${roomId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "flash_drop_bundles", filter: `room_id=eq.${roomId}` }, fetchBundles)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchBundles]);

    const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        if (!isImage && !isVideo) { toast.error("Only image or video files allowed"); return; }
        if (file.size > 100 * 1024 * 1024) { toast.error("File too large (max 100MB)"); return; }
        setMediaFile(file);
        setMediaType(isImage ? "image" : "video");
        setMediaPreview(URL.createObjectURL(file));
    };

    const clearMedia = () => {
        if (mediaPreview) URL.revokeObjectURL(mediaPreview);
        setMediaFile(null); setMediaPreview(null); setMediaType(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadMedia = async (): Promise<string | null> => {
        if (!mediaFile) return null;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", mediaFile);
            formData.append("folder", "bundles");
            const res = await fetch("/api/v1/storage/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (data.success) return data.publicUrl as string;
            toast.error("Media upload failed: " + (data.error || "Unknown error"));
            return null;
        } catch { toast.error("Media upload failed"); return null; }
        finally { setUploading(false); }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseFloat(price);
        if (bundles.length >= 3) { toast.error("Maximum 3 bundles allowed"); return; }
        if (!name.trim()) { toast.error("Bundle name required"); return; }
        if (isNaN(p) || p <= 0) { toast.error("Valid price required"); return; }
        if (!roomId) return;
        setSubmitting(true);
        try {
            let uploadedUrl: string | null = null;
            if (mediaFile) {
                uploadedUrl = await uploadMedia();
                if (!uploadedUrl) { setSubmitting(false); return; }
            }
            const res = await fetch(`/api/v1/rooms/${roomId}/bundles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), subtitle: subtitle.trim() || null, price: p, media_url: uploadedUrl || null, media_type: uploadedUrl ? mediaType : null }),
            });
            const data = await res.json();
            if (data.success) {
                setBundles(prev => [...prev, data.bundle]);
                setName(""); setSubtitle(""); setPrice(""); clearMedia(); setShowForm(false);
                toast.success(`✅ Bundle "${data.bundle.name}" added!`);
            } else { toast.error(data.error || "Failed to add"); }
        } catch { toast.error("Network error"); }
        setSubmitting(false);
    };

    const handleRemove = async (bundle: Bundle) => {
        if (!roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/bundles`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bundleId: bundle.id }),
            });
            const data = await res.json();
            if (data.success) { setBundles(prev => prev.filter(b => b.id !== bundle.id)); toast.success(`Removed "${bundle.name}"`); }
        } catch { toast.error("Network error"); }
    };

    return (
        <div className="shrink-0 glass-panel rounded-xl overflow-hidden border border-primary/20"
            style={{ boxShadow: "0 0 20px hsl(var(--neon-pink)/0.08)" }}>

            {/* ── Section Header ── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/15"
                style={{ background: "linear-gradient(90deg, hsl(var(--primary)/0.12) 0%, transparent 100%)" }}>
                <div className="flex items-center gap-2">
                    <ShoppingBag size={13} className="text-primary" />
                    <h3 className="text-xs font-bold neon-text tracking-widest uppercase font-display">Bundles</h3>
                    {bundles.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                            {bundles.length}/3
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    disabled={bundles.length >= 3}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold font-display tracking-wider text-primary border border-primary/60 hover:bg-primary/20 hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Plus size={12} />
                    {bundles.length >= 3 ? "Max (3)" : "Add Bundle"}
                </button>
            </div>

            <div className="px-4 py-3">
                {/* ── Add Form ── */}
                {showForm && (
                    <form onSubmit={handleAdd}
                        className="mb-3 rounded-xl border border-primary/30 bg-black/50 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-primary/20">
                            <span className="text-[10px] font-bold text-primary tracking-widest uppercase font-display">New Bundle</span>
                            <button type="button" onClick={() => { setShowForm(false); clearMedia(); }} className="text-white/40 hover:text-white">
                                <X size={13} />
                            </button>
                        </div>
                        <div className="px-3 pt-2.5 pb-2 flex flex-wrap gap-2">
                            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                                <label className="text-[9px] text-white/50 font-bold uppercase tracking-wider">Bundle Name *</label>
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VIP Pass"
                                    className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-primary/80 focus:bg-white/15 transition-all" />
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                                <label className="text-[9px] text-white/50 font-bold uppercase tracking-wider">Subtitle</label>
                                <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Short description (optional)"
                                    className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-primary/80 focus:bg-white/15 transition-all" />
                            </div>
                            <div className="flex flex-col gap-1 w-20">
                                <label className="text-[9px] text-white/50 font-bold uppercase tracking-wider">Price (€) *</label>
                                <input value={price} onChange={e => setPrice(e.target.value)} placeholder="0" type="number" min="1"
                                    className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-primary/80 focus:bg-white/15 transition-all" />
                            </div>
                        </div>
                        <div className="px-3 pb-2">
                            <label className="text-[9px] text-white/50 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                                <ImageIcon size={9} /> Attach Media <span className="text-white/25 normal-case tracking-normal font-normal">(image or video, optional)</span>
                            </label>
                            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleMediaSelect} className="hidden" id="bundle-media-input" />
                            {mediaFile ? (
                                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-primary/25">
                                    <div className="w-12 h-9 rounded overflow-hidden bg-black/40 shrink-0">
                                        {mediaType === "image" && mediaPreview ? <img src={mediaPreview} alt="preview" className="w-full h-full object-cover" /> :
                                            mediaType === "video" && mediaPreview ? <video src={mediaPreview} className="w-full h-full object-cover" muted /> :
                                                <Video size={16} className="text-white/30 m-auto mt-1.5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-white/80 truncate">{mediaFile.name}</p>
                                        <p className="text-[9px] text-white/40">{(mediaFile.size / 1024 / 1024).toFixed(1)} MB · {mediaType}</p>
                                    </div>
                                    <button type="button" onClick={clearMedia} className="text-red-400/50 hover:text-red-400 transition-colors shrink-0"><FileX size={13} /></button>
                                </div>
                            ) : (
                                <label htmlFor="bundle-media-input"
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/15 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                                    <Upload size={12} className="text-white/25 group-hover:text-primary/50 transition-colors" />
                                    <span className="text-[11px] text-white/35 group-hover:text-white/55 transition-colors">Click to attach image or video</span>
                                    <div className="ml-auto flex gap-1">
                                        <span className="text-[8px] text-white/20 bg-white/5 border border-white/10 rounded px-1 py-0.5">JPG/PNG</span>
                                        <span className="text-[8px] text-white/20 bg-white/5 border border-white/10 rounded px-1 py-0.5">MP4/MOV</span>
                                    </div>
                                </label>
                            )}
                        </div>
                        <div className="px-3 pb-2.5 flex gap-2 justify-end">
                            <button type="button" onClick={() => { setShowForm(false); clearMedia(); }}
                                className="px-3 py-1.5 rounded-lg text-[11px] text-white/45 hover:text-white border border-white/10 hover:border-white/20 transition-all">Cancel</button>
                            <button type="submit" disabled={submitting || uploading}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold text-white bg-primary/70 hover:bg-primary/90 transition-all disabled:opacity-50 shadow-[0_0_10px_hsl(var(--primary)/0.3)]">
                                {(submitting || uploading) && <Loader2 size={11} className="animate-spin" />}
                                {uploading ? "Uploading…" : submitting ? "Adding…" : "Add Bundle"}
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Bundle Cards — horizontal strip ── */}
                {bundles.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-white/20 text-[11px] border border-dashed border-white/8 rounded-xl">
                        <Package size={16} className="opacity-30" />
                        <span>No bundles yet — add up to 3 to boost sales</span>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        {bundles.map((bundle, i) => (
                            <div key={bundle.id}
                                className="group relative flex-1 rounded-xl overflow-hidden border border-primary/25 hover:border-primary/60 transition-all duration-200"
                                style={{ boxShadow: "0 0 0 0 transparent", background: "linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(255,42,109,0.04) 100%)" }}
                                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 18px hsl(var(--primary)/0.18)")}
                                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 0 0 transparent")}
                            >
                                {/* Media background */}
                                {bundle.media_url && (
                                    <div className="absolute inset-0 z-0">
                                        {bundle.media_type === "video"
                                            ? <video src={bundle.media_url} className="w-full h-full object-cover opacity-20" muted loop playsInline />
                                            : <img src={bundle.media_url} alt={bundle.name} className="w-full h-full object-cover opacity-20" />}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="relative z-10 p-3 flex flex-col gap-1">
                                    {/* Media badge */}
                                    {bundle.media_url && (
                                        <span className="self-start flex items-center gap-0.5 text-[8px] text-white/50 bg-black/60 rounded px-1 py-0.5 mb-0.5">
                                            {bundle.media_type === "video" ? <Video size={7} /> : <ImageIcon size={7} />}
                                            {bundle.media_type}
                                        </span>
                                    )}

                                    {/* Price — hero number */}
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-display text-2xl font-black leading-none"
                                            style={{ color: "#fff", textShadow: "0 0 14px hsl(var(--primary)/0.8)" }}>
                                            €{bundle.price.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Name */}
                                    <p className="text-[11px] font-bold text-white/90 truncate leading-tight tracking-wide">
                                        {bundle.name}
                                    </p>

                                    {/* Subtitle */}
                                    {bundle.subtitle && (
                                        <p className="text-[9px] text-white/50 truncate leading-tight">{bundle.subtitle}</p>
                                    )}

                                    {/* Sold count */}
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <BadgeCheck size={9} className="text-primary/60" />
                                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                                            {bundle.sold_count || 0} sold
                                        </span>
                                    </div>
                                </div>

                                {/* Delete button */}
                                <button onClick={() => handleRemove(bundle)}
                                    className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-red-500/15 text-red-400/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                    title="Remove bundle">
                                    <X size={10} />
                                </button>

                                {/* Bottom accent line */}
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)/0.7), transparent)" }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BottomStrip;
