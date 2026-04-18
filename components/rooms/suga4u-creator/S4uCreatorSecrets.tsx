"use client";

import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { useSuga4U } from "@/hooks/useSuga4U";

const categories = [
    { label: "CUTE", emoji: "🎀" },
    { label: "LUXURY", emoji: "💎" },
    { label: "DREAM", emoji: "👑" },
];

const S4uCreatorSecrets = ({ roomId }: { roomId?: string }) => {
    const { secrets, createSecret, deleteSecret } = useSuga4U(roomId || null);
    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("CUTE");
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleAdd = async () => {
        if (!name || !price) return;
        setIsUploading(true);
        let mediaUrl = null;
        let mediaType = null;

        if (file) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", "secrets");
            try {
                const res = await fetch("/api/v1/storage/upload", { method: "POST", body: formData });
                const data = await res.json();
                if (data.publicUrl) {
                    mediaUrl = data.publicUrl;
                    mediaType = file.type.startsWith("image/") ? "image" : "video";
                }
            } catch (err) {
                console.error("Upload failed", err);
            }
        }

        await createSecret(name, desc, Number(price), category, mediaUrl, mediaType);
        setIsAdding(false);
        setIsUploading(false);
        setName("");
        setDesc("");
        setPrice("");
        setCategory("CUTE");
        setFile(null);
    };

    const getCategoryEmoji = (cat: string) => categories.find(c => c.label === cat)?.emoji || "🌸";

    return (
        <div className="s4u-creator-glass-panel p-4 flex flex-col h-full">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3">Creator Secrets</h3>
            <div className="flex-1 overflow-y-auto min-h-0 chat-scroll">
                <div className="space-y-3 pr-2">
                    {secrets.length === 0 && !isAdding && (
                        <p className="text-xs text-white/50 text-center py-4">No secrets created yet</p>
                    )}
                    {secrets.map((s) => (
                        <div key={s.id} className="bg-white/5 rounded-lg px-3 py-2.5 relative group">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{getCategoryEmoji(s.category)}</span>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold text-white">{s.name}</span>
                                            {s.media_url && <ImageIcon className="w-3 h-3 text-pink-400" />}
                                        </div>
                                        <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">{s.category}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 hover:text-red-400 transition-colors">
                                    <span className="text-sm font-bold s4u-creator-text-gold">€{s.unlock_price}</span>
                                    <button 
                                        onClick={() => deleteSecret(s.id)}
                                        className="text-white/40 hover:text-red-400 transition-colors p-1"
                                        title="Delete secret"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {s.description && <p className="text-xs text-white/50 mb-2 ml-7">{s.description}</p>}
                        </div>
                    ))}
                    
                    {isAdding && (
                        <div className="bg-white/10 border border-gold/30 rounded-lg p-3 space-y-2">
                            {/* Category selector */}
                            <div className="flex gap-1">
                                {categories.map((c) => (
                                    <button
                                        key={c.label}
                                        onClick={() => setCategory(c.label)}
                                        className={`flex-1 border rounded-full px-1 py-1.5 text-[10px] font-bold tracking-wider transition-colors ${
                                            category === c.label
                                                ? 'bg-pink-500/30 border-pink-500 text-white'
                                                : 'bg-white/5 border-white/10 text-white/50 hover:border-pink-500/50'
                                        }`}
                                    >
                                        {c.emoji} {c.label}
                                    </button>
                                ))}
                            </div>
                            <input type="text" placeholder="Secret Title" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/20 rounded px-2 py-1 text-sm text-white outline-none" />
                            <input type="text" placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-black/20 rounded px-2 py-1 text-sm text-white outline-none" />
                            <input type="number" placeholder="Price ($)" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black/20 rounded px-2 py-1 text-sm text-white outline-none" />
                            
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => document.getElementById('secret-file-upload')?.click()}
                                    className="flex flex-1 items-center justify-center bg-black/20 hover:bg-black/40 rounded px-3 py-1.5 text-[11px] text-pink-300 font-bold border border-pink-500/30 transition-colors truncate"
                                    disabled={isUploading}
                                >
                                    <ImageIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                                    <span className="truncate">{file ? file.name : "Attach Image/Video"}</span>
                                </button>
                                <input 
                                    id="secret-file-upload"
                                    type="file" 
                                    accept="image/*,video/*" 
                                    className="hidden" 
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                                {file && (
                                    <button onClick={() => setFile(null)} className="text-red-400 p-1.5 hover:text-red-300 bg-red-500/10 rounded">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button onClick={handleAdd} disabled={isUploading} className="flex-1 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded">
                                    {isUploading ? "Uploading..." : "Save"}
                                </button>
                                <button onClick={() => setIsAdding(false)} disabled={isUploading} className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1.5 rounded">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {!isAdding && (
                <button onClick={() => setIsAdding(true)} className="mt-3 flex items-center gap-1 text-sm s4u-creator-text-primary hover:opacity-80 transition-opacity">
                    <Plus className="w-4 h-4" /> Add item
                </button>
            )}
        </div>
    );
};

export default S4uCreatorSecrets;
