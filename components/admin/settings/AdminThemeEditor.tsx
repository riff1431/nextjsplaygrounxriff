"use client";

import React, { useState } from "react";
import { Palette, Upload, Globe, Save } from "lucide-react";
import { useTheme } from "../../../app/context/ThemeContext";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { uploadToLocalServer } from "@/utils/uploadHelper";
import { toast } from "sonner"; // Assuming sonner is set up, fallback to alert if not

export default function AdminThemeEditor() {
    const { theme, updateTheme } = useTheme();
    const [formData, setFormData] = useState({ ...theme });
    const [saving, setSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateTheme(formData);
            toast.success("Theme settings updated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save theme settings");
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: "logoUrl" | "faviconUrl") => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Uploading image...");

        try {
            const publicUrl = await uploadToLocalServer(file);

            setFormData(prev => ({ ...prev, [key]: publicUrl }));
            toast.success("Image uploaded", { id: toastId });
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Failed to upload image", { id: toastId });
        }
    };

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Palette className="w-4 h-4" />}
                title="Theme & Branding"
                sub="Customize the look and feel of your platform."
                right={
                    <NeonButton variant="blue" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                    </NeonButton>
                }
            />

            <div className="mt-6 space-y-6 max-w-2xl">
                {/* Site Name */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        Site Name
                    </label>
                    <input
                        type="text"
                        name="siteName"
                        value={formData.siteName || ""}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none transition"
                        placeholder="e.g. MyPlatform"
                    />
                </div>

                {/* Logo Upload */}
                <div className="space-y-4 border-t border-white/5 pt-4">
                    <label className="text-sm font-medium text-gray-300 block">Brand Logo</label>
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-2xl border border-white/10 bg-black/40 flex items-center justify-center overflow-hidden relative group">
                            {formData.logoUrl ? (
                                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <span className="text-xs text-gray-600">No Logo</span>
                            )}
                        </div>
                        <div>
                            <NeonButton variant="ghost" className="relative overflow-hidden">
                                <Upload className="w-4 h-4 mr-2" /> Upload New Logo
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => handleImageUpload(e, "logoUrl")}
                                />
                            </NeonButton>
                            <p className="text-[11px] text-gray-500 mt-2">Recommended: 200x200px PNG or SVG</p>
                        </div>
                    </div>
                </div>

                {/* Favicon Upload */}
                <div className="space-y-4 border-t border-white/5 pt-4">
                    <label className="text-sm font-medium text-gray-300 block">Favicon</label>
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center overflow-hidden">
                            {formData.faviconUrl ? (
                                <img src={formData.faviconUrl} alt="Favicon" className="w-full h-full object-contain p-2" />
                            ) : (
                                <span className="text-xs text-gray-600">None</span>
                            )}
                        </div>
                        <div>
                            <NeonButton variant="ghost" className="relative overflow-hidden">
                                <Upload className="w-4 h-4 mr-2" /> Upload Favicon
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => handleImageUpload(e, "faviconUrl")}
                                />
                            </NeonButton>
                            <p className="text-[11px] text-gray-500 mt-2">Recommended: 32x32px PNG</p>
                        </div>
                    </div>
                </div>
            </div>
        </NeonCard>
    );
}
