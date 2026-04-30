"use client";

import { useState } from "react";
import { X, Send, Loader2, FileText, Mic, Video, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface AddConfessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
    onCreated: () => void;
    editConfession?: any;
}

const tiers = [
    { id: "Spicy", label: "🔥 Spicy", defaultPrice: 10 },
    { id: "Dirty", label: "🖤 Dirty", defaultPrice: 20 },
    { id: "Bedroom", label: "🛏️ Bedroom", defaultPrice: 30 },
    { id: "Forbidden", label: "😈 Forbidden", defaultPrice: 40 },
];

const types = [
    { id: "Text", icon: FileText, label: "Text" },
    { id: "Image", icon: ImageIcon, label: "Image" },
    { id: "Audio", icon: Mic, label: "Audio" },
    { id: "Video", icon: Video, label: "Video" },
];

export default function AddConfessionModal({ isOpen, onClose, roomId, onCreated, editConfession }: AddConfessionModalProps) {
    const [title, setTitle] = useState(editConfession?.title || "");
    const [teaser, setTeaser] = useState(editConfession?.teaser || "");
    const [content, setContent] = useState(editConfession?.content || "");
    const [mediaUrl, setMediaUrl] = useState(editConfession?.media_url || "");
    const [type, setType] = useState(editConfession?.type || "Text");
    const [tier, setTier] = useState(editConfession?.tier || "Spicy");
    const [price, setPrice] = useState(String(editConfession?.price || "10"));
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [mediaFile, setMediaFile] = useState<File | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error("Please enter a title");
            return;
        }
        if (!content.trim() && !mediaUrl.trim()) {
            toast.error("Please add content or media");
            return;
        }

        setLoading(true);
        try {
            const isEdit = editConfession && editConfession.id;
            const url = isEdit 
                ? `/api/v1/rooms/${roomId}/confessions/${editConfession.id}` 
                : `/api/v1/rooms/${roomId}/confessions`;
            const method = isEdit ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    teaser: teaser.trim() || title.trim().substring(0, 50) + "...",
                    content: content.trim(),
                    mediaUrl: mediaUrl.trim() || null,
                    type,
                    tier,
                    price: Number(price) || 0,
                    status: "Published",
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success((editConfession && editConfession.id) ? "Confession updated! 🎉" : "Confession published! 🎉");
                setTitle("");
                setTeaser("");
                setContent("");
                setMediaUrl("");
                setPrice("10");
                onCreated();
                onClose();
            } else {
                toast.error(data.error || "Failed to create");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
                    <h3 className="text-base font-bold text-white">{editConfession && editConfession.id ? "Edit Confession" : "Add to Confession Wall"}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                    {/* Title */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 font-medium">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give it a catchy title..."
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 transition-all"
                        />
                    </div>

                    {/* Teaser (blurred preview) */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 font-medium">Teaser (preview text for fans)</label>
                        <input
                            type="text"
                            value={teaser}
                            onChange={(e) => setTeaser(e.target.value)}
                            placeholder="A blurred preview hint..."
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 transition-all"
                        />
                    </div>

                    {/* Type */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 font-medium">Type</label>
                        <div className="flex gap-2">
                            {types.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setType(t.id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border ${type === t.id
                                        ? "border-pink-500 bg-pink-500/20 text-white"
                                        : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                                        }`}
                                >
                                    <t.icon size={14} />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tier */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 font-medium">Tier</label>
                        <div className="flex flex-wrap gap-2">
                            {tiers.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => { setTier(t.id); setPrice(String(t.defaultPrice)); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${tier === t.id
                                        ? "border-pink-500 bg-pink-500/20 text-white"
                                        : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 font-medium">Price ($)</label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            min="0"
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500/50 transition-all"
                        />
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 font-medium">Full Content *</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="The juicy confession content fans will see after unlocking..."
                            className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 transition-all resize-none h-28"
                        />
                    </div>

                    {/* Media Upload / URL */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 font-medium">
                            {type === 'Text' ? 'Media URL (optional)' : `Upload ${type} File`}
                        </label>
                        {type !== 'Text' && !mediaUrl ? (
                            <div className="space-y-2">
                                <input
                                    type="file"
                                    accept={type === 'Audio' ? 'audio/*' : type === 'Video' ? 'video/*' : type === 'Image' ? 'image/*' : 'image/*,audio/*,video/*'}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setMediaFile(file);
                                        setUploading(true);
                                        try {
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            formData.append('folder', `confessions/${roomId}`);
                                            const res = await fetch('/api/v1/storage/upload', { method: 'POST', body: formData });
                                            const data = await res.json();
                                            if (data.success && data.publicUrl) {
                                                setMediaUrl(data.publicUrl);
                                                toast.success('File uploaded!');
                                            } else {
                                                toast.error(data.error || 'Upload failed');
                                            }
                                        } catch {
                                            toast.error('Upload failed');
                                        } finally {
                                            setUploading(false);
                                        }
                                    }}
                                    className="hidden"
                                    id="confession-media-upload"
                                />
                                <label
                                    htmlFor="confession-media-upload"
                                    className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-pink-500/30 bg-white/5 cursor-pointer hover:border-pink-500/60 hover:bg-pink-500/5 transition-all"
                                >
                                    {uploading ? (
                                        <Loader2 size={24} className="text-pink-400 animate-spin" />
                                    ) : (
                                        <Upload size={24} className="text-pink-400/60" />
                                    )}
                                    <span className="text-xs text-white/40">
                                        {uploading ? 'Uploading...' : `Click to upload ${type.toLowerCase()} file`}
                                    </span>
                                </label>
                            </div>
                        ) : mediaUrl ? (
                            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <span className="text-xs text-emerald-400 flex-1 truncate">✓ {mediaFile?.name || 'Media attached'}</span>
                                <button
                                    type="button"
                                    onClick={() => { setMediaUrl(''); setMediaFile(null); }}
                                    className="p-1 rounded-full hover:bg-white/10 text-white/50"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={mediaUrl}
                                onChange={(e) => setMediaUrl(e.target.value)}
                                placeholder="Link to image, audio, or video..."
                                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 transition-all"
                            />
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 pt-2 flex gap-3 border-t border-white/10">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !title.trim()}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-pink-900/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {editConfession ? "Save Changes" : "Publish"}
                    </button>
                </div>
            </div>
        </div>
    );
}
