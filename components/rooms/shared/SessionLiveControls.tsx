"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Square, Clock } from "lucide-react";
import { toast } from "sonner";
import CreatorBillingWidget from "@/components/rooms/shared/CreatorBillingWidget";

/* ─────────── Props ─────────── */
interface SessionLiveControlsProps {
    sessionId: string;
    onEnd?: () => void;
    accentHsl?: string;
    initialLiveStartedAt?: string | null;
    customGoLive?: () => Promise<string | null>;
    customEnd?: () => Promise<void>;
    hideEnd?: boolean;
}

/* ─────────── Helpers ─────────── */
function formatElapsed(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/* ═══════════════════════════════════════════════════
   SessionLiveControls
   Responsive layout:
   - Mobile  : [🔴 timer] [End]          (billing hidden)
   - Tablet  : [EARNED][FANS] [🔴 timer] [End]
   - Desktop : [EARNED][FANS][RATE] [🔴 timer] [End]
   ═══════════════════════════════════════════════════ */
export default function SessionLiveControls({
    sessionId,
    onEnd,
    accentHsl = "150, 80%, 50%",
    initialLiveStartedAt,
    customGoLive,
    customEnd,
    hideEnd,
}: SessionLiveControlsProps) {
    const [liveStartedAt, setLiveStartedAt] = useState<number | null>(
        initialLiveStartedAt ? new Date(initialLiveStartedAt).getTime() : null
    );
    const [elapsed, setElapsed] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(!!initialLiveStartedAt);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isLive = liveStartedAt !== null;

    /* ── Fetch live_started_at on mount (if not provided) ── */
    useEffect(() => {
        if (hasFetched || initialLiveStartedAt !== undefined) return;

        async function fetchStatus() {
            try {
                const res = await fetch(`/api/v1/rooms/sessions?status=active`);
                const data = await res.json();
                const session = (data.sessions || []).find(
                    (s: any) => s.id === sessionId
                );
                if (session?.live_started_at) {
                    setLiveStartedAt(new Date(session.live_started_at).getTime());
                }
            } catch (e) {
                console.error("Failed to fetch session live status:", e);
            } finally {
                setHasFetched(true);
            }
        }
        fetchStatus();
    }, [sessionId, hasFetched, initialLiveStartedAt]);

    /* ── Timer tick ── */
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        if (isLive) {
            setElapsed(Math.max(0, Math.floor((Date.now() - liveStartedAt!) / 1000)));
            timerRef.current = setInterval(() => {
                setElapsed(Math.max(0, Math.floor((Date.now() - liveStartedAt!) / 1000)));
            }, 1000);
        } else {
            setElapsed(0);
        }

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isLive, liveStartedAt]);

    /* ── Go Live ── */
    const handleGoLive = useCallback(async () => {
        setIsLoading(true);
        try {
            if (customGoLive) {
                const ts = await customGoLive();
                if (ts) setLiveStartedAt(new Date(ts).getTime());
                else setLiveStartedAt(Date.now());
            } else {
                const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/go-live`, { method: "PATCH" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setLiveStartedAt(new Date(data.live_started_at).getTime());
            }
            toast.success("You're LIVE! 🔴");
        } catch (err: any) {
            console.error("Go live error:", err);
            toast.error("Failed to go live: " + err.message);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, customGoLive]);

    /* ── End Session ── */
    const handleEnd = useCallback(async () => {
        if (!confirm("End this session?")) return;
        setIsLoading(true);
        try {
            if (customEnd) {
                await customEnd();
            } else {
                const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/end`, { method: "POST" });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error);
                }
            }
            setLiveStartedAt(null);
            toast.success("Session ended 🎬");
            onEnd?.();
        } catch (err: any) {
            console.error("End session error:", err);
            toast.error("Failed to end session: " + err.message);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, customEnd, onEnd]);

    /* ── Render ── */
    return (
        <>
            <style>{`
                /* Responsive billing strip */
                .slc-wrap { display:flex; align-items:center; gap:6px; flex-wrap:wrap; justify-content:center; font-family:'Inter',sans-serif; }

                /* On very small screens: hide billing widget entirely */
                @media (max-width: 479px) {
                    .slc-billing { display: none !important; }
                }
                /* On mobile (480–767px): show billing but compact mode */
                @media (min-width: 480px) and (max-width: 767px) {
                    .slc-billing { display: flex !important; }
                }
            `}</style>

            <div className="slc-wrap">
                {/* Billing widget — hidden on very small screens */}
                <div className="slc-billing hidden sm:flex">
                    <CreatorBillingWidget
                        sessionId={sessionId}
                        accentHsl={accentHsl}
                    />
                </div>

                {/* Timer Pill */}
                <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-md shrink-0"
                    style={{
                        background: isLive ? "rgba(239, 68, 68, 0.12)" : "rgba(255,255,255,0.06)",
                        border: isLive ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(255,255,255,0.12)",
                        boxShadow: isLive ? "0 0 12px rgba(239, 68, 68, 0.15)" : "none",
                    }}
                >
                    {isLive && (
                        <span
                            className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                            style={{ animation: "pulse 1.5s ease-in-out infinite", boxShadow: "0 0 6px rgba(239,68,68,0.6)" }}
                        />
                    )}
                    <Clock
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: isLive ? "rgb(252,165,165)" : "rgba(255,255,255,0.45)" }}
                    />
                    <span
                        className="text-sm font-bold"
                        style={{
                            fontFamily: "'JetBrains Mono','SF Mono','Fira Code',monospace",
                            color: isLive ? "rgb(252,165,165)" : "rgba(255,255,255,0.4)",
                            letterSpacing: "0.08em",
                            minWidth: "58px",
                            textAlign: "center",
                        }}
                    >
                        {formatElapsed(elapsed)}
                    </span>
                </div>

                {/* Go Live / End Button */}
                {!isLive ? (
                    <button
                        onClick={handleGoLive}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        style={{
                            background: "linear-gradient(135deg, hsl(145,80%,42%), hsl(160,75%,38%))",
                            color: "#fff",
                            boxShadow: "0 0 16px hsla(150,80%,45%,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                            border: "1px solid hsla(150,80%,50%,0.4)",
                            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        }}
                    >
                        <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ fill: "currentColor" }} />
                        <span className="hidden xs:inline">{isLoading ? "Starting…" : "Go Live"}</span>
                        <span className="xs:hidden">▶</span>
                    </button>
                ) : !hideEnd ? (
                    <button
                        onClick={handleEnd}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        style={{
                            background: "linear-gradient(135deg, hsl(350,75%,45%), hsl(330,70%,40%))",
                            color: "#fff",
                            boxShadow: "0 0 16px hsla(350,80%,50%,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                            border: "1px solid hsla(350,75%,55%,0.4)",
                            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        }}
                    >
                        <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ fill: "currentColor" }} />
                        {isLoading ? "Ending…" : "End"}
                    </button>
                ) : null}
            </div>
        </>
    );
}
