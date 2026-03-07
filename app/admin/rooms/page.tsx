"use client";

import React, { useState, useEffect } from "react";
import { Settings, Check, X, Loader2, ChevronLeft, Save } from "lucide-react";
import Link from "next/link";

interface RoomSetting {
    id: string;
    room_type: string;
    display_name: string;
    is_active: boolean;
    public_entry_fee: number;
    min_private_entry_fee: number;
    public_sessions_enabled: boolean;
    private_sessions_enabled: boolean;
    tips_enabled: boolean;
    custom_requests_enabled: boolean;
    sort_order: number;
}

export default function AdminRoomSettingsPage() {
    const [settings, setSettings] = useState<RoomSetting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

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
            <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
                <Link href="/admin/rooms/reactions" style={{ color: "hsl(280,100%,70%)", fontSize: "13px", textDecoration: "none", background: "rgba(159,90,253,0.12)", padding: "6px 14px", borderRadius: "8px" }}>
                    Manage Reactions
                </Link>
                <Link href="/admin/rooms/sessions" style={{ color: "hsl(45,100%,60%)", fontSize: "13px", textDecoration: "none", background: "rgba(255,200,0,0.08)", padding: "6px 14px", borderRadius: "8px" }}>
                    Active Sessions
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
                                </div>
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
