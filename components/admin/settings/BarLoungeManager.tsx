"use client";

import React, { useState, useEffect } from "react";
import { Martini, Save, Edit2, Plus, Trash2, DollarSign, GripVertical, Check, X, RefreshCw } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { uploadToLocalServer } from "@/utils/uploadHelper";

interface SpinOutcome {
    id: string;
    label: string;
    odds: number;
    note: string;
}

interface Drink {
    id: string;
    name: string;
    price: number;
    icon: string;
    tone: string;
    special?: string;
}

interface BarConfig {
    id: number;
    vip_price: number;
    ultra_vip_price: number;
    spin_odds: SpinOutcome[];
    menu_items: Drink[];
}

const DRINK_TONES = [
    { value: "red", label: "Red", color: "#ef4444" },
    { value: "pink", label: "Pink", color: "#ec4899" },
    { value: "blue", label: "Blue", color: "#3b82f6" },
    { value: "yellow", label: "Yellow", color: "#eab308" },
    { value: "purple", label: "Purple", color: "#a855f7" },
    { value: "green", label: "Green", color: "#22c55e" },
    { value: "cyan", label: "Cyan", color: "#06b6d4" },
];

export default function BarLoungeManager() {
    const supabase = createClient();
    const [config, setConfig] = useState<BarConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editing states
    const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
    const [showDrinkModal, setShowDrinkModal] = useState(false);
    const [drinkForm, setDrinkForm] = useState<Partial<Drink>>({});

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("admin_bar_config")
            .select("*")
            .eq("id", 1)
            .single();

        if (error) {
            console.error("Error fetching bar config:", error);
            // Don't toast error on 406 (empty), just handle
            if (error.code !== "PGRST116") {
                toast.error("Failed to load configuration");
            }
        } else {
            setConfig(data);
        }
        setLoading(false);
    };

    const handleSaveMain = async () => {
        if (!config) return;
        setSaving(true);
        const { error } = await supabase
            .from("admin_bar_config")
            .upsert({ ...config, id: 1, updated_at: new Date().toISOString() });

        if (error) {
            console.error("Error saving config:", error);
            toast.error("Failed to save configuration");
        } else {
            toast.success("Bar Lounge settings saved!");
        }
        setSaving(false);
    };

    // --- Drink Modal Handlers ---

    const openDrinkModal = (drink?: Drink) => {
        if (drink) {
            setEditingDrink(drink);
            setDrinkForm({ ...drink });
        } else {
            setEditingDrink(null);
            setDrinkForm({
                id: `d-${Date.now()}`,
                name: "",
                price: 10,
                icon: "🍹",
                tone: "pink",
            });
        }
        setShowDrinkModal(true);
    };

    const closeDrinkModal = () => {
        setShowDrinkModal(false);
        setEditingDrink(null);
        setDrinkForm({});
    };

    const saveDrink = () => {
        if (!config) return;
        if (!drinkForm.name || !drinkForm.price) {
            toast.error("Name and price are required");
            return;
        }

        const newDrink = drinkForm as Drink;
        let newMenu = [...(config.menu_items || [])];

        if (editingDrink) {
            newMenu = newMenu.map(d => d.id === editingDrink.id ? newDrink : d);
        } else {
            newMenu.push(newDrink);
        }

        setConfig({ ...config, menu_items: newMenu });
        closeDrinkModal();
        toast.success("Drink saved (remember to click Save Changes to persist)");
    };

    const deleteDrink = (id: string) => {
        if (!config) return;
        if (!confirm("Delete this drink?")) return;
        const newMenu = config.menu_items.filter(d => d.id !== id);
        setConfig({ ...config, menu_items: newMenu });
    };

    // --- Spin Odds Handlers ---

    const updateSpinOutcome = (index: number, field: keyof SpinOutcome, value: any) => {
        if (!config) return;
        const newOdds = [...config.spin_odds];
        newOdds[index] = { ...newOdds[index], [field]: value };
        setConfig({ ...config, spin_odds: newOdds });
    };

    if (loading) {
        return (
            <NeonCard className="p-10 flex items-center justify-center">
                <div className="text-pink-500 animate-pulse">Loading Bar Lounge settings...</div>
            </NeonCard>
        );
    }

    if (!config) {
        return (
            <NeonCard className="p-10 flex flex-col items-center justify-center gap-4">
                <div className="text-gray-400">No configuration found.</div>
                <NeonButton onClick={fetchConfig} variant="pink">Retry</NeonButton>
            </NeonCard>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-end">
                <NeonButton
                    onClick={handleSaveMain}
                    disabled={saving}
                    className="flex items-center gap-2 px-6"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save All Changes
                </NeonButton>
            </div>

            {/* Global Pricing */}
            <NeonCard className="p-6">
                <AdminSectionTitle
                    icon={<DollarSign className="w-5 h-5 text-green-400" />}
                    title="Entry Pricing"
                    sub="Set the global prices for VIP areas"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                        <label className="block text-xs text-gray-400 mb-2">VIP Price (Tokens)</label>
                        <input
                            type="number"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none transition-colors"
                            value={config.vip_price}
                            onChange={(e) => setConfig({ ...config, vip_price: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-2">Ultra VIP Price (Tokens)</label>
                        <input
                            type="number"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none transition-colors"
                            value={config.ultra_vip_price}
                            onChange={(e) => setConfig({ ...config, ultra_vip_price: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                </div>
            </NeonCard>

            {/* Drinks Menu */}
            <NeonCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <AdminSectionTitle
                        icon={<Martini className="w-5 h-5 text-pink-400" />}
                        title="Drinks Menu"
                        sub="Manage available drinks and their prices"
                    />
                    <NeonButton onClick={() => openDrinkModal()} variant="ghost" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Drink
                    </NeonButton>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {config.menu_items?.map((drink) => (
                        <div key={drink.id} className="group relative bg-black/40 border border-white/5 rounded-2xl p-4 hover:border-pink-500/30 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white/5 border border-white/10">
                                    {drink.icon}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openDrinkModal(drink)} className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => deleteDrink(drink.id)} className="p-1.5 hover:bg-white/10 rounded-lg text-red-400">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3">
                                <h3 className="font-medium text-white">{drink.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-green-400 font-mono text-sm">${drink.price}</span>
                                    {drink.special && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                            Special
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-${drink.tone}-500/50`} />
                        </div>
                    ))}
                </div>
            </NeonCard>

            {/* Spin Odds */}
            <NeonCard className="p-6">
                <AdminSectionTitle
                    icon={<RefreshCw className="w-5 h-5 text-cyan-400" />}
                    title="Spin the Bottle Outcomes"
                    sub="Configure probabilities and labels for the game"
                />

                <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-gray-400">
                            <tr>
                                <th className="p-3 font-medium">Outcome Label</th>
                                <th className="p-3 font-medium w-24">Odds (%)</th>
                                <th className="p-3 font-medium">Description / Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white">
                            {config.spin_odds?.map((outcome, idx) => (
                                <tr key={outcome.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3">
                                        <input
                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-white font-medium placeholder-gray-600"
                                            value={outcome.label}
                                            onChange={(e) => updateSpinOutcome(idx, "label", e.target.value)}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="number"
                                            className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-center text-white focus:border-cyan-500/50 outline-none"
                                            value={outcome.odds}
                                            onChange={(e) => updateSpinOutcome(idx, "odds", parseInt(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input
                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-400 text-xs placeholder-gray-700"
                                            value={outcome.note}
                                            onChange={(e) => updateSpinOutcome(idx, "note", e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-3 bg-white/5 border-t border-white/10 flex justify-between items-center">
                        <span className="text-xs text-gray-400">Total Probability:</span>
                        <span className={`text-sm font-bold ${config.spin_odds?.reduce((a, b) => a + (b.odds || 0), 0) === 100 ? 'text-green-400' : 'text-red-400'}`}>
                            {config.spin_odds?.reduce((a, b) => a + (b.odds || 0), 0)}%
                        </span>
                    </div>
                </div>
            </NeonCard>

            {/* Drink Edit Modal */}
            {showDrinkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-pink-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        <button onClick={closeDrinkModal} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            {editingDrink ? <Edit2 className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-pink-400" />}
                            {editingDrink ? "Edit Drink" : "Add New Drink"}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Drink Name</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-pink-500/50 outline-none"
                                    value={drinkForm.name || ""}
                                    onChange={(e) => setDrinkForm({ ...drinkForm, name: e.target.value })}
                                    placeholder="e.g. Neon Martini"
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-400 mb-1">Price (Tokens)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                                        <input
                                            type="number"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:border-pink-500/50 outline-none"
                                            value={drinkForm.price || 0}
                                            onChange={(e) => setDrinkForm({ ...drinkForm, price: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs text-gray-400 mb-1">Icon (Emoji)</label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center text-xl text-white focus:border-pink-500/50 outline-none"
                                        value={drinkForm.icon || ""}
                                        onChange={(e) => setDrinkForm({ ...drinkForm, icon: e.target.value })}
                                        placeholder="🍹"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Glow Tone</label>
                                <div className="flex flex-wrap gap-2">
                                    {DRINK_TONES.map(t => (
                                        <button
                                            key={t.value}
                                            onClick={() => setDrinkForm({ ...drinkForm, tone: t.value })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${drinkForm.tone === t.value
                                                ? `bg-${t.value}-500/20 border-${t.value}-500 text-${t.value}-300`
                                                : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/5"}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Special Tag ID (Optional)</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:border-pink-500/50 outline-none"
                                    value={drinkForm.special || ""}
                                    onChange={(e) => setDrinkForm({ ...drinkForm, special: e.target.value })}
                                    placeholder="e.g. vipbottle"
                                />
                                <p className="text-[10px] text-gray-600 mt-1">Used for code-specific triggers (e.g. champagne rain)</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <NeonButton onClick={closeDrinkModal} variant="ghost" className="flex-1">Cancel</NeonButton>
                            <NeonButton onClick={saveDrink} variant="pink" className="flex-1">Save Drink</NeonButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
