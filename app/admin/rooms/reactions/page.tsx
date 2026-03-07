"use client";

import React, { useState, useEffect } from "react";
import { Smile, Plus, Trash2, Loader2, ChevronLeft, Edit2, Save, X } from "lucide-react";
import Link from "next/link";

interface Reaction {
    id: string;
    room_type: string | null;
    name: string;
    emoji: string;
    price: number;
    is_active: boolean;
    sort_order: number;
}

export default function AdminReactionCatalogPage() {
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: "", emoji: "", price: "1", room_type: "" });

    useEffect(() => {
        fetchReactions();
    }, []);

    const fetchReactions = async () => {
        const res = await fetch("/api/v1/admin/reaction-catalog");
        const data = await res.json();
        setReactions(data.reactions || []);
        setIsLoading(false);
    };

    const handleAdd = async () => {
        if (!form.name || !form.emoji) return;
        const res = await fetch("/api/v1/admin/reaction-catalog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, price: Number(form.price), room_type: form.room_type || null }),
        });
        const data = await res.json();
        if (data.success) {
            setReactions((prev) => [...prev, data.reaction]);
            setForm({ name: "", emoji: "", price: "1", room_type: "" });
            setShowAdd(false);
        }
    };

    const handleUpdate = async (id: string, updates: Partial<Reaction>) => {
        const res = await fetch("/api/v1/admin/reaction-catalog", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
        });
        const data = await res.json();
        if (data.success) {
            setReactions((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.reaction } : r)));
        }
        setEditId(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this reaction?")) return;
        const res = await fetch(`/api/v1/admin/reaction-catalog?id=${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) setReactions((prev) => prev.filter((r) => r.id !== id));
    };

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "30px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <Link href="/admin/rooms" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                    <ChevronLeft size={20} />
                </Link>
                <Smile size={24} color="hsl(45,100%,60%)" />
                <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: 700, margin: 0 }}>Reaction Catalog</h1>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    style={{
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        borderRadius: "10px",
                        border: "none",
                        background: "linear-gradient(135deg, hsl(280,100%,55%), hsl(330,90%,50%))",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    <Plus size={14} /> Add Reaction
                </button>
            </div>

            {/* Add form */}
            {showAdd && (
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
                    <h3 style={{ color: "#fff", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>New Reaction</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 1fr", gap: "10px", alignItems: "end" }}>
                        <div>
                            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", display: "block", marginBottom: "4px" }}>Emoji</label>
                            <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px", color: "#fff", fontSize: "20px", textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", display: "block", marginBottom: "4px" }}>Name</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", display: "block", marginBottom: "4px" }}>Price ($)</label>
                            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} min={0} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <button onClick={handleAdd} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "hsl(150,80%,40%)", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", height: "fit-content" }}>
                            Add
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
                    <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {reactions.map((rx) => (
                        <div
                            key={rx.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "14px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                borderRadius: "10px",
                                padding: "12px 16px",
                                opacity: rx.is_active ? 1 : 0.5,
                            }}
                        >
                            <span style={{ fontSize: "22px" }}>{rx.emoji}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>{rx.name}</div>
                                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>
                                    {rx.room_type || "All rooms"} • ${rx.price}
                                </div>
                            </div>
                            <button
                                onClick={() => handleUpdate(rx.id, { is_active: !rx.is_active })}
                                style={{
                                    background: rx.is_active ? "rgba(72,187,120,0.15)" : "rgba(255,255,255,0.06)",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "4px 10px",
                                    color: rx.is_active ? "hsl(150,80%,60%)" : "rgba(255,255,255,0.4)",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                }}
                            >
                                {rx.is_active ? "Active" : "Inactive"}
                            </button>
                            <button onClick={() => handleDelete(rx.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "4px" }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
