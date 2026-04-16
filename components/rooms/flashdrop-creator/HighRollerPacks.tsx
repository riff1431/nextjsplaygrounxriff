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
        <div className="glass-panel rounded-xl p-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="font-display text-lg font-bold neon-text tracking-wider">
                    High Roller Packs
                </h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary transition-all"
                >
                    <Plus size={12} />
                    Add
                </button>
            </div>

            {/* Add Pack Form */}
            {showForm && (
                <form onSubmit={handleAdd} className="mb-3 p-2.5 rounded-lg border border-primary/30 bg-primary/5 flex flex-col gap-2">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Pack name (e.g. Diamond Patron)"
                        className="w-full bg-black/40 border border-primary/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/80 transition-all"
                    />
                    <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Price (€)"
                        type="number"
                        min="1"
                        className="w-full bg-black/40 border border-primary/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/80 transition-all"
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
                    <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2 py-6">
                        <Package size={28} className="text-primary/30" />
                        <span className="text-xs">No packs yet — add one above</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {packs.map((pack) => (
                            <div
                                key={pack.id}
                                className="relative p-2.5 rounded-lg border border-primary/25 bg-primary/5 group hover:border-primary/50 transition-all"
                            >
                                <button
                                    onClick={() => handleRemove(pack)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                >
                                    <X size={10} className="text-white" />
                                </button>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <DollarSign size={12} className="text-primary/70" />
                                    <span className="text-sm font-black neon-text">
                                        €{pack.price.toLocaleString()}
                                    </span>
                                </div>
                                <span className="text-[10px] font-semibold text-white/70 leading-tight line-clamp-2">
                                    {pack.name}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HighRollerPacks;
