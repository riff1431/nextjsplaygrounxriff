"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    ArrowLeft,
    Sparkles,
    Link as LinkIcon,
    MessageCircle,
    Lock,
    Search,
    Users,
    Settings,
    CreditCard,
    LogOut,
    User,
    Bell,
    Video,
    Image as ImageIcon,
    Send,
    Heart,
    ChevronDown,
    Check
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectRoute } from "../../../context/AuthContext";
import { createClient } from "@/utils/supabase/client";

// ---- Helpers --------------------------------------------------------------
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                "shadow-[0_0_22px_rgba(236,72,153,0.14),0_0_52px_rgba(59,130,246,0.08)]",
                "hover:shadow-[0_0_34px_rgba(236,72,153,0.20),0_0_78px_rgba(59,130,246,0.12)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

export default function CreatorConfessionsStudio() {
    const router = useRouter();
    const supabase = createClient();

    const onBack = () => router.push("/home");
    const onFanView = () => router.push("/rooms/confessions");

    type ConfTier = "Soft" | "Spicy" | "Dirty" | "Dark" | "Forbidden";
    type ConfType = "Text" | "Voice" | "Video";
    type ConfStatus = "Draft" | "Published" | "Archived";

    const TIER_PRICE: Record<ConfTier, number> = {
        Soft: 5,
        Spicy: 10,
        Dirty: 20,
        Dark: 35,
        Forbidden: 60,
    };

    const tierTone: Record<ConfTier, string> = {
        Soft: "border-pink-500/25 text-pink-200",
        Spicy: "border-rose-400/30 text-rose-200",
        Dirty: "border-red-400/30 text-red-200",
        Dark: "border-violet-300/30 text-violet-200",
        Forbidden: "border-yellow-400/30 text-yellow-200",
    };

    type Item = {
        id: string;
        title: string;
        teaser: string;
        tier: ConfTier;
        type: ConfType;
        status: ConfStatus;
        createdAt: string;
        content: string;
        mediaUrl?: string;
    };

    const [items, setItems] = useState<Item[]>([]);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [filter, setFilter] = useState<ConfStatus>("Published");
    const [editingId, setEditingId] = useState<string | null>(null);

    const [type, setType] = useState<ConfType>("Text");
    const [tier, setTier] = useState<ConfTier>("Spicy");
    const [title, setTitle] = useState("");
    const [teaser, setTeaser] = useState("");
    const [fullText, setFullText] = useState("");
    const [fileName, setFileName] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // [New] Notification & Requests State
    const [activeTab, setActiveTab] = useState<'library' | 'requests'>('library');
    const [creatorRequests, setCreatorRequests] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);

    // [New] Fulfillment State
    const [fulfillingReq, setFulfillingReq] = useState<any>(null); // Request being fulfilled
    const [deliveryText, setDeliveryText] = useState("");
    const [deliveryFile, setDeliveryFile] = useState<string | null>(null);
    const [deliveryUploading, setDeliveryUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `confessions/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('public_assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('public_assets')
                .getPublicUrl(filePath);

            setFileName(publicUrl);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file');
        } finally {
            setUploading(false);
        }
    };

    // [New] Fetch Requests
    const fetchCreatorRequests = async (rid: string) => {
        try {
            const res = await fetch(`/api/v1/rooms/${rid}/requests`);
            const data = await res.json();
            if (data.requests) setCreatorRequests(data.requests);
        } catch (e) { console.error("Req error", e); }
    };

    // [New] Accept Request (Move to 'in_progress')
    const handleAcceptRequest = async (reqId: string) => {
        if (!roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/requests/${reqId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "accept" })
            });
            if (res.ok) {
                fetchCreatorRequests(roomId);
                // Switch to workspace if needed (omitted for now)
                alert("Request Accepted! You can now fulfill it.");
            }
        } catch (e) { alert("Error accepting"); }
    };

    // [New] Fetch Notifications
    const fetchNotifications = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (data) {
                setNotifications(data);
                setUnreadCount(data.filter((n: any) => !n.is_read).length);
            }
        } catch (e) {
            // If table doesn't exist (migration pending), this will fail silently
            console.log("Notifications fetch failed (migration missing?)");
        }
    };

    // [New] Fulfillment Handlers
    const handleDeliveryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setDeliveryUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `deliveries/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('public_assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('public_assets')
                .getPublicUrl(filePath);

            setDeliveryFile(publicUrl);
        } catch (error) {
            console.error('Error uploading delivery:', error);
            alert('Error uploading file');
        } finally {
            setDeliveryUploading(false);
        }
    };

    const handleSubmitFulfillment = async () => {
        if (!fulfillingReq || !roomId) return;
        if (!deliveryText && !deliveryFile) {
            alert("Please provide text or a file.");
            return;
        }

        try {
            // Content can be text or file URL. Usually "content" field or specific.
            // Requirement said "submit text file/video". 
            // We will store main content in `delivery_content` (text or url).
            // If both, we might concatenate? Or JSON?
            // Simple MVP: If file, use URL. Else text.
            const content = deliveryFile || deliveryText;

            const res = await fetch(`/api/v1/rooms/${roomId}/requests/${fulfillingReq.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "deliver",
                    deliveryContent: content
                })
            });

            if (res.ok) {
                alert("Request Fulfilled! Fan notified.");
                setFulfillingReq(null);
                setDeliveryText("");
                setDeliveryFile(null);
                fetchCreatorRequests(roomId);
            } else {
                const err = await res.json();
                alert("Error fulfilling request: " + (err.error || "Unknown"));
            }
        } catch (e) { console.error(e); alert("Error submitting"); }
    };

    // 1. Init Room + Fetch Data
    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Find room - Prefer default-room if available (to match fan view)
            let { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('host_id', user.id)
                .eq('slug', 'default-room')
                .maybeSingle();

            if (!room) {
                // Fallback to any room
                const { data: anyRoom } = await supabase
                    .from('rooms')
                    .select('id')
                    .eq('host_id', user.id)
                    .limit(1)
                    .single();
                room = anyRoom;
            }

            let targetRoomId = room?.id;
            if (!targetRoomId) {
                // Auto-create room for demo
                const { data: newRoom } = await supabase
                    .from('rooms')
                    .insert([{ host_id: user.id, title: "Confessions Room", status: "live" }])
                    .select()
                    .single();
                targetRoomId = newRoom?.id;
            }

            if (targetRoomId) {
                setRoomId(targetRoomId);
                fetchConfessions(targetRoomId);
                fetchCreatorRequests(targetRoomId); // [New]
                fetchNotifications(); // [New]

                // [New] Subscribe to Notifications (Realtime)
                const channel = supabase
                    .channel('creator-notifications')
                    .on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                        (payload) => {
                            setNotifications(prev => [payload.new, ...prev]);
                            setUnreadCount(c => c + 1);
                            // Also refresh requests if it's a request type
                            fetchCreatorRequests(targetRoomId);
                        }
                    )
                    .subscribe();

                return () => { supabase.removeChannel(channel); };
            }
            setLoading(false);
        }
        init();
    }, []);

    async function fetchConfessions(rid: string) {
        try {
            const res = await fetch(`/api/v1/rooms/${rid}/confessions`);
            const data = await res.json();
            if (data.confessions) {
                setItems(data.confessions.map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    teaser: c.teaser,
                    tier: c.tier,
                    type: c.type,
                    status: c.status,
                    createdAt: new Date(c.created_at).toLocaleDateString(),
                    content: c.content,
                    mediaUrl: c.media_url
                })));
            }
        } catch (e) {
            console.error(e);
        }
    }

    const visible = useMemo(() => items.filter((i) => i.status === filter), [items, filter]);

    const reset = () => {
        setEditingId(null);
        setType("Text");
        setTier("Spicy");
        setTitle("");
        setTeaser("");
        setFullText("");
        setFileName(null);
    };

    const saveDraft = async () => {
        if (!title.trim() || !roomId) return;

        const payload = {
            title: title.trim(),
            teaser: teaser.trim(),
            content: fullText.trim(),
            mediaUrl: fileName,
            type,
            tier,
            status: "Draft"
        };

        if (editingId) {
            // Update
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/${editingId}`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                fetchConfessions(roomId);
                reset();
            }
        } else {
            // Create
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                fetchConfessions(roomId);
                reset();
            }
        }
    };

    const publish = async () => {
        if (!title.trim() || !roomId) return;

        const payload = {
            title: title.trim(),
            teaser: teaser.trim(),
            content: fullText.trim(),
            mediaUrl: fileName,
            type,
            tier,
            status: "Published"
        };

        if (editingId) {
            // Update
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/${editingId}`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                fetchConfessions(roomId);
                reset();
            }
        } else {
            // Create
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                fetchConfessions(roomId);
                reset();
            }
        }
    };

    const load = (c: Item) => {
        setEditingId(c.id);
        setType(c.type);
        setTier(c.tier);
        setTitle(c.title);
        setTeaser(c.teaser);
        setFullText(c.content || "");
        setFileName(c.mediaUrl || null);
    };

    const duplicate = async (id: string) => {
        if (!roomId) return;
        const src = items.find((i) => i.id === id);
        if (!src) return;

        const payload = {
            title: `${src.title} (Copy)`,
            teaser: src.teaser,
            content: src.content,
            mediaUrl: src.mediaUrl,
            type: src.type,
            tier: src.tier,
            status: "Draft"
        };

        const res = await fetch(`/api/v1/rooms/${roomId}/confessions`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            fetchConfessions(roomId);
        }
    };

    const archive = async (id: string) => {
        if (!roomId) return;
        const res = await fetch(`/api/v1/rooms/${roomId}/confessions/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "Archived" })
        });
        const data = await res.json();
        if (data.success) {
            fetchConfessions(roomId);
        }
    };

    return (
        <ProtectRoute allowedRoles={["creator"]}>
            <div className="max-w-7xl mx-auto px-6 py-6 text-gray-200">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>

                        <button
                            onClick={onFanView}
                            className="rounded-xl border border-rose-400/30 bg-rose-600/20 px-3 py-2 text-sm text-rose-100 hover:bg-rose-600/30 inline-flex items-center gap-2"
                            title="Switch back to Fan Confessions room preview"
                        >
                            <Sparkles className="w-4 h-4" /> Fan View
                        </button>

                        <div>
                            <div className="text-rose-200 text-sm">Confessions Studio — Creator View</div>
                            <div className="text-[11px] text-gray-400">Create locked confessions for the fan Confession Wall</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* [New] Notification Bell */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                                className="relative p-2 rounded-xl hover:bg-white/10 transition"
                            >
                                <Bell className={cx("w-5 h-5", unreadCount > 0 ? "text-rose-400" : "text-gray-400")} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-black animate-pulse" />
                                )}
                            </button>

                            {showNotifDropdown && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-3 border-b border-white/5 flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-300">Notifications</span>
                                        {unreadCount > 0 && <span className="text-[10px] text-rose-400">{unreadCount} new</span>}
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-gray-500">No notifications</div>
                                        ) : (
                                            notifications.map((n, i) => (
                                                <div
                                                    key={i}
                                                    className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition"
                                                    onClick={() => {
                                                        setActiveTab('requests');
                                                        setShowNotifDropdown(false);
                                                    }}
                                                >
                                                    <div className="text-xs text-gray-200">{n.message}</div>
                                                    <div className="text-[10px] text-gray-500 mt-1">{new Date(n.created_at).toLocaleTimeString()}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2">
                            <div className="text-[10px] text-rose-200">Pricing</div>
                            <div className="text-sm text-rose-100 font-semibold">Fixed by Tier</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <NeonCard className="lg:col-span-5 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-rose-200 text-sm">{editingId ? "Edit Confession" : "New Confession"}</div>
                            <span className={cx("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", tierTone[tier])}>
                                {tier} • ${TIER_PRICE[tier]}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <div className="text-[11px] text-gray-400 mb-2">Type</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["Text", "Voice", "Video"] as ConfType[]).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setType(t)}
                                            className={cx(
                                                "rounded-xl border py-2 text-sm",
                                                type === t ? "border-rose-400/40 bg-rose-600/20" : "border-white/10 bg-black/20 hover:bg-white/5"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <div className="text-[11px] text-gray-400 mb-2">Tier</div>
                                <div className="grid grid-cols-5 gap-2">
                                    {(["Soft", "Spicy", "Dirty", "Dark", "Forbidden"] as ConfTier[]).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTier(t)}
                                            className={cx(
                                                "rounded-xl border py-2 text-xs",
                                                tier === t
                                                    ? cx("bg-black/40", tierTone[t])
                                                    : "border-white/10 bg-black/20 hover:bg-white/5 text-gray-200"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-2 text-[10px] text-gray-400">Price is enforced server-side.</div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <div className="text-[11px] text-gray-400 mb-2">Title</div>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full rounded-xl border border-rose-400/20 bg-black/40 px-3 py-2 text-sm outline-none text-white placeholder-gray-500"
                                    placeholder="Confession title…"
                                />
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <div className="text-[11px] text-gray-400 mb-2">Teaser / Preview (locked)</div>
                                <input
                                    value={teaser}
                                    onChange={(e) => setTeaser(e.target.value)}
                                    className="w-full rounded-xl border border-rose-400/20 bg-black/40 px-3 py-2 text-sm outline-none text-white placeholder-gray-500"
                                    placeholder="What fans see blurred before unlocking…"
                                />
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <div className="text-[11px] text-gray-400 mb-2">Full content</div>
                                {type === "Text" ? (
                                    <textarea
                                        value={fullText}
                                        onChange={(e) => setFullText(e.target.value)}
                                        className="w-full min-h-[120px] rounded-xl border border-rose-400/20 bg-black/40 px-3 py-2 text-sm outline-none text-white placeholder-gray-500"
                                        placeholder="Full confession text (unlocked)…"
                                    />
                                ) : (
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm text-gray-200 truncate flex-1">
                                            {fileName ? (
                                                <span className="text-green-400 flex items-center gap-2">
                                                    <Check className="w-3 h-3" /> {fileName.split('/').pop()}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">No file selected</span>
                                            )}
                                        </div>
                                        <label className="cursor-pointer rounded-xl border border-rose-400/25 bg-black/40 px-3 py-2 text-sm hover:bg-white/5 inline-flex items-center gap-2 relative">
                                            {uploading ? (
                                                <span className="animate-pulse">Uploading...</span>
                                            ) : (
                                                <>
                                                    <LinkIcon className="w-4 h-4" />
                                                    {fileName ? "Change File" : "Upload File"}
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept={type === "Voice" ? "audio/*" : "video/*"}
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                        </label>
                                    </div>
                                )}
                                {editingId && (
                                    <div className="mt-2 text-[10px] text-gray-400">
                                        Published items should only edit title & teaser (content stays unlocked-safe).
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    className="flex-1 rounded-xl border border-rose-400/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                    onClick={saveDraft}
                                    disabled={!roomId}
                                >
                                    Save Draft
                                </button>
                                <button
                                    className="flex-1 rounded-xl border border-rose-400/30 bg-rose-600 py-2 text-sm hover:bg-rose-700"
                                    onClick={publish}
                                    disabled={!roomId}
                                >
                                    Publish
                                </button>
                                <button
                                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm hover:bg-white/5"
                                    onClick={reset}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </NeonCard>

                    <NeonCard className="lg:col-span-7 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActiveTab('library')}
                                    className={cx("text-sm font-semibold transition", activeTab === 'library' ? "text-rose-200" : "text-gray-500 hover:text-gray-300")}
                                >
                                    Confessions Library
                                </button>
                                <button
                                    onClick={() => setActiveTab('requests')}
                                    className={cx("text-sm font-semibold transition relative", activeTab === 'requests' ? "text-rose-200" : "text-gray-500 hover:text-gray-300")}
                                >
                                    Incoming Requests
                                    {creatorRequests.filter(r => r.status === 'pending_approval').length > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-rose-600 text-[10px] rounded-full text-white">
                                            {creatorRequests.filter(r => r.status === 'pending_approval').length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {activeTab === 'library' && (
                                <div className="flex items-center gap-2">
                                    {(["Draft", "Published", "Archived"] as ConfStatus[]).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setFilter(s)}
                                            className={cx(
                                                "rounded-xl border px-3 py-2 text-sm",
                                                filter === s ? "border-rose-400/35 bg-rose-600/15" : "border-white/10 bg-black/20 hover:bg-white/5"
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {activeTab === 'library' ? (
                                visible.length === 0 ? (
                                    <div className="text-sm text-gray-400">No items in this filter.</div>
                                ) : (
                                    visible.map((c) => (
                                        <div key={c.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-sm text-gray-100 flex items-center gap-2">
                                                        <span className="font-semibold">{c.title}</span>
                                                        <span
                                                            className={cx("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", tierTone[c.tier])}
                                                        >
                                                            {c.tier} • ${TIER_PRICE[c.tier]}
                                                        </span>
                                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                                                            {c.type}
                                                        </span>
                                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-300 bg-black/40">
                                                            {c.status}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-sm text-gray-300">{c.teaser}</div>
                                                    <div className="mt-1 text-[10px] text-gray-500">Created: {c.createdAt}</div>
                                                </div>

                                                <div className="flex flex-col gap-2 w-40">
                                                    <button
                                                        className="rounded-xl border border-rose-400/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                                        onClick={() => load(c)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="rounded-xl border border-rose-400/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                                        onClick={() => duplicate(c.id)}
                                                    >
                                                        Duplicate
                                                    </button>
                                                    {c.status !== 'Archived' && (
                                                        <button
                                                            className="rounded-xl border border-white/10 bg-black/30 py-2 text-sm hover:bg-white/5"
                                                            onClick={() => archive(c.id)}
                                                        >
                                                            Archive
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                // [New] Requests List
                                creatorRequests.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500 text-sm">No incoming requests.</div>
                                ) : (
                                    creatorRequests.map(req => (
                                        <div key={req.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-rose-200">{req.topic}</span>
                                                        <span className="text-xs px-2 py-0.5 rounded border border-white/10 text-gray-300">{req.type}</span>
                                                        <span className="text-xs font-bold text-green-400">${req.amount}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        From Fan (ID: ...{req.fan_id.slice(-4)}) • {new Date(req.created_at).toLocaleDateString()}
                                                    </div>

                                                    {/* Status Badge */}
                                                    <div className="mt-2 text-[10px] uppercase tracking-wider">
                                                        <span className={cx(
                                                            "px-2 py-1 rounded border",
                                                            req.status === 'pending_approval' ? "border-yellow-500/30 text-yellow-500" :
                                                                req.status === 'in_progress' ? "border-blue-500/30 text-blue-500" :
                                                                    "border-gray-500/30 text-gray-500"
                                                        )}>
                                                            {req.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 w-32">
                                                    {req.status === 'pending_approval' && (
                                                        <button
                                                            onClick={() => handleAcceptRequest(req.id)}
                                                            className="w-full py-2 bg-rose-600 hover:bg-rose-700 rounded-lg text-xs font-bold text-white transition"
                                                        >
                                                            Accept & Start
                                                        </button>
                                                    )}
                                                    {req.status === 'in_progress' && (
                                                        <button
                                                            onClick={() => setFulfillingReq(req)}
                                                            className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-bold text-white transition"
                                                        >
                                                            Fulfill
                                                        </button>
                                                    )}
                                                    {req.status === 'delivered' && (
                                                        <button className="w-full py-2 bg-gray-700/50 text-gray-400 rounded-lg text-xs font-bold cursor-default">
                                                            Delivered
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </NeonCard>
                </div>

                {/* [New] Fulfillment Modal */}
                {fulfillingReq && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <NeonCard className="w-full max-w-md p-6 bg-gray-900 border-rose-500/30">
                            <h3 className="text-lg font-bold text-rose-200 mb-1">Fulfill Request</h3>
                            <p className="text-xs text-gray-400 mb-4">{fulfillingReq.topic} (${fulfillingReq.amount})</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Upload Content (Video/Audio)</label>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-xs text-gray-300 truncate flex-1">
                                            {deliveryFile ? (
                                                <span className="text-green-400 flex items-center gap-2">
                                                    <Check className="w-3 h-3" /> Ready to send
                                                </span>
                                            ) : "No file selected"}
                                        </div>
                                        <label className="cursor-pointer rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs hover:bg-white/5 inline-flex items-center gap-2">
                                            {deliveryUploading ? "Uploading..." : (
                                                <>
                                                    <LinkIcon className="w-3 h-3" /> Select File
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={handleDeliveryFileUpload}
                                                disabled={deliveryUploading}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Message / Note</label>
                                    <textarea
                                        value={deliveryText}
                                        onChange={(e) => setDeliveryText(e.target.value)}
                                        className="w-full h-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none text-white placeholder-gray-600"
                                        placeholder="Add a message or paste text content here..."
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleSubmitFulfillment}
                                        disabled={deliveryUploading}
                                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                                    >
                                        Submit Delivery
                                    </button>
                                    <button
                                        onClick={() => setFulfillingReq(null)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-gray-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </NeonCard>
                    </div>
                )}
            </div>
        </ProtectRoute>
    );
}
