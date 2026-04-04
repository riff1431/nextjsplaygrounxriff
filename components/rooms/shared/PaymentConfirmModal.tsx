"use client";

import React, { useState } from "react";
import { X, Wallet, AlertCircle, Loader2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

interface PaymentConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionTitle: string;
    sessionType: "public" | "private";
    entryFee: number;
    creatorName?: string;
    onConfirm: () => Promise<any>;
}

/**
 * Payment confirmation modal for joining a session.
 * Shows wallet balance, entry fee, and insufficient balance warning.
 */
export default function PaymentConfirmModal({
    isOpen,
    onClose,
    sessionTitle,
    sessionType,
    entryFee,
    creatorName,
    onConfirm,
}: PaymentConfirmModalProps) {
    const { balance } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const insufficient = (balance || 0) < entryFee;

    const handleConfirm = async () => {
        setError(null);
        setIsProcessing(true);
        try {
            const result = await onConfirm();
            if (result?.error) throw new Error(result.error);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
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
                zIndex: 10000,
                background: "rgba(0,0,0,0.75)",
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
                    maxWidth: "400px",
                    margin: "0 16px",
                    padding: "24px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                }}
            >
                {/* Close */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Title */}
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>🎬</div>
                    <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 4px" }}>
                        Enter Room
                    </h3>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: 0 }}>
                        {sessionTitle}
                    </p>
                    {creatorName && (
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", margin: "4px 0 0" }}>
                            Hosted by {creatorName}
                        </p>
                    )}
                </div>

                {/* Summary */}
                <div
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        padding: "16px",
                        marginBottom: "16px",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>Entry Fee</span>
                        <span style={{ color: "#fff", fontSize: "18px", fontWeight: 700 }}>${entryFee}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Pricing Model</span>
                        <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px", fontWeight: 600 }}>(per minute + entry)</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Wallet size={14} /> Your Balance
                        </span>
                        <span style={{ color: insufficient ? "#f87171" : "hsl(150,80%,60%)", fontSize: "15px", fontWeight: 600 }}>
                            ${(balance || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
                
                <div style={{ textAlign: "center", marginBottom: "16px", fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: "1.4" }}>
                    Billing starts immediately. Full minute billing applies. <br/>
                    <span style={{ color: "rgba(255,255,255,0.8)" }}>By entering, you agree to be charged per minute as described.</span>
                </div>

                {/* Warning */}
                {insufficient && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            borderRadius: "10px",
                            padding: "12px",
                            marginBottom: "16px",
                        }}
                    >
                        <AlertCircle size={18} color="#f87171" />
                        <span style={{ color: "#f87171", fontSize: "13px" }}>Insufficient balance. Add funds to continue.</span>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{ background: "rgba(239,68,68,0.15)", borderRadius: "8px", padding: "10px 14px", color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>
                        {error}
                    </div>
                )}

                {/* Confirm button */}
                <button
                    onClick={handleConfirm}
                    disabled={insufficient || isProcessing}
                    style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "none",
                        background: insufficient
                            ? "rgba(255,255,255,0.08)"
                            : "linear-gradient(135deg, hsl(150,80%,40%), hsl(180,100%,40%))",
                        color: "#fff",
                        fontSize: "15px",
                        fontWeight: 700,
                        cursor: insufficient || isProcessing ? "not-allowed" : "pointer",
                        opacity: insufficient || isProcessing ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                    }}
                >
                    {isProcessing ? (
                        <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Processing...</>
                    ) : insufficient ? (
                        "Insufficient Balance"
                    ) : (
                        `Pay $${entryFee} & Join`
                    )}
                </button>
            </div>
        </div>
    );
}
