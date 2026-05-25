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
    /** Seconds remaining until the next charge (0-60, counts down live) */
    secondsUntilNextCharge: number;
}

/**
 * useSessionBilling — Frontend billing ticker for per-minute session charges.
 *
 * Calls the billing API every 60 seconds while active.
 * Auto-ejects the fan when their balance runs out.
 * Exposes `secondsUntilNextCharge` for real-time countdown UI.
 *
 * Usage:
 *   const billing = useSessionBilling(sessionId);
 *   // billing.startBilling() — called when fan joins
 *   // billing.stopBilling() — called when fan leaves
 *   // billing.minutesBilled, billing.totalBilled — for display
 *   // billing.autoEjected — true if fan was kicked for insufficient funds
 *   // billing.rate — per-minute rate (e.g. 2)
 *   // billing.secondsUntilNextCharge — countdown to next charge (0-60)
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
        secondsUntilNextCharge: 60,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const rateFetchedRef = useRef(false);
    const nextChargeTimeRef = useRef<number | null>(null); // epoch ms of next charge

    // Clear countdown interval helper
    const clearCountdown = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, []);

    // Start a 1-second countdown that updates `secondsUntilNextCharge`
    const startCountdown = useCallback(() => {
        clearCountdown();
        // Set next charge at 60s from now
        nextChargeTimeRef.current = Date.now() + 60_000;

        countdownRef.current = setInterval(() => {
            if (nextChargeTimeRef.current === null) return;
            const remaining = Math.max(0, Math.ceil((nextChargeTimeRef.current - Date.now()) / 1000));
            setState(prev => ({ ...prev, secondsUntilNextCharge: remaining }));
        }, 1000);
    }, [clearCountdown]);

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
                    lastBalance: data.new_balance !== undefined ? data.new_balance : prev.lastBalance,
                }));
            }
        } catch {
            // Non-critical — rate will be populated on next POST tick
        }
    }, [sessionId]);

    const billOneMinute = useCallback(async () => {
        if (!sessionId) return;

        // Reset countdown immediately when we bill
        startCountdown();

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
                        secondsUntilNextCharge: 0,
                    }));
                    // Stop both intervals
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    clearCountdown();
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
    }, [sessionId, startCountdown, clearCountdown]);

    const startBilling = useCallback(() => {
        if (intervalRef.current) return; // Already running

        setState(prev => ({
            ...prev,
            isActive: true,
            autoEjected: false,
            error: null,
            secondsUntilNextCharge: 60,
        }));

        // Fetch rate first
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
        clearCountdown();
        setState(prev => ({ ...prev, isActive: false, secondsUntilNextCharge: 60 }));
    }, [clearCountdown]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            clearCountdown();
        };
    }, [clearCountdown]);

    return {
        ...state,
        startBilling,
        stopBilling,
    };
}
