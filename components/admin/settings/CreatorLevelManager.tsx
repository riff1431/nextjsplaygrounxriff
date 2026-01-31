"use client";

import React, { useState, useEffect } from "react";
import { Star, Save, Edit2, Plus, Trash2, GripVertical, DollarSign, FileText } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface CreatorLevel {
    id: string;
    name: string;
    display_name: string;
    price: number;
    required_posts: number | null;
    badge_icon_url: string | null;
    badge_color: string;
    features: string[];
    description: string | null;
    is_active: boolean;
    sort_order: number;
}

const LEVEL_ICONS: Record<string, string> = {
    rookie: "🌱",
    rising: "⭐",
    star: "🌟",
    elite: "👑",
};

export default function CreatorLevelManager() {
    const supabase = createClient();
    const [levels, setLevels] = useState<CreatorLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingLevel, setEditingLevel] = useState<CreatorLevel | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Form state for editing
    const [formData, setFormData] = useState<Partial<CreatorLevel>>({});

    useEffect(() => {
        fetchLevels();
    }, []);

    const fetchLevels = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("creator_level_plans")
            .select("*")
            .order("sort_order", { ascending: true });

        if (error) {
            toast.error("Failed to load creator levels");
            console.error(error);
        } else {
            setLevels(data || []);
        }
        setLoading(false);
    };

    const openEditModal = (level: CreatorLevel) => {
        setEditingLevel(level);
        setFormData({
            display_name: level.display_name,
            price: level.price,
            required_posts: level.required_posts,
            badge_color: level.badge_color,
            features: level.features,
            description: level.description,
            is_active: level.is_active,
        });
        setShowEditModal(true);
    };

    const closeModal = () => {
        setShowEditModal(false);
        setEditingLevel(null);
        setFormData({});
    };

    const handleSave = async () => {
        if (!editingLevel) return;
        setSaving(true);

        const { error } = await supabase
            .from("creator_level_plans")
            .update({
                display_name: formData.display_name,
                price: formData.price,
                required_posts: formData.required_posts || null,
                badge_color: formData.badge_color,
                features: formData.features,
                description: formData.description,
                is_active: formData.is_active,
                updated_at: new Date().toISOString(),
            })
            .eq("id", editingLevel.id);

        if (error) {
            toast.error("Failed to update level");
            console.error(error);
        } else {
            toast.success("Level updated successfully");
            await fetchLevels();
            closeModal();
        }
        setSaving(false);
    };

    const addFeature = () => {
        setFormData((prev) => ({
            ...prev,
            features: [...(prev.features || []), ""],
        }));
    };

    const updateFeature = (index: number, value: string) => {
        const newFeatures = [...(formData.features || [])];
        newFeatures[index] = value;
        setFormData((prev) => ({ ...prev, features: newFeatures }));
    };

    const removeFeature = (index: number) => {
        const newFeatures = [...(formData.features || [])];
        newFeatures.splice(index, 1);
        setFormData((prev) => ({ ...prev, features: newFeatures }));
    };

    if (loading) {
        return (
            <NeonCard className="p-5">
                <div className="text-center text-gray-500 py-10">Loading creator levels...</div>
            </NeonCard>
        );
    }

    return (
        <>
            <NeonCard className="p-5">
                <AdminSectionTitle
                    icon={<Star className="w-4 h-4" />}
                    title="Creator Level Plans"
                    sub="Configure creator advancement levels (Rookie, Rising, Star, Elite)"
                />

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {levels.map((level) => (
                        <div
                            key={level.id}
                            className={`relative p-5 rounded-2xl border transition-all ${level.is_active
                                    ? "bg-gradient-to-br from-black/60 to-black/40 border-white/10"
                                    : "bg-black/20 border-white/5 opacity-60"
                                }`}
                        >
                            {/* Level Icon */}
                            <div className="text-2xl mb-2">
                                {LEVEL_ICONS[level.name] || "📊"}
                            </div>

                            {/* Badge Color Indicator */}
                            <div
                                className="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-white/20"
                                style={{ backgroundColor: level.badge_color }}
                                title={`Badge color: ${level.badge_color}`}
                            />

                            {/* Level Name */}
                            <div
                                className="text-lg font-bold mb-1"
                                style={{ color: level.badge_color }}
                            >
                                {level.display_name}
                            </div>

                            {/* Requirements */}
                            <div className="space-y-1 mb-3">
                                {level.price === 0 && !level.required_posts ? (
                                    <span className="text-sm text-green-400 font-semibold">Free</span>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {level.price > 0 && (
                                            <div className="flex items-center gap-1 text-sm">
                                                <DollarSign className="w-3 h-3 text-yellow-400" />
                                                <span className="text-white font-bold">${level.price}</span>
                                            </div>
                                        )}
                                        {level.required_posts && level.price > 0 && (
                                            <span className="text-xs text-gray-400">OR</span>
                                        )}
                                        {level.required_posts && (
                                            <div className="flex items-center gap-1 text-sm">
                                                <FileText className="w-3 h-3 text-blue-400" />
                                                <span className="text-white">{level.required_posts}+ posts</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Features */}
                            <div className="space-y-1 mb-4">
                                {level.features.slice(0, 3).map((feature, i) => (
                                    <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                        {feature}
                                    </div>
                                ))}
                                {level.features.length > 3 && (
                                    <div className="text-xs text-gray-500">
                                        +{level.features.length - 3} more features
                                    </div>
                                )}
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-2 mb-4">
                                <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full ${level.is_active
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-red-500/20 text-red-400"
                                        }`}
                                >
                                    {level.is_active ? "Active" : "Inactive"}
                                </span>
                            </div>

                            {/* Edit Button */}
                            <NeonButton
                                variant="ghost"
                                className="w-full flex items-center justify-center gap-2"
                                onClick={() => openEditModal(level)}
                            >
                                <Edit2 className="w-3 h-3" />
                                Edit Level
                            </NeonButton>
                        </div>
                    ))}
                </div>
            </NeonCard>

            {/* Edit Modal */}
            {showEditModal && editingLevel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-cyan-500/20 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-cyan-500" />
                                Edit {editingLevel.display_name}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Display Name */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Display Name</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                    value={formData.display_name || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, display_name: e.target.value })
                                    }
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">
                                    Price (USD) - Set to 0 for free/post-only tier
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white"
                                        value={formData.price || 0}
                                        onChange={(e) =>
                                            setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Required Posts */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">
                                    Required Posts (alternative to paying)
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white"
                                        value={formData.required_posts || ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                required_posts: e.target.value ? parseInt(e.target.value) : null,
                                            })
                                        }
                                        placeholder="Leave empty if price-only"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    If set, creators can unlock this level by reaching the post count instead of paying
                                </p>
                            </div>

                            {/* Badge Color */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Badge Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer"
                                        value={formData.badge_color || "#00bfff"}
                                        onChange={(e) =>
                                            setFormData({ ...formData, badge_color: e.target.value })
                                        }
                                    />
                                    <input
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                        value={formData.badge_color || ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, badge_color: e.target.value })
                                        }
                                        placeholder="#00bfff"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Description</label>
                                <textarea
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white resize-none"
                                    rows={2}
                                    value={formData.description || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                />
                            </div>

                            {/* Features */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Features</label>
                                <div className="space-y-2">
                                    {(formData.features || []).map((feature, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <GripVertical className="w-3 h-3 text-gray-500" />
                                            <input
                                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                                value={feature}
                                                onChange={(e) => updateFeature(index, e.target.value)}
                                                placeholder="Feature description"
                                            />
                                            <button
                                                onClick={() => removeFeature(index)}
                                                className="text-red-400 hover:text-red-300 p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={addFeature}
                                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Feature
                                    </button>
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-400">Level Active</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.is_active}
                                        onChange={(e) =>
                                            setFormData({ ...formData, is_active: e.target.checked })
                                        }
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                            <NeonButton variant="ghost" className="flex-1" onClick={closeModal}>
                                Cancel
                            </NeonButton>
                            <NeonButton
                                variant="blue"
                                className="flex-1 flex items-center justify-center gap-2"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    "Saving..."
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </NeonButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
