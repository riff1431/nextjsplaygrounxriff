"use client";

import React, { useState, useEffect } from "react";
import { 
    Settings, Save, Edit2, Plus, Trash2, HelpCircle, Dices, Coins, 
    Gamepad2, Martini, Trophy, Crown, Sparkles, Lock, Flame, Tv, 
    MessageCircle, Users, Star, Gift, X, RefreshCw 
} from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface IframeMenu {
    id: string;
    name: string;
    url: string;
    icon: string;
    color: string;
    target_role: string;
}

const COLOR_OPTIONS = [
    { value: "pink", label: "Pink", color: "#ec4899" },
    { value: "blue", label: "Blue", color: "#06b6d4" },
    { value: "purple", label: "Purple", color: "#a855f7" },
    { value: "green", label: "Green", color: "#22c55e" },
    { value: "yellow", label: "Yellow", color: "#eab308" },
    { value: "red", label: "Red", color: "#ef4444" },
];

const ICON_OPTIONS = [
    { value: "Dices", label: "Dices", component: Dices },
    { value: "Coins", label: "Coins", component: Coins },
    { value: "Trophy", label: "Trophy", component: Trophy },
    { value: "Gamepad2", label: "Gamepad", component: Gamepad2 },
    { value: "Martini", label: "Martini", component: Martini },
    { value: "Crown", label: "Crown", component: Crown },
    { value: "Sparkles", label: "Sparkles", component: Sparkles },
    { value: "Lock", label: "Lock", component: Lock },
    { value: "Flame", label: "Flame", component: Flame },
    { value: "Tv", label: "TV", component: Tv },
    { value: "MessageCircle", label: "Chat", component: MessageCircle },
    { value: "Users", label: "Users", component: Users },
    { value: "Star", label: "Star", component: Star },
    { value: "Gift", label: "Gift", component: Gift },
];

export function DynamicIcon({ name, className = "" }: { name: string; className?: string }) {
    const iconObj = ICON_OPTIONS.find(i => i.value === name);
    const IconComponent = iconObj ? iconObj.component : HelpCircle;
    return <IconComponent className={className} />;
}

export default function IframeMenuManager() {
    const supabase = createClient();
    const [menus, setMenus] = useState<IframeMenu[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form editing states
    const [editingMenu, setEditingMenu] = useState<IframeMenu | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<Partial<IframeMenu>>({});

    useEffect(() => {
        fetchMenus();
    }, []);

    const fetchMenus = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("iframe_menus")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching iframe menus:", error);
            toast.error("Failed to load iframe menus");
        } else {
            setMenus(data || []);
        }
        setLoading(false);
    };

    const openModal = (menu?: IframeMenu) => {
        if (menu) {
            setEditingMenu(menu);
            setForm({ ...menu });
        } else {
            setEditingMenu(null);
            setForm({
                name: "",
                url: "",
                icon: "Dices",
                color: "pink",
                target_role: "fan",
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingMenu(null);
        setForm({});
    };

    const handleSave = async () => {
        if (!form.name || !form.url) {
            toast.error("Name and URL are required");
            return;
        }

        setSaving(true);
        try {
            if (editingMenu) {
                // Update
                const { error } = await supabase
                    .from("iframe_menus")
                    .update({
                        name: form.name,
                        url: form.url,
                        icon: form.icon,
                        color: form.color,
                        target_role: form.target_role,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", editingMenu.id);

                if (error) throw error;
                toast.success("Menu item updated successfully!");
            } else {
                // Create
                const { error } = await supabase
                    .from("iframe_menus")
                    .insert([
                        {
                            name: form.name,
                            url: form.url,
                            icon: form.icon,
                            color: form.color,
                            target_role: form.target_role,
                        }
                    ]);

                if (error) throw error;
                toast.success("Menu item created successfully!");
            }
            closeModal();
            fetchMenus();
        } catch (error: any) {
            console.error("Error saving menu:", error);
            toast.error(error.message || "Failed to save menu item");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this menu item?")) return;

        try {
            const { error } = await supabase
                .from("iframe_menus")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Menu item deleted successfully!");
            fetchMenus();
        } catch (error: any) {
            console.error("Error deleting menu:", error);
            toast.error(error.message || "Failed to delete menu item");
        }
    };

    if (loading) {
        return (
            <NeonCard className="p-10 flex items-center justify-center">
                <div className="text-pink-500 animate-pulse flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Loading iframe menus...
                </div>
            </NeonCard>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <AdminSectionTitle
                    icon={<Settings className="w-5 h-5 text-amber-400" />}
                    title="Iframe Dynamic Menus"
                    sub="Configure custom iframe links to embed games or apps in the user sidebars"
                />
                <NeonButton onClick={() => openModal()} variant="pink" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Menu Item
                </NeonButton>
            </div>

            {/* Menu Items List Grid */}
            <NeonCard className="p-6">
                {menus.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 italic">
                        No dynamic menus configured. Click "Add Menu Item" to create one.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {menus.map((menu) => (
                            <div 
                                key={menu.id} 
                                className="group relative bg-black/40 border border-white/5 rounded-2xl p-4 hover:border-pink-500/30 transition-colors flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white">
                                            <DynamicIcon name={menu.icon} className="w-5 h-5" />
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openModal(menu)} className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(menu.id)} className="p-1.5 hover:bg-white/10 rounded-lg text-red-400">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            {menu.name}
                                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                                                Role: {menu.target_role}
                                            </span>
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono truncate mt-1.5" title={menu.url}>
                                            {menu.url}
                                        </p>
                                    </div>
                                </div>
                                <div className={`mt-4 h-1 w-full rounded-full bg-${menu.color}-500/50`} />
                            </div>
                        ))}
                    </div>
                )}
            </NeonCard>

            {/* Edit/Add Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-pink-500/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            {editingMenu ? <Edit2 className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-pink-400" />}
                            {editingMenu ? "Edit Menu Item" : "Add Menu Item"}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Menu Name</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none"
                                    value={form.name || ""}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Casino"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Target URL</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none font-mono text-sm"
                                    value={form.url || ""}
                                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                                    placeholder="https://example.com/casino"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Target View / User Role</label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none"
                                        value={form.target_role || "fan"}
                                        onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                                    >
                                        <option value="fan">Fan Sidebar</option>
                                        <option value="creator">Creator Menu</option>
                                        <option value="both">Both</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Color Theme / Tone</label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none"
                                        value={form.color || "pink"}
                                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    >
                                        {COLOR_OPTIONS.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-2">Select Icon</label>
                                <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto pr-1">
                                    {ICON_OPTIONS.map(ico => {
                                        const IconComp = ico.component;
                                        const isSelected = form.icon === ico.value;
                                        return (
                                            <button
                                                key={ico.value}
                                                type="button"
                                                onClick={() => setForm({ ...form, icon: ico.value })}
                                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                                                    isSelected 
                                                        ? "border-pink-500 bg-pink-500/10 text-pink-400" 
                                                        : "border-white/5 bg-black/20 text-gray-400 hover:bg-white/5"
                                                }`}
                                            >
                                                <IconComp className="w-5 h-5" />
                                                <span className="text-[9px] truncate max-w-full">{ico.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <NeonButton onClick={closeModal} variant="ghost" className="flex-1">
                                Cancel
                            </NeonButton>
                            <NeonButton onClick={handleSave} disabled={saving} variant="pink" className="flex-1 flex items-center justify-center gap-2">
                                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                                <Save className="w-4 h-4" /> Save Menu
                            </NeonButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
