"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Trash2, Package } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface Bundle {
    id: string;
    name: string;
    subtitle?: string;
    price: number;
    sold_count?: number;
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

    const fetchBundles = useCallback(async () => {
        if (!roomId) return;
        const res = await fetch(`/api/v1/rooms/${roomId}/bundles`);
        const data = await res.json();
        if (data.bundles) setBundles(data.bundles);
    }, [roomId]);

    useEffect(() => {
        fetchBundles();
    }, [fetchBundles]);

    // Realtime updates
    useEffect(() => {
        if (!roomId) return;
        const channel = supabase
            .channel(`creator-bundles-${roomId}`)
            .on("postgres_changes", {
                event: "*", schema: "public", table: "flash_drop_bundles", filter: `room_id=eq.${roomId}`,
            }, fetchBundles)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchBundles]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseFloat(price);
        if (!name.trim()) { toast.error("Bundle name required"); return; }
        if (isNaN(p) || p <= 0) { toast.error("Valid price required"); return; }
        if (!roomId) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/bundles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), subtitle: subtitle.trim() || null, price: p }),
            });
            const data = await res.json();
            if (data.success) {
                setBundles(prev => [...prev, data.bundle]);
                setName(""); setSubtitle(""); setPrice("");
                setShowForm(false);
                toast.success(`✅ Bundle "${data.bundle.name}" added!`);
            } else {
                toast.error(data.error || "Failed to add");
            }
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
            if (data.success) {
                setBundles(prev => prev.filter(b => b.id !== bundle.id));
                toast.success(`Removed "${bundle.name}"`);
            }
        } catch { toast.error("Network error"); }
    };

    return (
        <div className="shrink-0 glass-panel rounded-xl p-4 border border-primary/20 shadow-[0_0_15px_rgba(255,42,109,0.05)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-sm font-bold neon-text tracking-wider uppercase font-display">Bundles</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold font-display tracking-wider text-primary border border-primary hover:bg-primary/20 transition-all"
                >
                    <Plus size={14} />
                    Add
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-0 flex flex-col">
                {/* Add Form */}
                {showForm && (
                    <form onSubmit={handleAdd} className="mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Bundle name"
                            className="flex-1 min-w-[120px] bg-black/40 border border-primary/40 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/80 transition-all"
                        />
                        <input
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            placeholder="Subtitle (optional)"
                            className="flex-1 min-w-[120px] bg-black/40 border border-primary/40 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/80 transition-all"
                        />
                        <input
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="Price ($)"
                            type="number"
                            min="1"
                            className="w-24 bg-black/40 border border-primary/40 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/80 transition-all"
                        />
                        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-primary/60 hover:bg-primary/80 transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(255,42,109,0.3)]">
                            {submitting ? "..." : "Add Bundle"}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white border border-white/10 transition-all">
                            Cancel
                        </button>
                    </form>
                )}

                {/* Bundle Cards */}
                {bundles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-white/20 text-xs border border-dashed border-white/10 rounded-lg">
                        <Package size={24} className="mb-2 opacity-20" />
                        <span>No bundles active. Create one to increase sales!</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        {bundles.map((bundle) => (
                            <div key={bundle.id} className="group relative flex flex-col gap-1">
                                <span className="text-[10px] font-bold neon-text tracking-widest uppercase truncate pr-6 mb-1">
                                    {bundle.name}
                                </span>
                                <div className="glass-card rounded-xl flex flex-col items-center justify-center h-20 w-full border border-primary/20 group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(255,42,109,0.1)] transition-all overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="font-display text-2xl font-black text-primary relative z-10">
                                        ${bundle.price.toLocaleString()}
                                    </span>
                                    {bundle.subtitle && (
                                        <span className="text-[9px] text-white/40 truncate relative z-10 px-2 text-center w-full">{bundle.subtitle}</span>
                                    )}
                                </div>
                                <div className="mt-1 flex items-center justify-between px-1">
                                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">
                                        {bundle.sold_count || 0} sold
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleRemove(bundle)}
                                    className="absolute top-0 right-0 w-5 h-5 rounded-full bg-red-500/20 text-red-500/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                    title="Delete bundle"
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

export default BottomStrip;
