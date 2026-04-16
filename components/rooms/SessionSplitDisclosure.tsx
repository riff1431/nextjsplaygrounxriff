"use client";

import React from "react";
import { SPLIT_CONFIG } from "@/utils/finance/splitConfig";

interface SessionSplitDisclosureProps {
    isPrivate: boolean;
    entryFee?: number;
    costPerMin?: number;
    onAcknowledge: () => void;
    onCancel?: () => void;
}

/**
 * SessionSplitDisclosure — Creator-side disclosure modal
 *
 * Shows the revenue split breakdown before a creator starts a session.
 * The creator must acknowledge the split before going live.
 */
export default function SessionSplitDisclosure({
    isPrivate,
    entryFee = 0,
    costPerMin = 0,
    onAcknowledge,
    onCancel,
}: SessionSplitDisclosureProps) {
    const global = SPLIT_CONFIG.GLOBAL;
    const entry = isPrivate ? SPLIT_CONFIG.PRIVATE_ENTRY : SPLIT_CONFIG.PUBLIC_ENTRY;
    const perMin = isPrivate ? SPLIT_CONFIG.PRIVATE_PER_MIN : SPLIT_CONFIG.PUBLIC_PER_MIN;
    const suga = SPLIT_CONFIG.SUGA4U_FAVORITES;
    const comp = SPLIT_CONFIG.COMPETITION_TIPS;

    const rows = [
        {
            label: `Entry Fee ${entryFee > 0 ? `(€${entryFee})` : ''}`,
            you: entry.creator,
            platform: entry.platform,
        },
        {
            label: `Per-Minute ${costPerMin > 0 ? `(€${costPerMin}/min)` : `(€${isPrivate ? '5+' : '2'}/min)`}`,
            you: perMin.creator,
            platform: perMin.platform,
        },
        {
            label: "Tips & Reactions",
            you: global.creator,
            platform: global.platform,
        },
        {
            label: "Custom Requests",
            you: global.creator,
            platform: global.platform,
        },
        {
            label: "Gifts & Drops",
            you: global.creator,
            platform: global.platform,
        },
        {
            label: "Suga4U Favorites",
            you: suga.creator,
            platform: suga.platform,
        },
        {
            label: "Competition Tips",
            you: comp.creator,
            platform: comp.platform,
        },
    ];

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        }}>
            <div style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                borderRadius: 16, padding: "28px 32px",
                maxWidth: 460, width: "90%",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                color: "#fff",
            }}>
                <h3 style={{
                    margin: "0 0 6px", fontSize: 18, fontWeight: 700,
                    background: "linear-gradient(90deg, #ffd700, #ff6b6b)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                    💰 Revenue Split Disclosure
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "#aaa" }}>
                    {isPrivate ? "Private" : "Public"} Session — Review your earnings breakdown
                </p>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
                            <th style={{ textAlign: "left", padding: "8px 4px", color: "#888" }}>Source</th>
                            <th style={{ textAlign: "center", padding: "8px 4px", color: "#4ade80" }}>You</th>
                            <th style={{ textAlign: "center", padding: "8px 4px", color: "#f97316" }}>Platform</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <td style={{ padding: "8px 4px" }}>{row.label}</td>
                                <td style={{
                                    textAlign: "center", padding: "8px 4px", fontWeight: 600,
                                    color: row.you === 100 ? "#4ade80" : row.you === 0 ? "#666" : "#4ade80",
                                }}>
                                    {row.you}%
                                </td>
                                <td style={{
                                    textAlign: "center", padding: "8px 4px", fontWeight: 600,
                                    color: row.platform === 0 ? "#666" : "#f97316",
                                }}>
                                    {row.platform}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{
                    display: "flex", gap: 12, marginTop: 20,
                    justifyContent: "flex-end",
                }}>
                    {onCancel && (
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
                    )}
                    <button
                        onClick={onAcknowledge}
                        style={{
                            padding: "10px 24px", borderRadius: 8,
                            background: "linear-gradient(90deg, #4ade80, #22c55e)",
                            border: "none", color: "#000", fontWeight: 700,
                            cursor: "pointer", fontSize: 13,
                        }}
                    >
                        I Understand — Go Live
                    </button>
                </div>
            </div>
        </div>
    );
}
