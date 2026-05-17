"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Package, Image as ImageIcon, Film, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cs } from "@/utils/currency";

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
    sessionId?: string | null;
}

const HighRollerPacks = ({ roomId, sessionId }: HighRollerPacksProps) => {
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
        const url = sessionId
            ? `/api/v1/rooms/${roomId}/roller-packs?sessionId=${sessionId}`
            : `/api/v1/rooms/${roomId}/roller-packs`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.packs) setPacks(data.packs);
    }, [roomId, sessionId]);

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
                body: JSON.stringify({ name: name.trim(), price: p, media_urls: mediaUrls, sessionId }),
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
        <div className="glass-panel rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 shrink-0 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(40 90% 50%), hsl(30 80% 45%))' }}>
                        <Package size={10} className="text-white" />
                    </div>
                    <h2 className="font-display text-xs font-black tracking-wider uppercase" style={{ color: 'hsl(330 100% 75%)', textShadow: '0 0 10px hsl(330 100% 55% / 0.3)' }}>
                        High Roller Packs
                    </h2>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                    style={{
                        background: showForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, hsl(330 100% 50%), hsl(280 80% 55%))',
                        color: showForm ? 'rgba(255,255,255,0.5)' : '#fff',
                        border: showForm ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    }}
                >
                    {showForm ? <X size={10} /> : <Plus size={10} />}
                    {showForm ? 'Close' : 'Add'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0 px-3 py-2.5">
                {/* Add Pack Form */}
                {showForm && (
                    <form onSubmit={handleAdd} className="mb-3 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(145deg, hsl(270 30% 8% / 0.8), hsl(330 20% 6% / 0.6))', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="px-3 py-2 border-b border-white/[0.04]">
                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">New Pack</span>
                        </div>
                        <div className="p-3 flex flex-col gap-2.5">
                            {/* Name input */}
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-wider text-white/35 mb-1 block">Pack Name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Diamond Patron"
                                    disabled={isProcessing}
                                    className="w-full rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none transition-all disabled:opacity-50"
                                    style={{ background: 'hsl(270 30% 6% / 0.8)', border: '1px solid hsl(330 100% 55% / 0.12)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.4)'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.12)'; }}
                                />
                            </div>

                            {/* Price input */}
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-wider text-white/35 mb-1 block">Price ({cs()})</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/25 pointer-events-none">{cs()}</span>
                                    <input
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="50"
                                        type="number"
                                        min="1"
                                        disabled={isProcessing}
                                        className="w-full rounded-lg pl-7 pr-3 py-2 text-xs text-white font-bold placeholder:text-white/25 focus:outline-none transition-all disabled:opacity-50"
                                        style={{ background: 'hsl(270 30% 6% / 0.8)', border: '1px solid hsl(330 100% 55% / 0.12)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}
                                        onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.4)'; }}
                                        onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.12)'; }}
                                    />
                                </div>
                            </div>

                            {/* Media Upload Area */}
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-wider text-white/35 mb-1 block">Media</label>
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
                                            <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/40 shrink-0">
                                                {media.type === "image" ? (
                                                    <img src={media.previewUrl} alt={`media-${idx}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-black/60 relative">
                                                        <video src={media.previewUrl} className="w-full h-full object-cover absolute inset-0" muted />
                                                        <Film size={14} className="text-primary/80 relative z-10" />
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeMedia(idx)}
                                                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                                                >
                                                    <X size={8} />
                                                </button>
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

                                {/* Upload dropzone */}
                                <label
                                    htmlFor="pack-media-upload"
                                    className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg cursor-pointer transition-all ${isProcessing ? "opacity-40 pointer-events-none" : ""}`}
                                    style={{ background: 'hsl(270 30% 6% / 0.5)', border: '1.5px dashed hsl(330 100% 55% / 0.15)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.4)'; e.currentTarget.style.background = 'hsl(330 100% 55% / 0.04)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.15)'; e.currentTarget.style.background = 'hsl(270 30% 6% / 0.5)'; }}
                                >
                                    <Upload size={14} style={{ color: 'hsl(330 100% 65% / 0.5)' }} />
                                    <span className="text-[10px] font-medium text-white/35">
                                        {mediaFiles.length > 0
                                            ? `${mediaFiles.length} file${mediaFiles.length > 1 ? 's' : ''} selected · Add more`
                                            : "Click to add photos or videos"
                                        }
                                    </span>
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    style={{
                                        background: 'linear-gradient(135deg, hsl(330 100% 50%), hsl(280 80% 55%))',
                                        boxShadow: '0 2px 10px hsl(330 100% 55% / 0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
                                    }}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 size={11} className="animate-spin" />
                                            {uploadingMedia ? "Uploading..." : "Adding..."}
                                        </>
                                    ) : (
                                        <>
                                            <Package size={11} />
                                            Create Pack
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    disabled={isProcessing}
                                    className="px-3 py-2 rounded-lg text-[10px] font-bold text-white/40 hover:text-white/70 border border-white/[0.08] hover:border-white/15 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Pack List */}
                {packs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: 'hsl(40 90% 50% / 0.08)', transform: 'scale(2.5)' }} />
                            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(40 90% 50% / 0.08), hsl(330 80% 50% / 0.05))', border: '1px solid hsl(40 90% 50% / 0.1)' }}>
                                <Package size={18} strokeWidth={1.5} style={{ color: 'hsl(40 90% 60% / 0.4)' }} />
                            </div>
                        </div>
                        <p className="text-[11px] text-white/25 text-center">No packs yet — add one above</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {packs.map((pack) => (
                            <div
                                key={pack.id}
                                className="group relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    backdropFilter: 'blur(8px)',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.25)')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                            >
                                {/* Hero media thumbnail */}
                                {pack.media_urls && pack.media_urls.length > 0 && (
                                    <div className="relative w-full h-20 overflow-hidden bg-black/40">
                                        {(() => {
                                            const firstUrl = pack.media_urls![0];
                                            const isVideo = /\.(mp4|webm|mov|avi)$/i.test(firstUrl);
                                            return isVideo ? (
                                                <>
                                                    <video src={firstUrl} className="w-full h-full object-cover" muted />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                        <Film size={14} className="text-white/60" />
                                                    </div>
                                                </>
                                            ) : (
                                                <img src={firstUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            );
                                        })()}
                                        {/* Gradient overlay */}
                                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(270 30% 6%), transparent 60%)' }} />
                                        {/* Media count badge */}
                                        {pack.media_urls!.length > 1 && (
                                            <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
                                                <ImageIcon size={8} className="text-white/60" />
                                                <span className="text-[8px] font-bold text-white/60">{pack.media_urls!.length}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Pack info */}
                                <div className="px-2.5 py-2">
                                    <p className="text-[10px] text-white/60 leading-tight truncate font-medium mb-1">{pack.name}</p>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-[9px] font-bold" style={{ color: 'hsl(330 100% 65% / 0.7)' }}>{cs()}</span>
                                        <span className="font-display text-base font-black text-white" style={{ textShadow: '0 0 8px hsl(330 100% 55% / 0.3)' }}>
                                            {pack.price.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Remove button */}
                                <button onClick={() => handleRemove(pack)}
                                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/50 backdrop-blur-sm text-red-400/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                >
                                    <X size={10} />
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
