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
        <div className="shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold neon-text tracking-wide uppercase">Bundles</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary transition-all"
                >
                    <Plus size={10} />
                    Add
                </button>
            </div>

            {/* Add Form */}
            {showForm && (
                <form onSubmit={handleAdd} className="mb-2 p-2 rounded-lg border border-primary/30 bg-primary/5 flex flex-wrap gap-2">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Bundle name"
                        className="flex-1 min-w-[120px] bg-black/40 border border-primary/40 rounded-lg px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/80"
                    />
                    <input
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Subtitle (optional)"
                        className="flex-1 min-w-[120px] bg-black/40 border border-primary/40 rounded-lg px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/80"
                    />
                    <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Price ($)"
                        type="number"
                        min="1"
                        className="w-20 bg-black/40 border border-primary/40 rounded-lg px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/80"
                    />
                    <button type="submit" disabled={submitting} className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-primary/60 hover:bg-primary/80 transition-all disabled:opacity-50">
                        {submitting ? "..." : "Add"}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="px-2 py-1 rounded-lg text-xs text-white/50 hover:text-white border border-white/15 transition-all">
                        Cancel
                    </button>
                </form>
            )}

            {/* Bundle Cards */}
            {bundles.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-3 text-white/30 text-xs">
                    <Package size={14} className="text-primary/30" />
                    <span>No bundles yet — add one above</span>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-3">
                    {bundles.map((bundle) => (
                        <div key={bundle.id} className="group relative flex flex-col gap-1">
                            <span className="text-xs font-semibold neon-text tracking-wide uppercase truncate pr-4">
                                {bundle.name}
                            </span>
                            {bundle.subtitle && (
                                <span className="text-[9px] text-white/40 truncate">{bundle.subtitle}</span>
                            )}
                            <div className="glass-card rounded-lg flex flex-col items-center justify-center h-16 w-full border border-primary/20 hover:border-primary/50 transition-all">
                                <span className="font-display text-xl font-black text-primary">
                                    ${bundle.price.toLocaleString()}
                                </span>
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                                    {bundle.sold_count || 0} sold
                                </span>
                            </div>
                            <button
                                onClick={() => handleRemove(bundle)}
                                className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            >
                                <X size={8} className="text-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BottomStrip;
