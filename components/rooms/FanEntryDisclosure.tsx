"use client";

import React from "react";

interface FanEntryDisclosureProps {
    entryFee: number;
    costPerMin: number;
    isPrivate: boolean;
    sessionTitle?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * FanEntryDisclosure — Fan-side entry disclosure modal
 *
 * Shows the entry fee and per-minute billing details before a fan joins a session.
 * Includes ticket validity information.
 */
export default function FanEntryDisclosure({
    entryFee,
    costPerMin,
    isPrivate,
    sessionTitle = "this session",
    onConfirm,
    onCancel,
}: FanEntryDisclosureProps) {
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        }}>
            <div style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                borderRadius: 16, padding: "28px 32px",
                maxWidth: 400, width: "90%",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                color: "#fff",
            }}>
                <h3 style={{
                    margin: "0 0 6px", fontSize: 18, fontWeight: 700,
                    background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                    🎟️ Entry Details
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: "#aaa" }}>
                    Joining: {sessionTitle}
                </p>

                <div style={{
                    display: "flex", flexDirection: "column", gap: 12,
                    marginBottom: 20,
                }}>
                    {/* Entry Fee */}
                    <div style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "12px 16px", borderRadius: 10,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                        <span style={{ fontSize: 14 }}>🎫 Entry Ticket</span>
                        <span style={{
                            fontSize: 16, fontWeight: 700,
                            color: entryFee > 0 ? "#ffd700" : "#4ade80",
                        }}>
                            {entryFee > 0 ? `€${entryFee}` : "FREE"}
                        </span>
                    </div>

                    {/* Per-Minute Billing */}
                    <div style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "12px 16px", borderRadius: 10,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                        <span style={{ fontSize: 14 }}>⏱️ Per-Minute</span>
                        <span style={{
                            fontSize: 16, fontWeight: 700,
                            color: "#f97316",
                        }}>
                            ${costPerMin}/min
                        </span>
                    </div>

                    {/* Session Type Badge */}
                    <div style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "12px 16px", borderRadius: 10,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                        <span style={{ fontSize: 14 }}>🏷️ Session Type</span>
                        <span style={{
                            fontSize: 13, fontWeight: 600, padding: "2px 10px",
                            borderRadius: 6,
                            background: isPrivate
                                ? "rgba(168,85,247,0.2)"
                                : "rgba(74,222,128,0.2)",
                            color: isPrivate ? "#a855f7" : "#4ade80",
                        }}>
                            {isPrivate ? "Private" : "Public"}
                        </span>
                    </div>
                </div>

                {/* Ticket Validity Notice */}
                <div style={{
                    padding: "10px 14px", borderRadius: 8,
                    background: "rgba(96,165,250,0.1)",
                    border: "1px solid rgba(96,165,250,0.2)",
                    fontSize: 12, color: "#93c5fd",
                    marginBottom: 20, lineHeight: 1.5,
                }}>
                    ℹ️ Your entry ticket is valid for the duration of this session (up to 24 hours).
                    You can exit and re-enter freely without being charged again.
                </div>

                <div style={{
                    display: "flex", gap: 12,
                    justifyContent: "flex-end",
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: "10px 20px", borderRadius: 8,
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#ccc", cursor: "pointer", fontSize: 13,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: "10px 24px", borderRadius: 8,
                            background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                            border: "none", color: "#fff", fontWeight: 700,
                            cursor: "pointer", fontSize: 13,
                        }}
                    >
                        {entryFee > 0 ? `Pay €${entryFee} & Join` : "Join Now"}
                    </button>
                </div>
            </div>
        </div>
    );
}
