"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface BillingState {
    isActive: boolean;
    minutesBilled: number;
    totalBilled: number;
    lastBalance: number | null;
    error: string | null;
    autoEjected: boolean;
    /** Per-minute rate fetched from the server */
    rate: number | null;
    /** Whether billing is enabled for this room type */
    billingEnabled: boolean;
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
 *   // billing.rate — per-minute rate (e.g. 2)
 */
export function useSessionBilling(sessionId: string | null) {
    const [state, setState] = useState<BillingState>({
        isActive: false,
        minutesBilled: 0,
        totalBilled: 0,
        lastBalance: null,
        error: null,
        autoEjected: false,
        rate: null,
        billingEnabled: true,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const rateFetchedRef = useRef(false);

    // Fetch billing status (rate) on first start
    const fetchBillingStatus = useCallback(async () => {
        if (!sessionId || rateFetchedRef.current) return;
        rateFetchedRef.current = true;

        try {
            const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/billing`);
            if (res.ok) {
                const data = await res.json();
                setState(prev => ({
                    ...prev,
                    rate: data.rate ?? prev.rate,
                    billingEnabled: data.billing_enabled ?? prev.billingEnabled,
                    minutesBilled: data.total_minutes || prev.minutesBilled,
                    totalBilled: data.total_billed || prev.totalBilled,
                }));
            }
        } catch {
            // Non-critical — rate will be populated on next POST tick
        }
    }, [sessionId]);

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
                // Update rate from response if available
                rate: data.amount !== undefined ? data.amount : prev.rate,
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

        // Fetch rate first, then start ticking
        fetchBillingStatus();

        // Bill immediately for the first minute, then every 60s
        billOneMinute();
        intervalRef.current = setInterval(billOneMinute, 60_000);
    }, [billOneMinute, fetchBillingStatus]);

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

