"use client";

import React, { useState } from "react";
import { useRoomSession } from "@/hooks/useRoomSession";
import { X, Lock, Globe, DollarSign } from "lucide-react";

interface StartSessionModalProps {
    roomType: string;
    roomDisplayName: string;
    isOpen: boolean;
    onClose: () => void;
    onSessionCreated?: (session: any) => void;
}

/**
 * Reusable modal for creating a session in ANY room.
 * - Public sessions: fee set by admin (invisible to creator)
 * - Private sessions: creator sets fee (min validation from admin settings)
 */
export default function StartSessionModal({
    roomType,
    roomDisplayName,
    isOpen,
    onClose,
    onSessionCreated,
}: StartSessionModalProps) {
    const { createSession } = useRoomSession();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [sessionType, setSessionType] = useState<"public" | "private">("public");
    const [price, setPrice] = useState<string>("20");
    const [costPerMin, setCostPerMin] = useState<string>("2");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError("Session title is required");
            return;
        }

        setIsSubmitting(true);
        const result = await createSession({
            room_type: roomType,
            title: title.trim(),
            description: description.trim() || undefined,
            session_type: sessionType,
            price: sessionType === "private" ? Number(price) : undefined,
            cost_per_min: sessionType === "private" ? Number(costPerMin) : undefined,
        });

        setIsSubmitting(false);

        if (result?.success) {
            onSessionCreated?.(result.session);
            onClose();
        } else {
            setError(result?.error || "Failed to create session");
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(8px)",
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                style={{
                    background: "linear-gradient(145deg, rgba(30,20,50,0.98), rgba(15,10,30,0.99))",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                    width: "100%",
                    maxWidth: "480px",
                    margin: "0 16px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                    overflow: "hidden",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "20px 24px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <div>
                        <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: 0 }}>
                            Start {roomDisplayName} Session
                        </h2>
                        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "4px" }}>
                            Go live and connect with your fans
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "rgba(255,255,255,0.08)",
                            border: "none",
                            borderRadius: "8px",
                            padding: "8px",
                            cursor: "pointer",
                            color: "rgba(255,255,255,0.5)",
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                    {/* Title */}
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                            Session Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={`e.g., "Late Night ${roomDisplayName}"`}
                            maxLength={100}
                            style={{
                                width: "100%",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "10px",
                                padding: "12px 14px",
                                color: "#fff",
                                fontSize: "14px",
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this session about?"
                            maxLength={300}
                            rows={2}
                            style={{
                                width: "100%",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "10px",
                                padding: "12px 14px",
                                color: "#fff",
                                fontSize: "14px",
                                outline: "none",
                                resize: "none",
                                fontFamily: "inherit",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    {/* Session Type Toggle */}
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                            Session Type
                        </label>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={() => setSessionType("public")}
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    padding: "12px",
                                    borderRadius: "10px",
                                    border: sessionType === "public" ? "2px solid hsl(150,80%,45%)" : "1px solid rgba(255,255,255,0.12)",
                                    background: sessionType === "public" ? "rgba(72,187,120,0.15)" : "rgba(255,255,255,0.04)",
                                    color: sessionType === "public" ? "hsl(150,80%,65%)" : "rgba(255,255,255,0.5)",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                <Globe size={16} /> Public
                            </button>
                            <button
                                type="button"
                                onClick={() => setSessionType("private")}
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    padding: "12px",
                                    borderRadius: "10px",
                                    border: sessionType === "private" ? "2px solid hsl(280,100%,65%)" : "1px solid rgba(255,255,255,0.12)",
                                    background: sessionType === "private" ? "rgba(159,90,253,0.15)" : "rgba(255,255,255,0.04)",
                                    color: sessionType === "private" ? "hsl(280,100%,75%)" : "rgba(255,255,255,0.5)",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                <Lock size={16} /> Private
                            </button>
                        </div>
                    </div>

                    {/* Private price field */}
                    {sessionType === "private" && (
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                                Entry Price (min €20)
                            </label>
                            <div style={{ position: "relative" }}>
                                <DollarSign
                                    size={16}
                                    style={{
                                        position: "absolute",
                                        left: "14px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "rgba(255,255,255,0.4)",
                                    }}
                                />
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    min={20}
                                    step={1}
                                    style={{
                                        width: "100%",
                                        background: "rgba(255,255,255,0.06)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        borderRadius: "10px",
                                        padding: "12px 14px 12px 36px",
                                        color: "#fff",
                                        fontSize: "14px",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Cost Per Minute field - Private sessions only */}
                    {sessionType === "private" && (
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                                Cost Per Min ($)
                            </label>
                            <div style={{ position: "relative" }}>
                                <DollarSign
                                    size={16}
                                    style={{
                                        position: "absolute",
                                        left: "14px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "rgba(255,255,255,0.4)",
                                    }}
                                />
                                <input
                                    type="number"
                                    value={costPerMin}
                                    onChange={(e) => setCostPerMin(String(Math.max(2, Number(e.target.value))))}
                                    min={2}
                                    step={1}
                                    style={{
                                        width: "100%",
                                        background: "rgba(255,255,255,0.06)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        borderRadius: "10px",
                                        padding: "12px 14px 12px 36px",
                                        color: "#fff",
                                        fontSize: "14px",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>
                            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", marginTop: "4px", paddingLeft: "4px" }}>
                                Minimum €2. Fans are charged per minute in your private session.
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div
                            style={{
                                background: "rgba(239,68,68,0.15)",
                                border: "1px solid rgba(239,68,68,0.3)",
                                borderRadius: "8px",
                                padding: "10px 14px",
                                color: "#f87171",
                                fontSize: "13px",
                                marginBottom: "16px",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !title.trim()}
                        style={{
                            width: "100%",
                            padding: "14px",
                            borderRadius: "12px",
                            border: "none",
                            background: isSubmitting
                                ? "rgba(255,255,255,0.1)"
                                : "linear-gradient(135deg, hsl(280,100%,60%), hsl(330,90%,55%))",
                            color: "#fff",
                            fontSize: "15px",
                            fontWeight: 700,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            opacity: isSubmitting || !title.trim() ? 0.6 : 1,
                            transition: "all 0.2s",
                        }}
                    >
                        {isSubmitting ? "Starting Session..." : "🔴 Go Live"}
                    </button>
                </form>
            </div>
        </div>
    );
}
