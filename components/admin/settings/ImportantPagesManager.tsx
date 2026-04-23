"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    FileText,
    Save,
    RefreshCw,
    ShieldCheck,
    Scale,
    Cookie,
    Wallet,
    UserCheck,
    Coins,
    Sparkles,
    Eye,
    EyeOff,
    Check,
    AlertCircle,
    ChevronRight,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

/* ────── Config ────── */
interface PageConfig {
    key: string;
    label: string;
    icon: React.ReactNode;
    route: string;
    tone: string;
    description: string;
}

const PAGES: PageConfig[] = [
    {
        key: "page_privacy_policy",
        label: "Privacy Policy",
        icon: <ShieldCheck className="w-4 h-4" />,
        route: "/privacy",
        tone: "cyan",
        description: "GDPR-compliant privacy policy for the platform.",
    },
    {
        key: "page_terms_of_service",
        label: "Terms of Service",
        icon: <Scale className="w-4 h-4" />,
        route: "/terms",
        tone: "fuchsia",
        description: "Platform terms, eligibility, and monetization rules.",
    },
    {
        key: "page_refund_policy",
        label: "Refund & Chargeback Policy",
        icon: <Wallet className="w-4 h-4" />,
        route: "/refund-policy",
        tone: "red",
        description: "Refund rules, wallet system, and chargeback policies.",
    },
    {
        key: "page_cookies_policy",
        label: "Cookies Policy",
        icon: <Cookie className="w-4 h-4" />,
        route: "/cookies-policy",
        tone: "amber",
        description: "Cookie usage, types, and consent information.",
    },
    {
        key: "page_creator_guidelines",
        label: "Creator Guidelines",
        icon: <UserCheck className="w-4 h-4" />,
        route: "/creator-guidelines",
        tone: "pink",
        description: "Creator performance expectations and monetization structure.",
    },
    {
        key: "page_payout_terms",
        label: "Creator Payout Terms",
        icon: <Coins className="w-4 h-4" />,
        route: "/payout-terms",
        tone: "green",
        description: "Revenue splits, payout timing, and deductions.",
    },
    {
        key: "page_about",
        label: "About Us",
        icon: <Sparkles className="w-4 h-4" />,
        route: "/about",
        tone: "purple",
        description: "Platform vision, features, and company information.",
    },
];

/* ────── Tone Colour Map ────── */
const TONE: Record<string, { border: string; bg: string; text: string; glow: string }> = {
    cyan: { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-300", glow: "shadow-[0_0_12px_rgba(0,230,255,0.15)]" },
    fuchsia: { border: "border-fuchsia-500/30", bg: "bg-fuchsia-500/10", text: "text-fuchsia-300", glow: "shadow-[0_0_12px_rgba(255,0,200,0.15)]" },
    red: { border: "border-red-500/30", bg: "bg-red-500/10", text: "text-red-400", glow: "shadow-[0_0_12px_rgba(239,68,68,0.15)]" },
    amber: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-300", glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]" },
    pink: { border: "border-pink-500/30", bg: "bg-pink-500/10", text: "text-pink-300", glow: "shadow-[0_0_12px_rgba(236,72,153,0.15)]" },
    green: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-300", glow: "shadow-[0_0_12px_rgba(52,211,153,0.15)]" },
    purple: { border: "border-purple-500/30", bg: "bg-purple-500/10", text: "text-purple-300", glow: "shadow-[0_0_12px_rgba(168,85,247,0.15)]" },
};

