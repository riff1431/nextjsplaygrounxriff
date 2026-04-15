"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    ChevronLeft,
    Save,
    RotateCcw,
    Loader2,
    Lock,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    DollarSign,
    Users,
    Zap,
    Shield,
    Star,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
interface SplitRow {
    id: number;
    split_key: string;
    label: string;
    creator_pct: number;
    platform_pct: number;
    entry_fee: number | null;
    cost_per_min: number | null;
    min_charge: number | null;
    is_editable: boolean;
    description: string | null;
    updated_at: string;
}

interface EditState {
    creator_pct: string;
    platform_pct: string;
    entry_fee: string;
    cost_per_min: string;
    min_charge: string;
    description: string;
}

// ─── Section metadata ─────────────────────────────────────────────────────────
const SECTION_META: Record<string, { icon: React.ReactNode; color: string; bgColor: string; section: string }> = {
    GLOBAL:           { icon: <Zap size={15} />,    color: "hsl(280,100%,75%)", bgColor: "rgba(159,90,253,0.12)", section: "Global" },
    PUBLIC_ENTRY:     { icon: <Users size={15} />,   color: "hsl(195,100%,65%)", bgColor: "rgba(0,200,255,0.1)",   section: "Public Room" },
    PUBLIC_PER_MIN:   { icon: <TrendingUp size={15} />, color: "hsl(195,100%,65%)", bgColor: "rgba(0,200,255,0.1)", section: "Public Room" },
    PRIVATE_ENTRY:    { icon: <Lock size={15} />,    color: "hsl(45,100%,65%)",  bgColor: "rgba(255,200,0,0.1)",   section: "Private Room" },
    PRIVATE_PER_MIN:  { icon: <TrendingUp size={15} />, color: "hsl(45,100%,65%)", bgColor: "rgba(255,200,0,0.1)", section: "Private Room" },
    SUGA4U_FAVORITES: { icon: <Star size={15} />,    color: "hsl(340,100%,70%)", bgColor: "rgba(255,60,130,0.1)",  section: "Exceptions" },
    COMPETITION_TIPS: { icon: <Shield size={15} />,  color: "hsl(150,80%,55%)",  bgColor: "rgba(72,187,120,0.1)",  section: "Exceptions" },
};

const SECTION_ORDER = ["Global", "Public Room", "Private Room", "Exceptions"];

// ─── Mini Donut Chart ─────────────────────────────────────────────────────────
function DonutChart({ creator, platform }: { creator: number; platform: number }) {
    const size = 52;
    const strokeW = 7;
    const r = (size - strokeW) / 2;
    const circ = 2 * Math.PI * r;
    const creatorDash = (creator / 100) * circ;

    return (
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
            {/* Platform arc (background) */}
            <circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={strokeW}
            />
            {/* Creator arc */}
            {creator > 0 && (
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke="hsl(280,100%,70%)"
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    strokeDasharray={`${creatorDash} ${circ - creatorDash}`}
                    strokeDashoffset={0}
                />
            )}
            {/* Platform arc overlay */}
            {platform > 0 && creator > 0 && (
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke="hsl(195,100%,60%)"
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    strokeDasharray={`${circ - creatorDash} ${creatorDash}`}
                    strokeDashoffset={-creatorDash}
                    opacity={0.5}
                />
            )}
        </svg>
    );
}

