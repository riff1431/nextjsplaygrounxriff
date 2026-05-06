"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Package, Image as ImageIcon, Film, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface RollerPack {
    id: string;
    name: string;
    price: number;
    description?: string;
    media_urls?: string[];
}

interface MediaPreview {
    file: File;
    previewUrl: string;
    type: "image" | "video";
}

interface HighRollerPacksProps {
    roomId: string | null;
}

const HighRollerPacks = ({ roomId }: HighRollerPacksProps) => {
    const [packs, setPacks] = useState<RollerPack[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [mediaFiles, setMediaFiles] = useState<MediaPreview[]>([]);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchPacks = useCallback(async () => {
        if (!roomId) return;
        const res = await fetch(`/api/v1/rooms/${roomId}/roller-packs`);
        const data = await res.json();
        if (data.packs) setPacks(data.packs);
    }, [roomId]);

    useEffect(() => {
        fetchPacks();
    }, [fetchPacks]);

    const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newPreviews: MediaPreview[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
                toast.error(`"${file.name}" is not a supported media type`);
                continue;
            }
            if (file.size > 100 * 1024 * 1024) {
                toast.error(`"${file.name}" exceeds 100MB limit`);
                continue;
            }
            newPreviews.push({
                file,
                previewUrl: URL.createObjectURL(file),
                type: file.type.startsWith("video/") ? "video" : "image",
            });
        }
        setMediaFiles(prev => [...prev, ...newPreviews]);
        // Reset input so the same files can be selected again
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeMedia = (index: number) => {
        setMediaFiles(prev => {
            const removed = prev[index];
            URL.revokeObjectURL(removed.previewUrl);
            return prev.filter((_, i) => i !== index);
        });
    };

    /** Upload all selected media files and return an array of public URLs */
    const uploadAllMedia = async (): Promise<string[]> => {
        if (mediaFiles.length === 0) return [];
        setUploadingMedia(true);
        const urls: string[] = [];

        for (const media of mediaFiles) {
            const formData = new FormData();
            formData.append("file", media.file);
            formData.append("folder", `roller-packs/${roomId}`);

            try {
                const res = await fetch("/api/v1/storage/upload", { method: "POST", body: formData });
                const data = await res.json();
                if (data.success && data.publicUrl) {
                    urls.push(data.publicUrl);
                } else {
                    toast.error(`Failed to upload "${media.file.name}"`);
                }
            } catch {
                toast.error(`Network error uploading "${media.file.name}"`);
            }
        }

        setUploadingMedia(false);
        return urls;
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseFloat(price);
        if (!name.trim()) { toast.error("Pack name required"); return; }
        if (isNaN(p) || p <= 0) { toast.error("Valid price required"); return; }
        if (!roomId) return;

        setSubmitting(true);
        try {
            // 1. Upload media files first
            const mediaUrls = await uploadAllMedia();

            // 2. Create the pack with media URLs
            const res = await fetch(`/api/v1/rooms/${roomId}/roller-packs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), price: p, media_urls: mediaUrls }),
            });
            const data = await res.json();
            if (data.success) {
                setPacks(prev => [...prev, data.pack]);
                setName("");
                setPrice("");
                setMediaFiles([]);
                setShowForm(false);
                toast.success(`✅ Pack "${data.pack.name}" added!`);
            } else {
                toast.error(data.error || "Failed to add pack");
            }
        } catch {
            toast.error("Network error");
        }
        setSubmitting(false);
    };

    const handleRemove = async (pack: RollerPack) => {
        if (!roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/roller-packs`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ packId: pack.id }),
            });
            const data = await res.json();
            if (data.success) {
                setPacks(prev => prev.filter(p => p.id !== pack.id));
                toast.success(`Removed "${pack.name}"`);
            }
        } catch {
            toast.error("Network error");
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setName("");
        setPrice("");
        mediaFiles.forEach(m => URL.revokeObjectURL(m.previewUrl));
        setMediaFiles([]);
    };

    const isProcessing = submitting || uploadingMedia;

    return (
        <div className="glass-panel rounded-xl px-3 py-3 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2 shrink-0 gap-2 min-w-0">
                <h2 className="font-display text-sm font-bold neon-text tracking-wider truncate">
                    High Roller Packs
                </h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary transition-all"
                >
                    <Plus size={12} />
                    Add
                </button>
            </div>

            {/* Add Pack Form */}
            {showForm && (
                <form onSubmit={handleAdd} className="mb-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5 flex flex-col gap-2">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Pack name (e.g. Diamond Patron)"
                        disabled={isProcessing}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-primary/80 transition-all disabled:opacity-50"
                    />
                    <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Price (€)"
                        type="number"
                        min="1"
                        disabled={isProcessing}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-primary/80 transition-all disabled:opacity-50"
                    />

                    {/* Media Upload Area */}
                    <div className="rounded-lg border border-dashed border-white/20 hover:border-primary/50 transition-all p-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleFilesSelected}
                            className="hidden"
                            id="pack-media-upload"
                            disabled={isProcessing}
                        />

                        {/* Media previews */}
                        {mediaFiles.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {mediaFiles.map((media, idx) => (
                                    <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-white/15 bg-black/40 shrink-0">
                                        {media.type === "image" ? (
                                            <img
                                                src={media.previewUrl}
                                                alt={`media-${idx}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-black/60 relative">
                                                <video
                                                    src={media.previewUrl}
                                                    className="w-full h-full object-cover absolute inset-0"
                                                    muted
                                                />
                                                <Film size={16} className="text-primary/80 relative z-10" />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeMedia(idx)}
                                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                                        >
                                            <X size={8} />
                                        </button>
                                        {/* Type badge */}
                                        <div className="absolute bottom-0.5 left-0.5">
                                            {media.type === "video" ? (
                                                <Film size={8} className="text-primary drop-shadow-md" />
                                            ) : (
                                                <ImageIcon size={8} className="text-white/60 drop-shadow-md" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add media button */}
                        <label
                            htmlFor="pack-media-upload"
                            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg cursor-pointer transition-all text-[10px] font-bold tracking-wide
                                ${isProcessing ? "opacity-40 pointer-events-none" : "text-white/50 hover:text-primary hover:bg-primary/10"}`}
                        >
                            <Upload size={11} />
                            {mediaFiles.length > 0
                                ? `Add More Media (${mediaFiles.length} selected)`
                                : "Add Photos / Videos"
                            }
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-primary/60 hover:bg-primary/80 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={12} className="animate-spin" />
                                    {uploadingMedia ? "Uploading..." : "Adding..."}
                                </>
                            ) : (
                                "Add Pack"
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Pack List */}
            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0">
                {packs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/30 gap-1.5 py-4">
                        <Package size={24} className="text-primary/25" />
                        <span className="text-[11px]">No packs yet — add one above</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {packs.map((pack) => (
                            <div key={pack.id} className="group relative rounded-lg overflow-hidden border border-primary/20 hover:border-primary/50 transition-all"
                                style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.4) 0%, hsl(var(--primary)/0.04) 100%)" }}
                                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 14px hsl(var(--primary)/0.2)")}
                                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                                {/* Left neon accent */}
                                <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "linear-gradient(180deg, hsl(var(--primary)/0.8), transparent)" }} />

                                {/* Media thumbnails strip */}
                                {pack.media_urls && pack.media_urls.length > 0 && (
                                    <div className="flex gap-0.5 p-1 pb-0 overflow-hidden">
                                        {pack.media_urls.slice(0, 3).map((url, i) => {
                                            const isVideo = /\.(mp4|webm|mov|avi)$/i.test(url);
                                            return (
                                                <div key={i} className="w-8 h-8 rounded overflow-hidden border border-white/10 bg-black/40 shrink-0 relative">
                                                    {isVideo ? (
                                                        <>
                                                            <video src={url} className="w-full h-full object-cover" muted />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                                <Film size={8} className="text-primary/80" />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {pack.media_urls.length > 3 && (
                                            <div className="w-8 h-8 rounded flex items-center justify-center bg-black/50 border border-white/10 text-[8px] font-bold text-white/50 shrink-0">
                                                +{pack.media_urls.length - 3}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pl-3 pr-2 py-2">
                                    <div className="flex items-baseline gap-0.5 mb-0.5">
                                        <span className="text-[10px] font-bold text-primary/70">€</span>
                                        <span className="font-display text-lg font-black" style={{ color: "#fff", textShadow: "0 0 10px hsl(var(--primary)/0.6)" }}>
                                            {pack.price.toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-white/65 leading-tight truncate">{pack.name}</p>
                                    {pack.media_urls && pack.media_urls.length > 0 && (
                                        <p className="text-[8px] text-primary/50 mt-0.5 flex items-center gap-0.5">
                                            <ImageIcon size={7} />
                                            {pack.media_urls.length} media
                                        </p>
                                    )}
                                </div>
                                <button onClick={() => handleRemove(pack)}
                                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500/15 text-red-400/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">
                                    <X size={9} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HighRollerPacks;
