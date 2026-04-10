"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface BillingState {
    isActive: boolean;
    minutesBilled: number;
    totalBilled: number;
    lastBalance: number | null;
    error: string | null;
    autoEjected: boolean;
}

/**
 * useSessionBilling — Frontend billing ticker for per-minute session charges.
 *
 * Calls the billing API every 60 seconds while active.
 * Auto-ejects the fan when their balance runs out.
 *
 * Usage:
 *   const billing = useSessionBilling(sessionId);
 *   // billing.startBilling() — called when fan joins
 *   // billing.stopBilling() — called when fan leaves
 *   // billing.minutesBilled, billing.totalBilled — for display
 *   // billing.autoEjected — true if fan was kicked for insufficient funds
 */
export function useSessionBilling(sessionId: string | null) {
    const [state, setState] = useState<BillingState>({
        isActive: false,
        minutesBilled: 0,
        totalBilled: 0,
        lastBalance: null,
        error: null,
        autoEjected: false,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const billOneMinute = useCallback(async () => {
        if (!sessionId) return;

        try {
            const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/billing`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.auto_eject) {
                    setState(prev => ({
                        ...prev,
                        isActive: false,
                        autoEjected: true,
                        error: "Insufficient balance — session ended",
                    }));
                    // Stop the interval
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    return;
                }
                setState(prev => ({ ...prev, error: data.error }));
                return;
            }

            setState(prev => ({
                ...prev,
                minutesBilled: data.minute_number,
                totalBilled: data.total_billed,
                lastBalance: data.new_balance,
                error: null,
            }));
        } catch (err: any) {
            console.error("Billing tick error:", err);
            setState(prev => ({ ...prev, error: err.message }));
        }
    }, [sessionId]);

    const startBilling = useCallback(() => {
        if (intervalRef.current) return; // Already running

        setState(prev => ({
            ...prev,
            isActive: true,
            autoEjected: false,
            error: null,
        }));

        // Bill immediately for the first minute, then every 60s
        billOneMinute();
        intervalRef.current = setInterval(billOneMinute, 60_000);
    }, [billOneMinute]);

    const stopBilling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setState(prev => ({ ...prev, isActive: false }));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return {
        ...state,
        startBilling,
        stopBilling,
    };
}
