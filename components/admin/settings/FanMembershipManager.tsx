"use client";

import React, { useState, useEffect } from "react";
import { Crown, Save, Edit2, Plus, Trash2, GripVertical, DollarSign } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface MembershipPlan {
    id: string;
    name: string;
    display_name: string;
    price: number;
    badge_icon_url: string | null;
    badge_color: string;
    features: string[];
    description: string | null;
    is_active: boolean;
    sort_order: number;
}

const DEFAULT_COLORS: Record<string, string> = {
    bronze: "#cd7f32",
    silver: "#c0c0c0",
    gold: "#ffd700",
};

export default function FanMembershipManager() {
    const supabase = createClient();
    const [plans, setPlans] = useState<MembershipPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Form state for editing
    const [formData, setFormData] = useState<Partial<MembershipPlan>>({});

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("fan_membership_plans")
            .select("*")
            .order("sort_order", { ascending: true });

        if (error) {
            toast.error("Failed to load membership plans");
            console.error(error);
        } else {
            setPlans(data || []);
        }
        setLoading(false);
    };

    const openEditModal = (plan: MembershipPlan) => {
        setEditingPlan(plan);
        setFormData({
            display_name: plan.display_name,
            price: plan.price,
            badge_color: plan.badge_color,
            features: plan.features,
            description: plan.description,
            is_active: plan.is_active,
        });
        setShowEditModal(true);
    };

    const closeModal = () => {
        setShowEditModal(false);
        setEditingPlan(null);
        setFormData({});
    };

    const handleSave = async () => {
        if (!editingPlan) return;
        setSaving(true);

        const { error } = await supabase
            .from("fan_membership_plans")
            .update({
                display_name: formData.display_name,
                price: formData.price,
                badge_color: formData.badge_color,
                features: formData.features,
                description: formData.description,
                is_active: formData.is_active,
                updated_at: new Date().toISOString(),
            })
            .eq("id", editingPlan.id);

        if (error) {
            toast.error("Failed to update plan");
            console.error(error);
        } else {
            toast.success("Plan updated successfully");
            await fetchPlans();
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
                <div className="text-center text-gray-500 py-10">Loading membership plans...</div>
            </NeonCard>
        );
    }

    return (
        <>
            <NeonCard className="p-5">
                <AdminSectionTitle
                    icon={<Crown className="w-4 h-4" />}
                    title="Fan Membership Plans"
                    sub="Configure membership tiers for fans (Bronze, Silver, Gold)"
                />

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative p-5 rounded-2xl border transition-all ${plan.is_active
                                    ? "bg-gradient-to-br from-black/60 to-black/40 border-white/10"
                                    : "bg-black/20 border-white/5 opacity-60"
                                }`}
                        >
                            {/* Badge Color Indicator */}
                            <div
                                className="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-white/20"
                                style={{ backgroundColor: plan.badge_color }}
                                title={`Badge color: ${plan.badge_color}`}
                            />

                            {/* Plan Name */}
                            <div
                                className="text-lg font-bold mb-1"
                                style={{ color: plan.badge_color }}
                            >
                                {plan.display_name}
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline gap-1 mb-3">
                                {plan.price === 0 ? (
                                    <span className="text-2xl font-bold text-green-400">Free</span>
                                ) : (
                                    <>
                                        <span className="text-2xl font-bold text-white">
                                            ${plan.price}
                                        </span>
                                        <span className="text-xs text-gray-400">/month</span>
                                    </>
                                )}
                            </div>

                            {/* Features */}
                            <div className="space-y-1 mb-4">
                                {plan.features.slice(0, 4).map((feature, i) => (
                                    <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-pink-500" />
                                        {feature}
                                    </div>
                                ))}
                                {plan.features.length > 4 && (
                                    <div className="text-xs text-gray-500">
                                        +{plan.features.length - 4} more features
                                    </div>
                                )}
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-2 mb-4">
                                <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full ${plan.is_active
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-red-500/20 text-red-400"
                                        }`}
                                >
                                    {plan.is_active ? "Active" : "Inactive"}
                                </span>
                            </div>

                            {/* Edit Button */}
                            <NeonButton
                                variant="ghost"
                                className="w-full flex items-center justify-center gap-2"
                                onClick={() => openEditModal(plan)}
                            >
                                <Edit2 className="w-3 h-3" />
                                Edit Plan
                            </NeonButton>
                        </div>
                    ))}
                </div>
            </NeonCard>

            {/* Edit Modal */}
            {showEditModal && editingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-pink-500/20 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-pink-500" />
                                Edit {editingPlan.display_name}
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
                                    Price (USD) - Set to 0 for free tier
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

                            {/* Badge Color */}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Badge Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer"
                                        value={formData.badge_color || "#cd7f32"}
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
                                        placeholder="#cd7f32"
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
                                        className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Feature
                                    </button>
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-400">Plan Active</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.is_active}
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
