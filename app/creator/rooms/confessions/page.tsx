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
    ChevronDown
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

    // 1. Init Room + Fetch Data
    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Find room
            const { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('host_id', user.id)
                .limit(1)
                .single();

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
                    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2">
                        <div className="text-[10px] text-rose-200">Pricing</div>
                        <div className="text-sm text-rose-100 font-semibold">Fixed by Tier</div>
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
                                        <div className="text-sm text-gray-200 truncate">
                                            {fileName ? `Selected: ${fileName}` : "No file selected (preview)"}
                                        </div>
                                        <button
                                            className="rounded-xl border border-rose-400/25 bg-black/40 px-3 py-2 text-sm hover:bg-white/5 inline-flex items-center gap-2"
                                            onClick={() => setFileName(type === "Voice" ? "new_confession.m4a" : "new_confession.mp4")}
                                        >
                                            <LinkIcon className="w-4 h-4" /> Add File
                                        </button>
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
                            <div className="text-rose-200 text-sm">Confessions Library</div>
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
                        </div>

                        <div className="space-y-3">
                            {visible.length === 0 ? (
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
                            )}
                        </div>
                    </NeonCard>
                </div>
            </div>
        </ProtectRoute>
    );
}
