"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    Flame,
    RefreshCw,
    Search,
    X,
    Trash2,
    AlertTriangle,
    CheckSquare,
    Square,
    Eye,
    Lock,
    Image,
    FileText,
    Video,
    Mic,
    ChevronDown,
    Sparkles,
} from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";

// ─── Types ───────────────────────────────────────────────────────────────
interface Creator {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
}

interface Confession {
    id: string;
    room_id: string;
    session_id: string | null;
    title: string;
    teaser: string | null;
    content: string | null;
    media_url: string | null;
    type: string; // Image, Text, Video, Audio
    tier: string; // Soft, Spicy, Dirty, Diamonds, Forbidden
    price: number;
    status: string; // Published, Draft
    created_at: string;
    updated_at: string | null;
    creator: Creator | null;
    unlock_count: number;
}

interface Stats {
    total: number;
    byTier: Record<string, number>;
    totalUnlocks: number;
}

// ─── Constants ───────────────────────────────────────────────────────────
const TIERS = ["All", "Soft", "Spicy", "Dirty", "Diamonds", "Forbidden"] as const;
const STATUSES = ["All", "Published", "Draft"] as const;

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    Soft: { bg: "bg-pink-500/15", text: "text-pink-300", border: "border-pink-500/25" },
    Spicy: { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/25" },
    Dirty: { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/25" },
    Diamonds: { bg: "bg-cyan-500/15", text: "text-cyan-300", border: "border-cyan-500/25" },
    Forbidden: { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/25" },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
    Image: <Image className="w-3 h-3" />,
    Text: <FileText className="w-3 h-3" />,
    Video: <Video className="w-3 h-3" />,
    Audio: <Mic className="w-3 h-3" />,
};

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

// ─── Component ───────────────────────────────────────────────────────────
export default function ConfessionListsManager() {
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, byTier: {}, totalUnlocks: 0 });
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("All");
    const [filterTier, setFilterTier] = useState<string>("All");
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<"bulk" | string>("bulk"); // "bulk" or single confession id

    // ─── Fetch ───────────────────────────────────────────────────────────
    const fetchConfessions = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus !== "All") params.set("status", filterStatus);
            if (filterTier !== "All") params.set("tier", filterTier);
            const qs = params.toString();
            const res = await fetch(`/api/admin/confessions${qs ? `?${qs}` : ""}`);
            if (res.ok) {
                const data = await res.json();
                setConfessions(data.confessions || []);
                setStats(data.stats || { total: 0, byTier: {}, totalUnlocks: 0 });
            } else {
                console.error("Failed to fetch confessions");
            }
        } catch (err) {
            console.error("Error fetching confessions:", err);
        }
        setLoading(false);
    }, [filterStatus, filterTier]);

    useEffect(() => {
        fetchConfessions();
    }, [fetchConfessions]);

    // ─── Client-side search filter ───────────────────────────────────────
    const displayData = useMemo(() => {
        if (!search) return confessions;
        const q = search.toLowerCase();
        return confessions.filter(
            (c) =>
                c.title.toLowerCase().includes(q) ||
                c.teaser?.toLowerCase().includes(q) ||
                c.creator?.full_name?.toLowerCase().includes(q) ||
                c.creator?.username?.toLowerCase().includes(q)
        );
    }, [confessions, search]);

    // ─── Selection ───────────────────────────────────────────────────────
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === displayData.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(displayData.map((c) => c.id)));
        }
    };

    // ─── Delete ──────────────────────────────────────────────────────────
    const handleDelete = async () => {
        setDeleting(true);
        try {
            const ids = deleteTarget === "bulk" ? [...selectedIds] : [deleteTarget];
            const res = await fetch("/api/admin/confessions/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });
            if (res.ok) {
                setSelectedIds(new Set());
                setShowDeleteModal(false);
                fetchConfessions();
            } else {
                const data = await res.json();
                alert("Delete failed: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("Delete failed");
        }
        setDeleting(false);
    };

    const openBulkDelete = () => {
        setDeleteTarget("bulk");
        setShowDeleteModal(true);
    };

    const openSingleDelete = (id: string) => {
        setDeleteTarget(id);
        setShowDeleteModal(true);
    };

    const deleteCount = deleteTarget === "bulk" ? selectedIds.size : 1;

    // ─── Tier badge helper ───────────────────────────────────────────────
    const TierBadge = ({ tier }: { tier: string }) => {
        const colors = TIER_COLORS[tier] || { bg: "bg-white/5", text: "text-white/50", border: "border-white/10" };
        return (
            <span
                className={cx(
                    "inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[9px] font-bold uppercase tracking-wider border",
                    colors.bg, colors.text, colors.border
                )}
            >
                {tier === "Diamonds" && "💎 "}
                {tier}
            </span>
        );
    };

    // ─── Render ──────────────────────────────────────────────────────────
    return (
        <NeonCard className="p-5">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <AdminSectionTitle
                icon={<Flame className="w-5 h-5 text-orange-400" />}
                title="Confession Lists"
                sub="Manage all confessions across all creators. Search, filter, and bulk-delete."
                right={
                    <NeonButton variant="blue" onClick={fetchConfessions} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        {" "}Refresh
                    </NeonButton>
                }
            />

            {/* ── Stats Bar ──────────────────────────────────────────────── */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Total" value={stats.total} tone="cyan" />
                {["Soft", "Spicy", "Dirty", "Diamonds", "Forbidden"].map((t) => (
                    <StatCard key={t} label={t === "Diamonds" ? "💎 Diamonds" : t} value={stats.byTier[t] || 0} tone={
                        t === "Soft" ? "pink" : t === "Spicy" ? "amber" : t === "Dirty" ? "red" : t === "Diamonds" ? "cyan" : "pink"
                    } />
                ))}
            </div>

            {/* ── Filters Toolbar ────────────────────────────────────────── */}
            <div className="mt-5 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-black/40 border border-white/5 p-3 rounded-2xl">
                {/* Status tabs */}
                <div className="flex bg-black/50 p-1 rounded-xl border border-white/10 shrink-0">
                    {STATUSES.map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={cx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition",
                                filterStatus === s
                                    ? "bg-white/10 text-white"
                                    : "text-white/40 hover:text-white/70"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* Tier pills */}
                <div className="flex flex-wrap gap-1.5 shrink-0">
                    {TIERS.map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilterTier(t)}
                            className={cx(
                                "px-2.5 py-1 text-[10px] font-bold rounded-full border transition",
                                filterTier === t
                                    ? "bg-white/10 text-white border-white/20"
                                    : "text-white/40 border-white/10 hover:text-white/60 hover:border-white/15"
                            )}
                        >
                            {t === "Diamonds" ? "💎 Diamonds" : t}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full lg:w-64 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search title, creator..."
                        className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-3.5 h-3.5 text-white/40 hover:text-white" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Bulk Actions Bar ───────────────────────────────────────── */}
            {selectedIds.size > 0 && (
                <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-red-500/5 border border-red-500/20 rounded-2xl px-4 py-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 text-sm">
                        <CheckSquare className="w-4 h-4 text-red-400" />
                        <span className="text-red-200 font-bold">{selectedIds.size}</span>
                        <span className="text-red-300/70">selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
                        >
                            Deselect All
                        </button>
                        <button
                            onClick={openBulkDelete}
                            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 border border-red-500/40 text-xs font-bold text-white transition flex items-center gap-1.5"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}

            {/* ── Table (Desktop) ────────────────────────────────────────── */}
            <div className="mt-5 hidden lg:block">
                {loading && displayData.length === 0 ? (
                    <LoadingState />
                ) : displayData.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/30">
                        {/* Table Header */}
                        <div className="grid bg-black/60 border-b border-white/10" style={{ gridTemplateColumns: "40px 3fr 2fr 1fr 1fr 1fr 1.2fr 80px" }}>
                            <div className="px-3 py-2.5 flex items-center justify-center">
                                <button onClick={toggleSelectAll} className="text-white/40 hover:text-white transition">
                                    {selectedIds.size === displayData.length && displayData.length > 0 ? (
                                        <CheckSquare className="w-4 h-4 text-orange-400" />
                                    ) : (
                                        <Square className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            {["CONFESSION", "CREATOR", "PRICE", "UNLOCKS", "STATUS", "CREATED", ""].map((h) => (
                                <div key={h} className="px-3 py-2.5 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                                    {h}
                                </div>
                            ))}
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-white/[0.06]">
                            {displayData.map((c) => (
                                <div
                                    key={c.id}
                                    className={cx(
                                        "grid hover:bg-white/[0.03] transition group",
                                        selectedIds.has(c.id) && "bg-orange-500/[0.04]"
                                    )}
                                    style={{ gridTemplateColumns: "40px 3fr 2fr 1fr 1fr 1fr 1.2fr 80px" }}
                                >
                                    {/* Checkbox */}
                                    <div className="px-3 py-3 flex items-center justify-center">
                                        <button onClick={() => toggleSelect(c.id)} className="text-white/30 hover:text-white transition">
                                            {selectedIds.has(c.id) ? (
                                                <CheckSquare className="w-4 h-4 text-orange-400" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Confession Info */}
                                    <div className="px-3 py-3 flex flex-col gap-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <TierBadge tier={c.tier} />
                                            <span className="inline-flex items-center gap-1 text-[9px] text-white/30 border border-white/10 rounded-full px-1.5 py-[1px]">
                                                {TYPE_ICON[c.type] || <FileText className="w-3 h-3" />}
                                                {c.type}
                                            </span>
                                        </div>
                                        <span className="text-sm font-semibold text-white truncate">{c.title}</span>
                                        <span className="text-[11px] text-white/40 truncate">{c.teaser || "—"}</span>
                                    </div>

                                    {/* Creator */}
                                    <div className="px-3 py-3 flex items-center gap-2.5 min-w-0">
                                        {c.creator?.avatar_url ? (
                                            <img
                                                src={c.creator.avatar_url}
                                                alt=""
                                                className="w-7 h-7 rounded-full border border-white/15 object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-xs text-white/80 truncate">{c.creator?.full_name || "Unknown"}</div>
                                            <div className="text-[10px] text-white/30 truncate">@{c.creator?.username || "—"}</div>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="px-3 py-3 flex items-center">
                                        <span className="text-sm font-bold text-emerald-300">€{c.price}</span>
                                    </div>

                                    {/* Unlocks */}
                                    <div className="px-3 py-3 flex items-center gap-1.5">
                                        <Lock className="w-3 h-3 text-white/20" />
                                        <span className="text-sm text-white/70">{c.unlock_count}</span>
                                    </div>

                                    {/* Status */}
                                    <div className="px-3 py-3 flex items-center">
                                        <span
                                            className={cx(
                                                "inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[9px] font-bold border uppercase tracking-wider",
                                                c.status === "Published"
                                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                                    : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                            )}
                                        >
                                            {c.status === "Published" ? <Eye className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                            {c.status}
                                        </span>
                                    </div>

                                    {/* Created */}
                                    <div className="px-3 py-3 flex items-center text-[11px] text-white/40">
                                        {timeAgo(c.created_at)}
                                    </div>

                                    {/* Actions */}
                                    <div className="px-3 py-3 flex items-center justify-center">
                                        <button
                                            onClick={() => openSingleDelete(c.id)}
                                            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                                            title="Delete confession"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Cards (Mobile) ──────────────────────────────────────────── */}
            <div className="mt-5 lg:hidden">
                {loading && displayData.length === 0 ? (
                    <LoadingState />
                ) : displayData.length === 0 ? (
                    <EmptyState />
                ) : (
                    <>
                        {/* Mobile Select All */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-[11px] text-white/40">{displayData.length} confessions</span>
                            <button
                                onClick={toggleSelectAll}
                                className="text-[11px] text-orange-400 hover:text-orange-300 transition"
                            >
                                {selectedIds.size === displayData.length && displayData.length > 0 ? "Deselect All" : "Select All"}
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {displayData.map((c) => (
                                <div
                                    key={c.id}
                                    className={cx(
                                        "rounded-xl border bg-black/40 p-3.5 transition",
                                        selectedIds.has(c.id)
                                            ? "border-orange-500/30 bg-orange-500/[0.04]"
                                            : "border-white/10 hover:border-white/15"
                                    )}
                                >
                                    {/* Top row: checkbox + tier + type */}
                                    <div className="flex items-center gap-2.5">
                                        <button onClick={() => toggleSelect(c.id)} className="shrink-0">
                                            {selectedIds.has(c.id) ? (
                                                <CheckSquare className="w-4.5 h-4.5 text-orange-400" />
                                            ) : (
                                                <Square className="w-4.5 h-4.5 text-white/30" />
                                            )}
                                        </button>
                                        <TierBadge tier={c.tier} />
                                        <span className="inline-flex items-center gap-1 text-[9px] text-white/30 border border-white/10 rounded-full px-1.5 py-[1px]">
                                            {TYPE_ICON[c.type] || <FileText className="w-3 h-3" />}
                                            {c.type}
                                        </span>
                                        <span
                                            className={cx(
                                                "ml-auto inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[9px] font-bold border",
                                                c.status === "Published"
                                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                                    : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                            )}
                                        >
                                            {c.status}
                                        </span>
                                    </div>

                                    {/* Title & teaser */}
                                    <div className="mt-2.5 pl-7">
                                        <div className="text-sm font-semibold text-white">{c.title}</div>
                                        <div className="text-[11px] text-white/35 mt-0.5 line-clamp-1">{c.teaser || "—"}</div>
                                    </div>

                                    {/* Bottom row: creator + price + unlocks + delete */}
                                    <div className="mt-3 pl-7 flex items-center gap-3 flex-wrap">
                                        {/* Creator */}
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {c.creator?.avatar_url ? (
                                                <img src={c.creator.avatar_url} alt="" className="w-5 h-5 rounded-full border border-white/15 object-cover" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-white/10 border border-white/15" />
                                            )}
                                            <span className="text-[11px] text-white/60 truncate max-w-[100px]">
                                                {c.creator?.full_name || c.creator?.username || "Unknown"}
                                            </span>
                                        </div>

                                        <span className="text-xs font-bold text-emerald-300">€{c.price}</span>

                                        <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                                            <Lock className="w-3 h-3" /> {c.unlock_count}
                                        </span>

                                        <span className="text-[10px] text-white/25">{timeAgo(c.created_at)}</span>

                                        <button
                                            onClick={() => openSingleDelete(c.id)}
                                            className="ml-auto p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* ── Delete Confirmation Modal ───────────────────────────────── */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#0d0d0d] border border-red-500/25 rounded-2xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(239,68,68,0.15)]">
                        <div className="flex items-center gap-3 text-red-400 mb-4">
                            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-base">Delete {deleteCount} Confession{deleteCount !== 1 ? "s" : ""}?</div>
                                <div className="text-[11px] text-red-300/60 mt-0.5">This action cannot be undone</div>
                            </div>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3 mb-5">
                            <p className="text-xs text-red-200/70 leading-relaxed">
                                This will permanently remove {deleteCount === 1 ? "this confession" : `${deleteCount} confessions`} and
                                all associated unlock records. Fans who previously unlocked this content will lose access.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 border border-red-500/40 text-sm font-bold text-white transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete Forever
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </NeonCard>
    );
}

// ─── Sub-Components ──────────────────────────────────────────────────────

function StatCard({ label, value, tone }: { label: string; value: number; tone: "cyan" | "pink" | "amber" | "red" | "green" }) {
    const bg =
        tone === "pink" ? "border-pink-500/20 bg-pink-500/5"
        : tone === "amber" ? "border-amber-500/20 bg-amber-500/5"
        : tone === "red" ? "border-red-500/20 bg-red-500/5"
        : tone === "green" ? "border-emerald-500/20 bg-emerald-500/5"
        : "border-cyan-500/20 bg-cyan-500/5";

    const text =
        tone === "pink" ? "text-pink-300"
        : tone === "amber" ? "text-amber-300"
        : tone === "red" ? "text-red-300"
        : tone === "green" ? "text-emerald-300"
        : "text-cyan-300";

    return (
        <div className={cx("rounded-xl border p-3 text-center", bg)}>
            <div className={cx("text-xl font-bold", text)}>{value}</div>
            <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">{label}</div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 text-white/20 mx-auto animate-spin" />
            <div className="text-sm text-white/30 mt-3">Loading confessions...</div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="py-16 text-center">
            <Flame className="w-8 h-8 text-white/10 mx-auto" />
            <div className="text-sm text-white/30 mt-3">No confessions found</div>
            <div className="text-[11px] text-white/15 mt-1">Try adjusting your filters or search</div>
        </div>
    );
}
