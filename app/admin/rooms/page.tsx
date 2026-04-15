"use client";

import React, { useState, useEffect } from "react";
import { Settings, Check, X, Loader2, ChevronLeft, Save, ChevronDown, ChevronUp, Plus, Trash2, Info } from "lucide-react";
import Link from "next/link";

interface InfoItem {
    emoji: string;
    text: string;
}

interface InfoSection {
    title: string;
    items: InfoItem[];
}

interface RoomSetting {
    id: string;
    room_type: string;
    display_name: string;
    is_active: boolean;
    public_entry_fee: number;
    min_private_entry_fee: number;
    public_cost_per_min: number;
    min_private_cost_per_min: number;
    billing_enabled: boolean;
    public_sessions_enabled: boolean;
    private_sessions_enabled: boolean;
    tips_enabled: boolean;
    custom_requests_enabled: boolean;
    sort_order: number;
    entry_info_section1?: InfoSection;
    entry_info_section2?: InfoSection;
    entry_info_section3?: InfoSection;
    entry_info_pro_tip?: string;
}

export default function AdminRoomSettingsPage() {
    const [settings, setSettings] = useState<RoomSetting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [expandedEntryInfo, setExpandedEntryInfo] = useState<string | null>(null);
    const [editingSections, setEditingSections] = useState<Record<string, {
        section1: InfoSection;
        section2: InfoSection;
        section3: InfoSection;
        pro_tip: string;
    }>>({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const res = await fetch("/api/v1/admin/room-settings");
        const data = await res.json();
        setSettings(data.settings || []);
        setIsLoading(false);
    };

    const updateSetting = async (roomType: string, updates: Partial<RoomSetting>) => {
        setSaving(roomType);
        const res = await fetch("/api/v1/admin/room-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_type: roomType, ...updates }),
        });
        const data = await res.json();
        if (data.success) {
            setSettings((prev) => prev.map((s) => (s.room_type === roomType ? { ...s, ...data.settings } : s)));
            setFeedback(`${roomType} updated!`);
            setTimeout(() => setFeedback(null), 2000);
        }
        setSaving(null);
    };

    const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
        <button
            onClick={() => onChange(!value)}
            style={{
                width: "42px",
                height: "24px",
                borderRadius: "12px",
                border: "none",
                background: value ? "hsl(150,80%,40%)" : "rgba(255,255,255,0.15)",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
            }}
        >
            <div
                style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: "3px",
                    left: value ? "21px" : "3px",
                    transition: "left 0.2s",
                }}
            />
        </button>
    );

    return (
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "30px 20px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "30px" }}>
                <Link href="/admin/dashboard" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                    <ChevronLeft size={20} />
                </Link>
                <Settings size={24} color="hsl(280,100%,70%)" />
                <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: 700, margin: 0 }}>Room Settings</h1>
            </div>

            {/* Nav links */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
                <Link href="/admin/rooms/reactions" style={{ color: "hsl(280,100%,70%)", fontSize: "13px", textDecoration: "none", background: "rgba(159,90,253,0.12)", padding: "6px 14px", borderRadius: "8px" }}>
                    Manage Reactions
                </Link>
                <Link href="/admin/rooms/sessions" style={{ color: "hsl(45,100%,60%)", fontSize: "13px", textDecoration: "none", background: "rgba(255,200,0,0.08)", padding: "6px 14px", borderRadius: "8px" }}>
                    Active Sessions
                </Link>
                <Link href="/admin/finance/splits" style={{ color: "hsl(150,80%,55%)", fontSize: "13px", textDecoration: "none", background: "rgba(72,187,120,0.08)", padding: "6px 14px", borderRadius: "8px" }}>
                    Revenue Splits ↗
                </Link>
            </div>

            {isLoading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.5)" }}>
                    <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {settings.map((s) => (
                        <div
                            key={s.id}
                            style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "14px",
                                padding: "20px",
                                opacity: s.is_active ? 1 : 0.6,
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <div>
                                    <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: 0 }}>{s.display_name}</h3>
                                    <code style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>{s.room_type}</code>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>Active</span>
                                    <Toggle value={s.is_active} onChange={(v) => updateSetting(s.room_type, { is_active: v })} />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                                {/* Fees */}
                                <div>
                                    <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Public Entry Fee ($)</label>
                                    <input
                                        type="number"
                                        defaultValue={s.public_entry_fee}
                                        min={0}
                                        onBlur={(e) => {
                                            const v = Number(e.target.value);
                                            if (v !== s.public_entry_fee) updateSetting(s.room_type, { public_entry_fee: v } as any);
                                        }}
                                        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Min Private Fee ($)</label>
                                    <input
                                        type="number"
                                        defaultValue={s.min_private_entry_fee}
                                        min={0}
                                        onBlur={(e) => {
                                            const v = Number(e.target.value);
                                            if (v !== s.min_private_entry_fee) updateSetting(s.room_type, { min_private_entry_fee: v } as any);
                                        }}
                                        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Public $/min</label>
                                    <input
                                        type="number"
                                        defaultValue={s.public_cost_per_min ?? 2}
                                        min={0}
                                        step={0.01}
                                        onBlur={(e) => {
                                            const v = Number(e.target.value);
                                            if (v !== s.public_cost_per_min) updateSetting(s.room_type, { public_cost_per_min: v } as any);
                                        }}
                                        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Private $/min (min)</label>
                                    <input
                                        type="number"
                                        defaultValue={s.min_private_cost_per_min ?? 5}
                                        min={0}
                                        step={0.01}
                                        onBlur={(e) => {
                                            const v = Number(e.target.value);
                                            if (v !== s.min_private_cost_per_min) updateSetting(s.room_type, { min_private_cost_per_min: v } as any);
                                        }}
                                        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                                    />
                                </div>

                                {/* Toggles */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Public Sessions</span>
                                        <Toggle value={s.public_sessions_enabled} onChange={(v) => updateSetting(s.room_type, { public_sessions_enabled: v } as any)} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Private Sessions</span>
                                        <Toggle value={s.private_sessions_enabled} onChange={(v) => updateSetting(s.room_type, { private_sessions_enabled: v } as any)} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Tips</span>
                                        <Toggle value={s.tips_enabled} onChange={(v) => updateSetting(s.room_type, { tips_enabled: v } as any)} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Custom Requests</span>
                                        <Toggle value={s.custom_requests_enabled} onChange={(v) => updateSetting(s.room_type, { custom_requests_enabled: v } as any)} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Per-Min Billing</span>
                                        <Toggle value={s.billing_enabled ?? true} onChange={(v) => updateSetting(s.room_type, { billing_enabled: v } as any)} />
                                    </div>
                                </div>
                            </div>

                            {/* Entry Info Editor Toggle */}
                            <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                                <button
                                    onClick={() => {
                                        const isExpanded = expandedEntryInfo === s.room_type;
                                        if (!isExpanded) {
                                            setEditingSections(prev => ({
                                                ...prev,
                                                [s.room_type]: {
                                                    section1: s.entry_info_section1 || { title: "What Happens Here", items: [] },
                                                    section2: s.entry_info_section2 || { title: "How to Participate", items: [] },
                                                    section3: s.entry_info_section3 || { title: "Ways to Spend", items: [] },
                                                    pro_tip: s.entry_info_pro_tip || "",
                                                }
                                            }));
                                        }
                                        setExpandedEntryInfo(isExpanded ? null : s.room_type);
                                    }}
                                    style={{
                                        display: "inline-flex", alignItems: "center", gap: "6px",
                                        background: "rgba(159,90,253,0.08)", border: "1px solid rgba(159,90,253,0.2)",
                                        borderRadius: "8px", padding: "8px 14px",
                                        color: "hsl(280,100%,75%)", fontSize: "12px", fontWeight: 600,
                                        cursor: "pointer", transition: "all 0.2s",
                                    }}
                                >
                                    <Info size={14} />
                                    Entry Info Modal
                                    {expandedEntryInfo === s.room_type ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {expandedEntryInfo === s.room_type && editingSections[s.room_type] && (
                                    <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
                                        {/* Section editors */}
                                        {(["section1", "section2", "section3"] as const).map((sKey, sIdx) => {
                                            const section = editingSections[s.room_type][sKey];
                                            return (
                                                <div key={sKey} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "14px" }}>
                                                    <div style={{ marginBottom: "10px" }}>
                                                        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Section {sIdx + 1} Title</label>
                                                        <input
                                                            type="text"
                                                            value={section.title}
                                                            onChange={(e) => {
                                                                setEditingSections(prev => ({
                                                                    ...prev,
                                                                    [s.room_type]: {
                                                                        ...prev[s.room_type],
                                                                        [sKey]: { ...section, title: e.target.value },
                                                                    }
                                                                }));
                                                            }}
                                                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "6px 10px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                                                        />
                                                    </div>

                                                    {section.items.map((item, iIdx) => (
                                                        <div key={iIdx} style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                                                            <input
                                                                type="text"
                                                                value={item.emoji}
                                                                onChange={(e) => {
                                                                    const newItems = [...section.items];
                                                                    newItems[iIdx] = { ...item, emoji: e.target.value };
                                                                    setEditingSections(prev => ({
                                                                        ...prev,
                                                                        [s.room_type]: {
                                                                            ...prev[s.room_type],
                                                                            [sKey]: { ...section, items: newItems },
                                                                        }
                                                                    }));
                                                                }}
                                                                style={{ width: "44px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "6px 8px", color: "#fff", fontSize: "14px", outline: "none", textAlign: "center", flexShrink: 0 }}
                                                                placeholder="😀"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={item.text}
                                                                onChange={(e) => {
                                                                    const newItems = [...section.items];
                                                                    newItems[iIdx] = { ...item, text: e.target.value };
                                                                    setEditingSections(prev => ({
                                                                        ...prev,
                                                                        [s.room_type]: {
                                                                            ...prev[s.room_type],
                                                                            [sKey]: { ...section, items: newItems },
                                                                        }
                                                                    }));
                                                                }}
                                                                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "6px 10px", color: "#fff", fontSize: "12px", outline: "none" }}
                                                                placeholder="Item text..."
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const newItems = section.items.filter((_, i) => i !== iIdx);
                                                                    setEditingSections(prev => ({
                                                                        ...prev,
                                                                        [s.room_type]: {
                                                                            ...prev[s.room_type],
                                                                            [sKey]: { ...section, items: newItems },
                                                                        }
                                                                    }));
                                                                }}
                                                                style={{ background: "rgba(225,29,72,0.1)", border: "1px solid rgba(225,29,72,0.2)", borderRadius: "6px", padding: "6px", cursor: "pointer", color: "#fb7185", flexShrink: 0 }}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    <button
                                                        onClick={() => {
                                                            const newItems = [...section.items, { emoji: "✨", text: "" }];
                                                            setEditingSections(prev => ({
                                                                ...prev,
                                                                [s.room_type]: {
                                                                    ...prev[s.room_type],
                                                                    [sKey]: { ...section, items: newItems },
                                                                }
                                                            }));
                                                        }}
                                                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(72,187,120,0.1)", border: "1px solid rgba(72,187,120,0.2)", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", color: "#48bb78", fontSize: "11px", fontWeight: 600 }}
                                                    >
                                                        <Plus size={12} /> Add Item
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* Pro tip */}
                                        <div>
                                            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", fontWeight: 600, display: "block", marginBottom: "4px" }}>🧠 Pro Tip</label>
                                            <input
                                                type="text"
                                                value={editingSections[s.room_type].pro_tip}
                                                onChange={(e) => {
                                                    setEditingSections(prev => ({
                                                        ...prev,
                                                        [s.room_type]: {
                                                            ...prev[s.room_type],
                                                            pro_tip: e.target.value,
                                                        }
                                                    }));
                                                }}
                                                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                                                placeholder="Pro tip text..."
                                            />
                                        </div>

                                        {/* Save entry info button */}
                                        <button
                                            onClick={async () => {
                                                const ed = editingSections[s.room_type];
                                                await updateSetting(s.room_type, {
                                                    entry_info_section1: ed.section1,
                                                    entry_info_section2: ed.section2,
                                                    entry_info_section3: ed.section3,
                                                    entry_info_pro_tip: ed.pro_tip,
                                                } as any);
                                            }}
                                            disabled={saving === s.room_type}
                                            style={{
                                                display: "inline-flex", alignItems: "center", gap: "6px",
                                                background: "hsl(280, 80%, 55%)", border: "none",
                                                borderRadius: "8px", padding: "10px 20px",
                                                color: "#fff", fontSize: "13px", fontWeight: 700,
                                                cursor: saving === s.room_type ? "wait" : "pointer",
                                                opacity: saving === s.room_type ? 0.6 : 1,
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            {saving === s.room_type ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
                                            Save Entry Info
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Feedback toast */}
            {feedback && (
                <div style={{ position: "fixed", bottom: "30px", left: "50%", transform: "translateX(-50%)", background: "rgba(72,187,120,0.9)", borderRadius: "10px", padding: "10px 20px", color: "#fff", fontSize: "13px", fontWeight: 600, zIndex: 10000 }}>
                    ✓ {feedback}
                </div>
            )}
        </div>
    );
}