/* ────── Component ────── */
export default function ImportantPagesManager() {
    const supabase = createClient();
    const [activePage, setActivePage] = useState<string | null>(null);
    const [contents, setContents] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

    /* ── Fetch all pages ── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const keys = PAGES.map((p) => p.key);
        const { data } = await supabase
            .from("admin_settings")
            .select("key, value")
            .in("key", keys);

        const map: Record<string, string> = {};
        if (data) {
            data.forEach((row) => {
                map[row.key] = row.value || "";
            });
        }
        setContents(map);
        setSavedKeys(new Set(data?.map((d) => d.key) || []));
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    /* ── Save single page ── */
    const handleSavePage = async (key: string) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("admin_settings")
                .upsert({ key, value: contents[key] || "" }, { onConflict: "key" });
            if (error) throw error;
            setSavedKeys((prev) => new Set([...prev, key]));
            toast.success(`Page saved successfully`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save page");
        } finally {
            setSaving(false);
        }
    };

    /* ── Save all pages ── */
    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const rows = PAGES.map((p) => ({
                key: p.key,
                value: contents[p.key] || "",
            }));
            const { error } = await supabase
                .from("admin_settings")
                .upsert(rows, { onConflict: "key" });
            if (error) throw error;
            setSavedKeys(new Set(PAGES.map((p) => p.key)));
            toast.success("All pages saved successfully");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save pages");
        } finally {
            setSaving(false);
        }
    };

    const currentConfig = PAGES.find((p) => p.key === activePage);
    const tone = currentConfig ? TONE[currentConfig.tone] || TONE.cyan : TONE.cyan;

    /* ── List View (no page selected) ── */
    if (!activePage) {
        return (
            <NeonCard className="p-5">
                <AdminSectionTitle
                    icon={<FileText className="w-5 h-5 text-cyan-400" />}
                    title="Important Pages"
                    sub="Edit and manage all public-facing legal and informational pages."
                    right={
                        <div className="flex gap-2">
                            <NeonButton variant="blue" onClick={fetchAll} disabled={loading}>
                                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                Refresh
                            </NeonButton>
                            <NeonButton variant="green" onClick={handleSaveAll} disabled={loading || saving}>
                                <Save className="w-4 h-4 mr-1" />
                                {saving ? "Saving..." : "Save All"}
                            </NeonButton>
                        </div>
                    }
                />

                {loading ? (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div key={i} className="h-36 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {PAGES.map((page) => {
                            const t = TONE[page.tone] || TONE.cyan;
                            const hasContent = !!(contents[page.key] && contents[page.key].trim());
                            const isSaved = savedKeys.has(page.key);
                            return (
                                <button
                                    key={page.key}
                                    onClick={() => setActivePage(page.key)}
                                    className={`group relative rounded-2xl border ${t.border} ${t.bg} p-5 text-left transition-all duration-300 hover:scale-[1.02] ${t.glow} hover:shadow-lg`}
                                >
                                    {/* Status badge */}
                                    <div className="absolute top-3 right-3">
                                        {hasContent && isSaved ? (
                                            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                                                <Check className="w-3 h-3" /> Published
                                            </span>
                                        ) : hasContent ? (
                                            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-400">
                                                <AlertCircle className="w-3 h-3" /> Draft
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">
                                                Empty
                                            </span>
                                        )}
                                    </div>

                                    <div className={`inline-flex items-center gap-2 ${t.text} text-sm font-semibold`}>
                                        {page.icon}
                                        {page.label}
                                    </div>
                                    <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                                        {page.description}
                                    </p>
                                    <div className="mt-3 text-[10px] text-gray-600 font-mono">
                                        {page.route}
                                    </div>
                                    <div className="mt-3 flex items-center gap-1 text-[10px] text-gray-500 group-hover:text-gray-300 transition">
                                        Edit Page <ChevronRight className="w-3 h-3" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </NeonCard>
        );
    }

    /* ── Editor View ── */
    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={currentConfig?.icon || <FileText className="w-5 h-5 text-cyan-400" />}
                title={currentConfig?.label || "Edit Page"}
                sub={currentConfig?.description || ""}
                right={
                    <div className="flex items-center gap-2 flex-wrap">
                        <NeonButton variant="ghost" onClick={() => setActivePage(null)}>
                            ← Back
                        </NeonButton>
                        <NeonButton
                            variant="ghost"
                            onClick={() => setShowPreview(!showPreview)}
                        >
                            {showPreview ? (
                                <><EyeOff className="w-4 h-4 mr-1" /> Editor</>
                            ) : (
                                <><Eye className="w-4 h-4 mr-1" /> Preview</>
                            )}
                        </NeonButton>
                        <NeonButton variant="blue" onClick={fetchAll} disabled={loading || saving}>
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </NeonButton>
                        <NeonButton
                            variant="green"
                            onClick={() => handleSavePage(activePage)}
                            disabled={loading || saving}
                        >
                            <Save className="w-4 h-4 mr-1" />
                            {saving ? "Saving..." : "Save Page"}
                        </NeonButton>
                    </div>
                }
            />

            {/* Page route badge */}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${tone.bg} ${tone.border} border ${tone.text}`}>
                    {currentConfig?.icon}
                    {currentConfig?.route}
                </span>
                {savedKeys.has(activePage) && contents[activePage]?.trim() && (
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Check className="w-3 h-3" /> Published
                    </span>
                )}
            </div>

            {/* Formatting help */}
            {!showPreview && (
                <div className="mt-4 p-3 rounded-xl bg-black/40 border border-white/5 text-[10px] text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span><code className="text-cyan-400/70">## Heading</code> — Section titles</span>
                    <span><code className="text-cyan-400/70">**Bold**</code> — Bold text</span>
                    <span><code className="text-cyan-400/70">*Italic*</code> — Italic text</span>
                    <span><code className="text-cyan-400/70">- Item</code> — Bullet list</span>
                    <span><code className="text-cyan-400/70">1. Item</code> — Numbered list</span>
                    <span><code className="text-cyan-400/70">[Link](url)</code> — Hyperlink</span>
                    <span><code className="text-cyan-400/70">---</code> — Divider</span>
                </div>
            )}

            {/* Content area */}
            <div className="mt-4">
                {loading ? (
                    <div className="w-full h-[500px] bg-black/40 border border-white/10 rounded-2xl animate-pulse" />
                ) : showPreview ? (
                    <div className={`w-full min-h-[500px] rounded-2xl border ${tone.border} bg-black/40 p-6 overflow-auto prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-gray-100 prose-a:text-pink-400 prose-strong:text-white prose-li:text-gray-400 prose-code:text-cyan-400`}>
                        {contents[activePage]?.trim() ? (
                            <ReactMarkdown>{contents[activePage]}</ReactMarkdown>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-600">
                                <FileText className="w-10 h-10 mb-3 opacity-40" />
                                <p className="text-sm">No content yet. Switch to editor to add content.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <textarea
                        value={contents[activePage] || ""}
                        onChange={(e) =>
                            setContents((prev) => ({ ...prev, [activePage]: e.target.value }))
                        }
                        placeholder={`Write the ${currentConfig?.label} content here using Markdown...\n\n## Section Title\n\nYour content goes here...`}
                        className={`w-full h-[500px] bg-black/40 border ${tone.border} rounded-2xl p-5 text-white placeholder-white/15 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition resize-y font-mono text-sm custom-scrollbar leading-relaxed`}
                        spellCheck={false}
                    />
                )}
            </div>

            {/* Character count */}
            <div className="mt-2 flex items-center justify-between text-[10px] text-gray-600">
                <span>
                    {(contents[activePage] || "").length.toLocaleString()} characters
                </span>
                <span>
                    Markdown supported • Content renders on {currentConfig?.route}
                </span>
            </div>
        </NeonCard>
    );
}
