"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface WalletData {
    id: string;
    user_id: string;
    balance: number;
    currency: string;
}

interface TransferResult {
    success: boolean;
    error?: string;
    debit_tx_id?: string;
    credit_tx_id?: string;
    amount?: number;
    new_balance?: number;
}

/**
 * Shared wallet hook — fetches balance, provides transfer/pay functions.
 *
 * Usage:
 *   const { balance, pay, isLoading } = useWallet();
 *   await pay(creatorId, 10, "Confession unlock", roomId);
 */
export function useWallet() {
    const { user } = useAuth();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    // Fetch wallet
    const fetchWallet = useCallback(async () => {
        if (!user) {
            setWallet(null);
            setIsLoading(false);
            return;
        }

        try {
            const { data, error: fetchError } = await supabase
                .from("wallets")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (fetchError && fetchError.code === "PGRST116") {
                // No wallet yet — create one
                const { data: newWallet, error: createError } = await supabase
                    .from("wallets")
                    .insert({ user_id: user.id, balance: 0, currency: "USD" })
                    .select()
                    .single();

                if (createError) throw createError;
                setWallet(newWallet);
            } else if (fetchError) {
                throw fetchError;
            } else {
                setWallet(data);
            }
        } catch (err: any) {
            console.error("Wallet fetch error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [user, supabase]);

    useEffect(() => {
        fetchWallet();
    }, [fetchWallet]);

    // Subscribe to wallet changes via Realtime
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`wallet-${user.id}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "wallets",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    if (payload.new) {
                        setWallet((prev) => (prev ? { ...prev, ...payload.new } : payload.new));
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user, supabase]);

    /**
     * Transfer funds from current user to another user.
     * Uses the atomic `transfer_funds` RPC.
     */
    const pay = useCallback(
        async (
            toUserId: string,
            amount: number,
            description: string,
            roomId?: string,
            relatedType?: string,
            relatedId?: string
        ): Promise<TransferResult> => {
            if (!user) return { success: false, error: "Not authenticated" };
            if (!wallet) return { success: false, error: "Wallet not loaded" };
            if (wallet.balance < amount)
                return { success: false, error: "Insufficient balance" };

            try {
                const { data, error: rpcError } = await supabase.rpc("transfer_funds", {
                    p_from_user_id: user.id,
                    p_to_user_id: toUserId,
                    p_amount: amount,
                    p_description: description,
                    p_room_id: roomId || null,
                    p_related_type: relatedType || null,
                    p_related_id: relatedId || null,
                });

                if (rpcError) throw rpcError;

                const result = data as TransferResult;

                if (result.success && result.new_balance !== undefined) {
                    // Optimistically update local balance
                    setWallet((prev) =>
                        prev ? { ...prev, balance: result.new_balance! } : prev
                    );
                }

                return result;
            } catch (err: any) {
                console.error("Payment error:", err);
                return { success: false, error: err.message };
            }
        },
        [user, wallet, supabase]
    );

    /** Refresh wallet balance from DB */
    const refresh = useCallback(async () => {
        await fetchWallet();
    }, [fetchWallet]);

    return {
        wallet,
        balance: wallet?.balance ?? 0,
        currency: wallet?.currency ?? "USD",
        isLoading,
        error,
        pay,
        refresh,
    };
}
