"use client";

import React, { useEffect, useState } from "react";
import { cs } from "@/utils/currency";
import { Loader2, Clock, Timer, CheckCircle } from "lucide-react";

interface FanEntryDisclosureProps {
    entryFee: number;
    /** Static costPerMin (fallback if roomType is not provided) */
    costPerMin?: number;
    /** Room type to dynamically fetch the rate from admin settings */
    roomType?: string;
    isPrivate: boolean;
    sessionTitle?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * FanEntryDisclosure — Fan-side entry disclosure modal
 *
 * Shows the entry fee and per-minute billing details before a fan joins a session.
 * Dynamically fetches the billing rate from admin Room Settings via the public API.
 * Falls back to the provided `costPerMin` prop if room type is not given.
 */
export default function FanEntryDisclosure({
    entryFee,
    costPerMin: costPerMinProp,
    roomType,
    isPrivate,
    sessionTitle = "this session",
    onConfirm,
    onCancel,
}: FanEntryDisclosureProps) {
    const [loadingRate, setLoadingRate] = useState(false);
    const [billingEnabled, setBillingEnabled] = useState<boolean | null>(null);
    const [dynamicRate, setDynamicRate] = useState<number | null>(null);

    useEffect(() => {
        if (!roomType) return;
        setLoadingRate(true);
        fetch(`/api/v1/rooms/settings?room_type=${roomType}`)
            .then(r => r.json())
            .then(data => {
                if (data.settings) {
                    const s = data.settings;
                    setBillingEnabled(s.billing_enabled ?? true);
                    // Use public or private rate based on session type
                    const rate = isPrivate
                        ? (s.min_private_cost_per_min ?? 0)
                        : (s.public_cost_per_min ?? 0);
                    setDynamicRate(rate);
                }
            })
            .catch(() => { /* fallback to prop */ })
            .finally(() => setLoadingRate(false));
    }, [roomType, isPrivate]);

    // Resolve final rate: dynamic (from DB) takes priority over prop
    const resolvedRate = dynamicRate !== null ? dynamicRate : (costPerMinProp ?? 0);
    const resolvedBillingEnabled = billingEnabled !== null ? billingEnabled : true;
    const showPerMin = resolvedBillingEnabled && resolvedRate > 0;

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
            fontFamily: "'Inter', 'Montserrat', sans-serif",
        }}>
            <div style={{
                background: "linear-gradient(145deg, rgba(20,12,40,0.98), rgba(10,6,25,0.99))",
                borderRadius: 20, padding: "32px",
                maxWidth: 400, width: "90%",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
                color: "#fff",
            }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>🎟️</div>
                    <h3 style={{
                        margin: "0 0 6px", fontSize: 18, fontWeight: 800,
                        background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>
                        Entry Details
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                        Joining: <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{sessionTitle}</span>
                    </p>
                </div>

                <div style={{
                    display: "flex", flexDirection: "column", gap: 10,
                    marginBottom: 20,
                }}>
                    {/* Entry Fee */}
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "13px 16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Clock style={{ width: 14, height: 14, color: "#a78bfa" }} />
                            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Entry Ticket</span>
                        </div>
                        <span style={{
                            fontSize: 16, fontWeight: 800,
                            color: entryFee > 0 ? "hsl(42, 90%, 60%)" : "#4ade80",
                        }}>
                            {entryFee > 0 ? `${cs()}${entryFee}` : "FREE"}
                        </span>
                    </div>

                    {/* Per-Minute Billing */}
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "13px 16px", borderRadius: 12,
                        background: showPerMin
                            ? "rgba(249, 115, 22, 0.06)"
                            : "rgba(255,255,255,0.04)",
                        border: showPerMin
                            ? "1px solid rgba(249, 115, 22, 0.2)"
                            : "1px solid rgba(255,255,255,0.08)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Timer style={{ width: 14, height: 14, color: showPerMin ? "#f97316" : "#6b7280" }} />
                            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Per-Minute Rate</span>
                        </div>
                        <span style={{
                            fontSize: 16, fontWeight: 800,
                            color: showPerMin ? "#f97316" : "#4ade80",
                        }}>
                            {loadingRate ? (
                                <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                            ) : showPerMin ? (
                                `${cs()}${resolvedRate}/min`
                            ) : (
                                "FREE"
                            )}
                        </span>
                    </div>

                    {/* Session Type Badge */}
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "13px 16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <CheckCircle style={{ width: 14, height: 14, color: "#60a5fa" }} />
                            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Session Type</span>
                        </div>
                        <span style={{
                            fontSize: 12, fontWeight: 700, padding: "3px 10px",
                            borderRadius: 6,
                            background: isPrivate
                                ? "rgba(168,85,247,0.15)"
                                : "rgba(74,222,128,0.15)",
                            color: isPrivate ? "#c084fc" : "#4ade80",
                            border: isPrivate
                                ? "1px solid rgba(168,85,247,0.2)"
                                : "1px solid rgba(74,222,128,0.2)",
                        }}>
                            {isPrivate ? "Private" : "Public"}
                        </span>
                    </div>
                </div>

                {/* Billing notice */}
                <div style={{
                    padding: "11px 14px", borderRadius: 10,
                    background: showPerMin ? "rgba(249,115,22,0.07)" : "rgba(96,165,250,0.07)",
                    border: showPerMin ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(96,165,250,0.15)",
                    fontSize: 12,
                    color: showPerMin ? "rgba(253,186,116,0.9)" : "rgba(147,197,253,0.85)",
                    marginBottom: 20, lineHeight: 1.6,
                }}>
                    {showPerMin ? (
                        <>⏱️ You will be charged <strong>{cs()}{resolvedRate}/min</strong> while in the room, starting immediately. Your entry ticket is valid for the duration of this session.</>
                    ) : (
                        <>ℹ️ Your entry ticket is valid for the duration of this session (up to 24 hours). You can exit and re-enter freely without being charged again.</>
                    )}
                </div>

                <div style={{
                    display: "flex", gap: 12,
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1, padding: "12px 20px", borderRadius: 10,
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13,
                            fontWeight: 600, transition: "all 0.2s",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 2, padding: "12px 24px", borderRadius: 10,
                            background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
                            border: "none", color: "#fff", fontWeight: 800,
                            cursor: "pointer", fontSize: 13,
                            boxShadow: "0 4px 20px rgba(96,165,250,0.3)",
                            transition: "all 0.2s",
                        }}
                    >
                        {entryFee > 0 ? `Pay ${cs()}${entryFee} & Join` : "Join Now"}
                    </button>
                </div>
            </div>
        </div>
    );
}
