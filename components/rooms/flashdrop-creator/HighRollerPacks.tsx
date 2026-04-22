"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, DollarSign, Package } from "lucide-react";
import { toast } from "sonner";

interface RollerPack {
    id: string;
    name: string;
    price: number;
    description?: string;
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

    const fetchPacks = useCallback(async () => {
        if (!roomId) return;
        const res = await fetch(`/api/v1/rooms/${roomId}/roller-packs`);
        const data = await res.json();
        if (data.packs) setPacks(data.packs);
    }, [roomId]);

    useEffect(() => {
        fetchPacks();
    }, [fetchPacks]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseFloat(price);
        if (!name.trim()) { toast.error("Pack name required"); return; }
        if (isNaN(p) || p <= 0) { toast.error("Valid price required"); return; }
        if (!roomId) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/roller-packs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), price: p }),
            });
            const data = await res.json();
            if (data.success) {
                setPacks(prev => [...prev, data.pack]);
                setName("");
                setPrice("");
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
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-primary/80 transition-all"
                    />
                    <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Price (€)"
                        type="number"
                        min="1"
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-primary/80 transition-all"
                    />
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-primary/60 hover:bg-primary/80 transition-all disabled:opacity-50"
                        >
                            {submitting ? "Adding..." : "Add Pack"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
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
                                <div className="pl-3 pr-2 py-2">
                                    <div className="flex items-baseline gap-0.5 mb-0.5">
                                        <span className="text-[10px] font-bold text-primary/70">€</span>
                                        <span className="font-display text-lg font-black" style={{ color: "#fff", textShadow: "0 0 10px hsl(var(--primary)/0.6)" }}>
                                            {pack.price.toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-white/65 leading-tight truncate">{pack.name}</p>
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
