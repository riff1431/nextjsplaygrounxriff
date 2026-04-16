"use client";

import React, { useState } from "react";
import { Coins, Plus } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import TopUpModal from "@/components/wallet/TopUpModal";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface WalletPillProps {
    className?: string;
    /** compact = smaller pill for tight headers */
    compact?: boolean;
}

export default function WalletPill({ className = "", compact = false }: WalletPillProps) {
    const { balance, isLoading, refresh } = useWallet();
    const [showTopUp, setShowTopUp] = useState(false);
    const { user } = useAuth();
    const supabase = createClient();

    const handleTopUp = async (amount: number, method: string, status: "pending" | "completed", proofUrl?: string) => {
        if (!user) return;
        try {
            // Record top-up transaction
            await supabase.from("wallet_transactions").insert({
                wallet_id: user.id,
                user_id: user.id,
                type: "top_up",
                amount,
                description: `Top-up via ${method}`,
                status,
                metadata: { method, proof_url: proofUrl },
            });

            if (status === "completed") {
                // For instant methods, credit the wallet
                await supabase.rpc("credit_wallet", {
                    p_user_id: user.id,
                    p_amount: amount,
                    p_description: `Top-up via ${method}`,
                });
                await refresh();
            }
        } catch (err) {
            console.error("Top-up error:", err);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowTopUp(true)}
                className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all duration-200 group ${compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
                    } ${className}`}
            >
                <Coins size={compact ? 12 : 14} className="text-amber-400" />
                <span className="font-bold text-white">
                    {isLoading ? "..." : `€${balance.toFixed(0)}`}
                </span>
                <Plus
                    size={compact ? 10 : 12}
                    className="text-white/40 group-hover:text-emerald-400 transition-colors"
                />
            </button>

            <TopUpModal
                isOpen={showTopUp}
                onClose={() => setShowTopUp(false)}
                onTopUp={handleTopUp}
            />
        </>
    );
}
