"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Save, Edit2, Plus, Trash2, DollarSign, GripVertical } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface AccountType {
    id: string;
    name: string;
    display_name: string;
    price: number;
    billing_type: "one_time" | "recurring";
    badge_icon: string | null;
    badge_icon_url: string | null;
    badge_color: string;
    features: string[] | null;
    description: string | null;
    is_active: boolean;
    sort_order: number;
}

export default function AccountTypeManager() {
    const supabase = createClient();
    const [types, setTypes] = useState<AccountType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingType, setEditingType] = useState<AccountType | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state for editing
    const [formData, setFormData] = useState<Partial<AccountType>>({});

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("account_types")
            .select("*")
            .order("sort_order", { ascending: true });

        if (error) {
            toast.error("Failed to load account types");
            console.error(error);
        } else {
            setTypes(data || []);
        }
        setLoading(false);
    };

    const openEditModal = (type: AccountType) => {
        setEditingType(type);
        setFormData({
            display_name: type.display_name,
            price: type.price || 0,
            billing_type: type.billing_type || "one_time",
            badge_color: type.badge_color,
            badge_icon: type.badge_icon,
            features: type.features || [],
            description: type.description,
            is_active: type.is_active,
        });
        setShowEditModal(true);
    };

    const openAddModal = () => {
        setFormData({
            name: "",
            display_name: "",
            price: 0,
            billing_type: "one_time",
            badge_color: "#ff69b4",
            badge_icon: "💎",
            features: [],
            description: "",
            is_active: true,
            sort_order: types.length + 1,
        });
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowEditModal(false);
        setShowAddModal(false);
        setEditingType(null);
        setFormData({});
    };

    const handleSave = async () => {
        if (!editingType) return;
        setSaving(true);

        const { error } = await supabase
            .from("account_types")
            .update({
                display_name: formData.display_name,
                price: formData.price || 0,
                billing_type: formData.billing_type,
                badge_color: formData.badge_color,
                badge_icon: formData.badge_icon,
                features: formData.features,
                description: formData.description,
                is_active: formData.is_active,
                updated_at: new Date().toISOString(),
            })
            .eq("id", editingType.id);

        if (error) {
            toast.error("Failed to update account type");
            console.error(error);
        } else {
            toast.success("Account type updated successfully");
            await fetchTypes();
            closeModal();
        }
        setSaving(false);
    };

    const handleAdd = async () => {
        if (!formData.name || !formData.display_name) {
            toast.error("Please fill in name and display name");
            return;
        }
        setSaving(true);

        // Generate slug from name
        const slug = formData.name.toLowerCase().replace(/\s+/g, "_");

        const { error } = await supabase.from("account_types").insert({
            name: slug,
            display_name: formData.display_name,
            price: formData.price || 0,
            billing_type: formData.billing_type || "one_time",
            badge_color: formData.badge_color || "#ff69b4",
            badge_icon: formData.badge_icon || "💎",
            features: formData.features || [],
            description: formData.description || "",
            is_active: formData.is_active !== false,
            sort_order: formData.sort_order || types.length + 1,
        });

        if (error) {
            toast.error("Failed to add account type");
            console.error(error);
        } else {
            toast.success("Account type added successfully");
            await fetchTypes();
            closeModal();
        }
        setSaving(false);
    };

    const handleDelete = async (type: AccountType) => {
        if (!confirm(`Are you sure you want to delete "${type.display_name}"?`)) return;

        const { error } = await supabase.from("account_types").delete().eq("id", type.id);

        if (error) {
            toast.error("Failed to delete account type");
            console.error(error);
        } else {
            toast.success("Account type deleted");
            await fetchTypes();
        }
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
                <div className="text-center text-gray-500 py-10">Loading account types...</div>
            </NeonCard>
        );
    }

    return (
        <>
            <NeonCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <AdminSectionTitle
                        icon={<Sparkles className="w-4 h-4" />}
                        title="Account Types"
                        sub="Manage fan identity types (Sugar Daddy, Sugar Mommy, etc.)"
                    />
                    <NeonButton
                        variant="pink"
                        className="flex items-center gap-2"
                        onClick={openAddModal}
                    >
                        <Plus className="w-4 h-4" />
                        Add Type
                    </NeonButton>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {types.map((type) => (
                        <div
                            key={type.id}
                            className={`relative p-5 rounded-2xl border transition-all ${type.is_active
                                ? "bg-gradient-to-br from-black/60 to-black/40 border-white/10"
                                : "bg-black/20 border-white/5 opacity-60"
                                }`}
                        >
                            {/* Badge Icon & Color */}
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                    style={{ backgroundColor: `${type.badge_color}20` }}
                                >
                                    {type.badge_icon || "💎"}
                                </div>
                                <div>
                                    <div
                                        className="font-bold"
                                        style={{ color: type.badge_color }}
                                    >
                                        {type.display_name}
                                    </div>
                                    <div className="text-xs text-gray-500">@{type.name}</div>
                                </div>
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline gap-1 mb-3">
                                {(type.price || 0) === 0 ? (
                                    <span className="text-xl font-bold text-green-400">Free</span>
                                ) : (
                                    <>
                                        <span className="text-xl font-bold text-white">
                                            ${type.price}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {type.billing_type === "recurring" ? "/month" : " one-time"}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Description */}
                            {type.description && (
                                <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                                    {type.description}
                                </p>
                            )}

                            {/* Features */}
                            {type.features && type.features.length > 0 && (
                                <div className="space-y-1 mb-3">
                                    {type.features.slice(0, 3).map((feature, i) => (
                                        <div key={i} className="text-xs text-gray-500 flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: type.badge_color }} />
                                            {feature}
                                        </div>
                                    ))}
                                    {type.features.length > 3 && (
                                        <div className="text-xs text-gray-600">
                                            +{type.features.length - 3} more
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Status Badge */}
                            <div className="flex items-center gap-2 mb-4">
                                <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full ${type.is_active
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-red-500/20 text-red-400"
                                        }`}
                                >
                                    {type.is_active ? "Active" : "Inactive"}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <NeonButton
                                    variant="ghost"
                                    className="flex-1 flex items-center justify-center gap-1"
                                    onClick={() => openEditModal(type)}
                                >
                                    <Edit2 className="w-3 h-3" />
                                    Edit
                                </NeonButton>
                                <NeonButton
                                    variant="ghost"
                                    className="!px-3 !border-red-500/30 hover:!bg-red-500/10"
                                    onClick={() => handleDelete(type)}
                                >
                                    <Trash2 className="w-3 h-3 text-red-400" />
                                </NeonButton>
                            </div>
                        </div>
                    ))}
                </div>
            </NeonCard>

            {/* Edit/Add Modal */}
            {(showEditModal || showAddModal) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-pink-500/20 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                {showAddModal ? (
                                    <>
                                        <Plus className="w-4 h-4 text-pink-500" />
                                        Add Account Type
                                    </>
                                ) : (
                                    <>
                                        <Edit2 className="w-4 h-4 text-pink-500" />
                                        Edit {editingType?.display_name}
                                    </>
                                )}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Name (only for add) */}
                            {showAddModal && (
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">
                                        Internal Name (slug)
                                    </label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                        value={formData.name || ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="e.g. sugar_daddy"
                                    />
                                </div>
                            )}

                            {/* Display Name */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Display Name</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                    value={formData.display_name || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, display_name: e.target.value })
                                    }
                                    placeholder="e.g. Sugar Daddy"
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">
                                    Price (USD) - Set to 0 for free
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

                            {/* Billing Type */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Billing Type</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, billing_type: "one_time" })}
                                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition ${formData.billing_type === "one_time"
                                            ? "bg-pink-500/20 border border-pink-500/40 text-pink-300"
                                            : "bg-black/40 border border-white/10 text-gray-400"
                                            }`}
                                    >
                                        One-time
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, billing_type: "recurring" })}
                                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition ${formData.billing_type === "recurring"
                                            ? "bg-pink-500/20 border border-pink-500/40 text-pink-300"
                                            : "bg-black/40 border border-white/10 text-gray-400"
                                            }`}
                                    >
                                        Monthly
                                    </button>
                                </div>
                            </div>

                            {/* Badge Icon */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Badge Emoji/Icon</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                    value={formData.badge_icon || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, badge_icon: e.target.value })
                                    }
                                    placeholder="💎"
                                />
                            </div>

                            {/* Badge Color */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Badge Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer"
                                        value={formData.badge_color || "#ff69b4"}
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
                                        placeholder="#ff69b4"
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
                                    placeholder="Describe this account type..."
                                />
                            </div>

                            {/* Features */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Features/Perks</label>
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
                                        className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Feature
                                    </button>
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-400">Type Active</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.is_active !== false}
                                        onChange={(e) =>
                                            setFormData({ ...formData, is_active: e.target.checked })
                                        }
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                            <NeonButton variant="ghost" className="flex-1" onClick={closeModal}>
                                Cancel
                            </NeonButton>
                            <NeonButton
                                variant="pink"
                                className="flex-1 flex items-center justify-center gap-2"
                                onClick={showAddModal ? handleAdd : handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    "Saving..."
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        {showAddModal ? "Add Type" : "Save Changes"}
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