// ─── Split Row Card ───────────────────────────────────────────────────────────
function SplitCard({
    row,
    onSave,
    onReset,
    saving,
    resetting,
}: {
    row: SplitRow;
    onSave: (key: string, edit: EditState) => void;
    onReset: (key: string) => void;
    saving: boolean;
    resetting: boolean;
}) {
    const meta = SECTION_META[row.split_key] || {
        icon: <DollarSign size={15} />,
        color: "#fff",
        bgColor: "rgba(255,255,255,0.06)",
        section: "Other",
    };

    const [edit, setEdit] = useState<EditState>({
        creator_pct: String(row.creator_pct),
        platform_pct: String(row.platform_pct),
        entry_fee: row.entry_fee != null ? String(row.entry_fee) : "",
        cost_per_min: row.cost_per_min != null ? String(row.cost_per_min) : "",
        min_charge: row.min_charge != null ? String(row.min_charge) : "",
        description: row.description || "",
    });
    const [pctError, setPctError] = useState<string | null>(null);

    const isDirty =
        edit.creator_pct !== String(row.creator_pct) ||
        edit.platform_pct !== String(row.platform_pct) ||
        edit.entry_fee !== (row.entry_fee != null ? String(row.entry_fee) : "") ||
        edit.cost_per_min !== (row.cost_per_min != null ? String(row.cost_per_min) : "") ||
        edit.min_charge !== (row.min_charge != null ? String(row.min_charge) : "");

    // Auto-sync platform when creator changes
    const handleCreatorChange = (v: string) => {
        const c = parseFloat(v);
        if (!isNaN(c) && c >= 0 && c <= 100) {
            const p = +(100 - c).toFixed(2);
            setEdit(prev => ({ ...prev, creator_pct: v, platform_pct: String(p) }));
            setPctError(null);
        } else {
            setEdit(prev => ({ ...prev, creator_pct: v }));
        }
    };

    const handlePlatformChange = (v: string) => {
        const p = parseFloat(v);
        if (!isNaN(p) && p >= 0 && p <= 100) {
            const c = +(100 - p).toFixed(2);
            setEdit(prev => ({ ...prev, platform_pct: v, creator_pct: String(c) }));
            setPctError(null);
        } else {
            setEdit(prev => ({ ...prev, platform_pct: v }));
        }
    };

    const previewCreator = parseFloat(edit.creator_pct) || 0;
    const previewPlatform = parseFloat(edit.platform_pct) || 0;

    const inputStyle: React.CSSProperties = {
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
        padding: "8px 12px",
        color: "#fff",
        fontSize: "13px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        transition: "border-color 0.2s",
    };

    const labelStyle: React.CSSProperties = {
        color: "rgba(255,255,255,0.45)",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.05em",
        display: "block",
        marginBottom: "5px",
        textTransform: "uppercase",
    };

    return (
        <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            padding: "20px",
            transition: "border-color 0.2s",
        }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "18px" }}>
                <div style={{ width: 52, height: 52, position: "relative", flexShrink: 0 }}>
                    <DonutChart creator={previewCreator} platform={previewPlatform} />
                    <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 700, color: "hsl(280,100%,80%)",
                    }}>
                        {previewCreator}%
                    </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ color: meta.color }}>{meta.icon}</span>
                        <h3 style={{ color: "#fff", fontSize: "14px", fontWeight: 700, margin: 0 }}>{row.label}</h3>
                        {!row.is_editable && (
                            <span style={{
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                background: "rgba(255,200,0,0.1)", border: "1px solid rgba(255,200,0,0.2)",
                                borderRadius: "6px", padding: "2px 8px",
                                color: "hsl(45,100%,65%)", fontSize: "10px", fontWeight: 700,
                            }}>
                                <Lock size={10} /> Locked (PRD)
                            </span>
                        )}
                    </div>
                    <code style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px" }}>{row.split_key}</code>
                    {row.description && (
                        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", margin: "6px 0 0" }}>{row.description}</p>
                    )}
                </div>

                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", textAlign: "right", flexShrink: 0 }}>
                    Updated<br />{new Date(row.updated_at).toLocaleDateString()}
                </div>
            </div>

            {/* Fields */}
            {!row.is_editable ? (
                <div style={{
                    background: "rgba(255,200,0,0.04)",
                    border: "1px solid rgba(255,200,0,0.1)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "flex", alignItems: "center", gap: "8px",
                    color: "hsl(45,100%,70%)", fontSize: "12px",
                }}>
                    <Lock size={13} />
                    This split is locked per the PRD. Creator: <strong>{row.creator_pct}%</strong> / Platform: <strong>{row.platform_pct}%</strong>
                </div>
            ) : (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                        {/* Creator % */}
                        <div>
                            <label style={labelStyle}>Creator %</label>
                            <input
                                type="number"
                                min={0} max={100} step={0.01}
                                value={edit.creator_pct}
                                onChange={e => handleCreatorChange(e.target.value)}
                                style={{ ...inputStyle, borderColor: pctError ? "rgba(225,29,72,0.5)" : "rgba(255,255,255,0.1)" }}
                            />
                        </div>

                        {/* Platform % */}
                        <div>
                            <label style={labelStyle}>Platform %</label>
                            <input
                                type="number"
                                min={0} max={100} step={0.01}
                                value={edit.platform_pct}
                                onChange={e => handlePlatformChange(e.target.value)}
                                style={{ ...inputStyle, borderColor: pctError ? "rgba(225,29,72,0.5)" : "rgba(255,255,255,0.1)" }}
                            />
                        </div>

                        {/* Entry Fee */}
                        {(row.entry_fee != null || ["PUBLIC_ENTRY", "PRIVATE_ENTRY"].includes(row.split_key)) && (
                            <div>
                                <label style={labelStyle}>Entry Fee ($)</label>
                                <input
                                    type="number"
                                    min={0} step={0.01}
                                    value={edit.entry_fee}
                                    placeholder="e.g. 10.00"
                                    onChange={e => setEdit(prev => ({ ...prev, entry_fee: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                        )}

                        {/* Cost Per Min */}
                        {(row.cost_per_min != null || ["PUBLIC_PER_MIN", "PRIVATE_PER_MIN"].includes(row.split_key)) && (
                            <div>
                                <label style={labelStyle}>Rate ($/min)</label>
                                <input
                                    type="number"
                                    min={0} step={0.01}
                                    value={edit.cost_per_min}
                                    placeholder="e.g. 2.00"
                                    onChange={e => setEdit(prev => ({ ...prev, cost_per_min: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                        )}

                        {/* Minimum Charge */}
                        {(row.min_charge != null || ["PRIVATE_ENTRY", "PRIVATE_PER_MIN"].includes(row.split_key)) && (
                            <div>
                                <label style={labelStyle}>Min Charge ($)</label>
                                <input
                                    type="number"
                                    min={0} step={0.01}
                                    value={edit.min_charge}
                                    placeholder="e.g. 20.00"
                                    onChange={e => setEdit(prev => ({ ...prev, min_charge: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                        )}
                    </div>

                    {pctError && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fb7185", fontSize: "12px", marginTop: "8px" }}>
                            <AlertCircle size={13} /> {pctError}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "14px", alignItems: "center" }}>
                        <button
                            disabled={saving || !isDirty}
                            onClick={() => {
                                const c = parseFloat(edit.creator_pct);
                                const p = parseFloat(edit.platform_pct);
                                if (Math.round((c + p) * 100) !== 10000) {
                                    setPctError(`Creator + Platform must equal 100% (currently ${c + p}%)`);
                                    return;
                                }
                                setPctError(null);
                                onSave(row.split_key, edit);
                            }}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                background: isDirty ? "hsl(280,80%,55%)" : "rgba(255,255,255,0.08)",
                                border: "none", borderRadius: "8px", padding: "9px 18px",
                                color: isDirty ? "#fff" : "rgba(255,255,255,0.3)",
                                fontSize: "12px", fontWeight: 700,
                                cursor: saving || !isDirty ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
                            Save Changes
                        </button>

                        <button
                            disabled={resetting}
                            onClick={() => onReset(row.split_key)}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                background: "rgba(255,200,0,0.08)",
                                border: "1px solid rgba(255,200,0,0.15)",
                                borderRadius: "8px", padding: "8px 14px",
                                color: "hsl(45,100%,65%)", fontSize: "12px", fontWeight: 600,
                                cursor: resetting ? "wait" : "pointer",
                                transition: "all 0.2s",
                            }}
                            title="Reset to PRD defaults"
                        >
                            {resetting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <RotateCcw size={12} />}
                            Reset to Default
                        </button>

                        {isDirty && (
                            <span style={{ fontSize: "11px", color: "hsl(45,100%,65%)" }}>• Unsaved changes</span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSplitsPage() {
    const [splits, setSplits] = useState<SplitRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [resetting, setResetting] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const res = await fetch("/api/v1/admin/split-config");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load");
            setSplits(data.splits || []);
        } catch (e: any) {
            setLoadError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (splitKey: string, edit: EditState) => {
        setSaving(splitKey);
        try {
            const body: Record<string, any> = {
                split_key: splitKey,
                creator_pct: parseFloat(edit.creator_pct),
                platform_pct: parseFloat(edit.platform_pct),
            };
            if (edit.entry_fee !== "") body.entry_fee = parseFloat(edit.entry_fee);
            else body.entry_fee = null;
            if (edit.cost_per_min !== "") body.cost_per_min = parseFloat(edit.cost_per_min);
            else body.cost_per_min = null;
            if (edit.min_charge !== "") body.min_charge = parseFloat(edit.min_charge);
            else body.min_charge = null;

            const res = await fetch("/api/v1/admin/split-config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");

            setSplits(prev => prev.map(s => s.split_key === splitKey ? data.split : s));
            showToast(`✓ ${splitKey} saved successfully`);
        } catch (e: any) {
            showToast(e.message, false);
        } finally {
            setSaving(null);
        }
    };

    const handleReset = async (splitKey: string) => {
        if (!confirm(`Reset '${splitKey}' to PRD defaults?`)) return;
        setResetting(splitKey);
        try {
            const res = await fetch("/api/v1/admin/split-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ split_key: splitKey }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Reset failed");
            setSplits(prev => prev.map(s => s.split_key === splitKey ? data.split : s));
            showToast(`↺ ${splitKey} reset to PRD defaults`);
        } catch (e: any) {
            showToast(e.message, false);
        } finally {
            setResetting(null);
        }
    };

    // Group splits by section
    const grouped: Record<string, SplitRow[]> = {};
    for (const row of splits) {
        const section = SECTION_META[row.split_key]?.section || "Other";
        if (!grouped[section]) grouped[section] = [];
        grouped[section].push(row);
    }

    return (
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "30px 20px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <Link href="/admin/dashboard" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", display: "flex" }}>
                    <ChevronLeft size={20} />
                </Link>
                <DollarSign size={22} color="hsl(280,100%,70%)" />
                <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: 800, margin: 0 }}>Revenue Split Rules</h1>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", margin: "0 0 28px 34px" }}>
                Manage platform-wide revenue splits. Changes take effect within 60 seconds across all rooms.
            </p>

            {/* Info Banner */}
            <div style={{
                background: "rgba(159,90,253,0.08)",
                border: "1px solid rgba(159,90,253,0.2)",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "28px",
                display: "flex", alignItems: "flex-start", gap: "10px",
            }}>
                <AlertCircle size={15} color="hsl(280,100%,75%)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                    <strong style={{ color: "hsl(280,100%,80%)" }}>PRD Rules:</strong>{" "}
                    Creator invites are handled per-session (inviter sets the split, invitee must accept before entering).
                    Suga4U Favorites and Competition Tips are locked at 100% creator — these cannot be changed.
                    Fan ticket validity: 24 hours <em>or</em> 1 session (whichever is shorter); fans may exit and re-enter freely once paid.
                </div>
            </div>

            {/* Nav links */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
                <Link href="/admin/rooms" style={{ color: "hsl(195,100%,65%)", fontSize: "12px", textDecoration: "none", background: "rgba(0,200,255,0.08)", padding: "6px 14px", borderRadius: "8px" }}>
                    → Room Settings
                </Link>
                <Link href="/admin/finance/payouts" style={{ color: "hsl(150,80%,55%)", fontSize: "12px", textDecoration: "none", background: "rgba(72,187,120,0.08)", padding: "6px 14px", borderRadius: "8px" }}>
                    → Payouts
                </Link>
                <Link href="/admin/dashboard" style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", textDecoration: "none", background: "rgba(255,255,255,0.04)", padding: "6px 14px", borderRadius: "8px" }}>
                    ← Admin Home
                </Link>
            </div>

            {/* Content */}
            {isLoading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.4)" }}>
                    <Loader2 size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                    <div style={{ fontSize: "13px" }}>Loading split configuration…</div>
                </div>
            ) : loadError ? (
                <div style={{
                    background: "rgba(225,29,72,0.08)", border: "1px solid rgba(225,29,72,0.2)",
                    borderRadius: "12px", padding: "20px", display: "flex", gap: "10px", alignItems: "center",
                    color: "#fb7185",
                }}>
                    <AlertCircle size={16} />
                    <div>
                        <strong>Error loading splits</strong><br />
                        <span style={{ fontSize: "12px" }}>{loadError}</span>
                        <br />
                        <button onClick={load} style={{ marginTop: "8px", background: "none", border: "1px solid rgba(251,113,133,0.3)", borderRadius: "6px", padding: "4px 12px", color: "#fb7185", fontSize: "12px", cursor: "pointer" }}>
                            Retry
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                    {SECTION_ORDER.map(section => {
                        const rows = grouped[section];
                        if (!rows?.length) return null;
                        return (
                            <div key={section}>
                                {/* Section Header */}
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                                    <div style={{ height: "1px", width: "16px", background: "rgba(255,255,255,0.1)" }} />
                                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                        {section}
                                    </span>
                                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {rows.map(row => (
                                        <SplitCard
                                            key={row.split_key}
                                            row={row}
                                            onSave={handleSave}
                                            onReset={handleReset}
                                            saving={saving === row.split_key}
                                            resetting={resetting === row.split_key}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Creator Invite Splits — Informational */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                            <div style={{ height: "1px", width: "16px", background: "rgba(255,255,255,0.1)" }} />
                            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                Creator Invites
                            </span>
                            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                        </div>
                        <div style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px dashed rgba(255,255,255,0.1)",
                            borderRadius: "16px",
                            padding: "20px",
                            display: "flex", alignItems: "flex-start", gap: "14px",
                        }}>
                            <Users size={20} color="hsl(195,100%,65%)" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <h3 style={{ color: "#fff", fontSize: "14px", fontWeight: 700, margin: "0 0 6px" }}>
                                    Per-Session Creator Splits
                                </h3>
                                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: 0, lineHeight: 1.7 }}>
                                    When a creator invites another creator to their session, <strong style={{ color: "rgba(255,255,255,0.8)" }}>the inviter sets a custom revenue split</strong> for the invited creator.
                                    The invited creator must <strong style={{ color: "rgba(255,255,255,0.8)" }}>explicitly accept</strong> the split before entering the room.
                                    These splits are negotiated per session and are stored in the <code style={{ color: "hsl(280,100%,75%)", fontSize: "11px" }}>creator_invite_splits</code> table.
                                    No platform-wide default applies — this is fully creator-controlled.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)",
                    background: toast.ok ? "rgba(22,163,74,0.95)" : "rgba(220,38,38,0.95)",
                    borderRadius: "10px", padding: "10px 22px",
                    color: "#fff", fontSize: "13px", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: "8px",
                    backdropFilter: "blur(8px)", zIndex: 9999,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    animation: "slideUp 0.2s ease",
                }}>
                    {toast.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    {toast.msg}
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            `}</style>
        </div>
    );
}
