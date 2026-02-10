"use client";

import React, { useEffect, useState, useRef } from "react";
import { User, Camera, Save, ArrowLeft, Mail, AtSign, FileText, Link as LinkIcon, Edit, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadToLocalServer } from "@/utils/uploadHelper";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                "shadow-[0_0_24px_rgba(236,72,153,0.14),0_0_56px_rgba(59,130,246,0.08)]",
                className
            )}
        >
            {children}
        </div>
    );
}

function NeonButton({
    children,
    className = "",
    variant = "pink",
    onClick,
    disabled
}: {
    children: React.ReactNode;
    className?: string;
    variant?: "pink" | "blue" | "ghost";
    onClick?: () => void;
    disabled?: boolean;
}) {
    const base = "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const styles =
        variant === "pink"
            ? "bg-pink-600 hover:bg-pink-700 text-white border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.4)]"
            : variant === "blue"
                ? "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "bg-white/5 hover:bg-white/10 text-pink-200 border border-pink-500/20";

    return <button onClick={onClick} disabled={disabled} className={cx(base, styles, className)}>{children}</button>;
}

function NeonInput({ label, icon: Icon, placeholder, value, onChange, type = "text", disabled }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs text-pink-200 font-medium ml-1">{label}</label>
            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-400 transition">
                    <Icon className="w-4 h-4" />
                </div>
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition disabled:opacity-50"
                />
            </div>
        </div>
    )
}

export default function EditProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        full_name: "",
        username: "",
        bio: "",
        website: "",
        avatar_url: "",
        cover_url: "",
        location: ""
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/auth");
                    return;
                }
                setUser(user);

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                if (profile) {
                    setFormData({
                        full_name: profile.full_name || "",
                        username: profile.username || "",
                        bio: profile.bio || "",
                        website: profile.website || "",
                        avatar_url: profile.avatar_url || "",
                        cover_url: profile.cover_url || "",
                        location: profile.location || ""
                    });
                } else {
                    // Fallback to metadata if no profile record yet
                    setFormData(prev => ({
                        ...prev,
                        full_name: user.user_metadata?.full_name || "",
                        username: user.user_metadata?.username || "",
                    }));
                }
            } catch (error) {
                console.error("Error loading profile:", error);
                toast.error("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [router, supabase]);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                return;
            }
            const file = event.target.files[0];
            const publicUrl = await uploadToLocalServer(file);

            setFormData({ ...formData, avatar_url: publicUrl });
            toast.success("Avatar uploaded successfully!");
        } catch (error: any) {
            console.error("Error uploading avatar:", error);
            toast.error("Error uploading avatar: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                return;
            }
            const file = event.target.files[0];
            const publicUrl = await uploadToLocalServer(file);

            setFormData(prev => ({ ...prev, cover_url: publicUrl }));
            toast.success("Cover uploaded successfully!");
        } catch (error: any) {
            console.error("Error uploading cover:", error);
            toast.error("Error uploading cover: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const updates = {
                id: user.id,
                ...formData,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) throw error;
            toast.success("Profile updated!");
            router.refresh();
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to save changes: " + ((error as any).message || "Unknown error"));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-pink-500">Loading settings...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
            <div className="w-full max-w-2xl">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white/10 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-blue-400">
                        Edit Profile
                    </h1>
                </div>

                <NeonCard className="p-6 space-y-8">
                    {/* Cover Image Section */}
                    <div className="flex flex-col gap-4">
                        <label className="text-sm font-medium text-pink-200 ml-1">Cover Image</label>
                        <div className="relative w-full h-32 md:h-40 rounded-xl overflow-hidden border border-white/10 group bg-zinc-900">
                            {formData.cover_url ? (
                                <img src={formData.cover_url} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-black flex items-center justify-center text-zinc-500 text-sm">
                                    No Cover Image
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    onClick={() => document.getElementById('cover-upload')?.click()}
                                    disabled={uploading}
                                    className="bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/20 flex items-center gap-2 transition-transform hover:scale-105"
                                >
                                    <Camera className="w-4 h-4" /> Change Cover
                                </button>
                            </div>
                        </div>
                        <input
                            id="cover-upload"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                                // Reuse the avatar upload logic but point to a different bucket or path if needed
                                // For simplicity, reusing the same function but identifying field would be better
                                // Or creating a dedicated handler. Let's create a dedicated handler inline or separate.
                                // Since I can't easily add a new function without context, I will create a new handler in a separate edit or modify handleAvatarUpload to be generic. 
                                // Actually, I'll add handleCoverUpload below.
                                handleCoverUpload(e);
                            }}
                        />
                        <div className="text-xs text-gray-500 text-center">Recommended: 1500x500px • Max 5MB</div>
                    </div>

                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full border-2 border-pink-500/30 p-1">
                                <Avatar className="w-full h-full">
                                    <AvatarImage src={formData.avatar_url} />
                                    <AvatarFallback className="bg-zinc-900 text-2xl font-bold">
                                        {(formData.username?.[0] || user?.email?.[0] || "?").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-500 border-2 border-black disabled:opacity-50"
                            >
                                <Camera className="w-3.5 h-3.5" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-medium">{uploading ? "Uploading..." : "Change Photo"}</div>
                            <div className="text-xs text-gray-500">Max 5MB • JPG, PNG</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <NeonInput
                                label="Display Name"
                                icon={User}
                                placeholder="e.g. Alex High"
                                value={formData.full_name}
                                onChange={(e: any) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                            <NeonInput
                                label="Username"
                                icon={AtSign}
                                placeholder="@username"
                                value={formData.username}
                                onChange={(e: any) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>

                        <NeonInput
                            label="Bio"
                            icon={FileText}
                            placeholder="Tell us about yourself..."
                            value={formData.bio}
                            onChange={(e: any) => setFormData({ ...formData, bio: e.target.value })}
                        />

                        <NeonInput
                            label="Website"
                            icon={LinkIcon}
                            placeholder="https://..."
                            value={formData.website}
                            onChange={(e: any) => setFormData({ ...formData, website: e.target.value })}
                        />

                        <NeonInput
                            label="Location"
                            icon={MapPin}
                            placeholder="e.g. Los Angeles, CA"
                            value={formData.location}
                            onChange={(e: any) => setFormData({ ...formData, location: e.target.value })}
                        />

                        <div className="opacity-50">
                            <NeonInput
                                label="Email (Managed by Auth)"
                                icon={Mail}
                                type="email"
                                value={user?.email || ""}
                                disabled={true}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <NeonButton variant="ghost" className="flex-1" onClick={() => router.back()}>Cancel</NeonButton>
                        <NeonButton variant="pink" className="flex-1" onClick={handleSave} disabled={saving || uploading}>
                            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
                        </NeonButton>
                    </div>
                </NeonCard>
            </div>
        </div>
    );
}
