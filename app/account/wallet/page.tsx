"use client";

import React from "react";
import {
    Wallet, Plus, ArrowUpRight, ArrowDownLeft, History, Clock,
    DollarSign, TrendingUp, ChevronRight, ChevronLeft, RefreshCw, AlertCircle,
    CheckCircle2, XCircle, Loader2, BarChart3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import TopUpModal from "@/components/wallet/TopUpModal";
import WithdrawalModal from "@/components/wallet/WithdrawalModal";
import { useAuth } from "@/app/context/AuthContext";

// ── helpers ──────────────────────────────────────────────────────────────────

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(n);

// ── UI Primitives ─────────────────────────────────────────────────────────────

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cx("rounded-2xl border border-pink-500/20 bg-black/60 backdrop-blur-sm", className)}>
            {children}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
        completed: { label: "Completed", color: "text-green-400 bg-green-500/10 border-green-500/20", icon: <CheckCircle2 className="w-3 h-3" /> },
        pending: { label: "Pending", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: <Clock className="w-3 h-3" /> },
        failed: { label: "Failed", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: <XCircle className="w-3 h-3" /> },
        rejected: { label: "Rejected", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: <XCircle className="w-3 h-3" /> },
    };
    const s = map[status] || map.pending;
    return (
        <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium", s.color)}>
            {s.icon}{s.label}
        </span>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WalletPage() {
    const router = useRouter();
    const supabase = createClient();
    const { role } = useAuth();

    // Core state
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Computed stats
    const [totalSpent, setTotalSpent] = useState<number>(0);
    const [totalDeposited, setTotalDeposited] = useState<number>(0);
    const [pendingAmount, setPendingAmount] = useState<number>(0);

    // Creator earnings ledger (creator only)
    const [earningsLedger, setEarningsLedger] = useState<any>(null);

    // Modals
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [showAllTx, setShowAllTx] = useState(false);

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchWalletData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/auth"); return; }

            // 1. Wallet record
            let { data: wallet } = await supabase
                .from("wallets")
                .select("id, balance, currency")
                .eq("user_id", user.id)
                .maybeSingle();

            if (!wallet) {
                // Auto-create wallet
                const { data: newW } = await supabase
                    .from("wallets")
                    .insert({ user_id: user.id, balance: 0, currency: "EUR" })
                    .select("id, balance, currency")
                    .single();
                wallet = newW;
            }

            // 2. Transactions
            const { data: txs } = await supabase
                .from("transactions")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(200);

            if (txs) {
                setTransactions(txs);

                // Compute stats + available balance from the transaction ledger
                let spent = 0;
                let deposited = 0;
                let credited = 0;
                let pending = 0;

                txs.forEach((tx: any) => {
                    if (tx.status === "completed") {
                        if (tx.type === "debit" || tx.type === "withdrawal" || tx.type === "transfer") {
                            spent += Number(tx.amount);
                        } else if (tx.type === "deposit") {
                            deposited += Number(tx.amount);
                        } else if (tx.type === "credit") {
                            credited += Number(tx.amount);
                        }
                    }
                    if (tx.status === "pending") {
                        pending += Number(tx.amount);
                    }
                });

                // True available balance = all money in − all money out
                const computedBalance = Math.max(0, deposited + credited - spent);

                setTotalSpent(spent);
                setTotalDeposited(deposited);
                setPendingAmount(pending);
                setBalance(computedBalance);

                // Sync wallets.balance if it drifted from reality
                if (wallet && Math.abs(Number(wallet.balance) - computedBalance) > 0.005) {
                    await supabase
                        .from("wallets")
                        .update({ balance: computedBalance })
                        .eq("id", wallet.id);
                }
            } else {
                // No transactions — trust wallets.balance
                setBalance(Number(wallet?.balance ?? 0));
            }

            // 3. Withdrawal requests (creator only)
            if (role === "creator") {
                const { data: wrs } = await supabase
                    .from("withdrawal_requests")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(5);

                if (wrs) setWithdrawalRequests(wrs);

                // 4. Earnings ledger
                const { data: ledger } = await supabase
                    .from("creator_earnings_ledger")
                    .select("*")
                    .eq("creator_id", user.id)
                    .maybeSingle();

                if (ledger) setEarningsLedger(ledger);
            }

        } catch (error) {
            console.error("Error fetching wallet:", error);
            toast.error("Failed to load wallet data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [supabase, router, role]);

    useEffect(() => { fetchWalletData(); }, [fetchWalletData]);

    // Active real-time sync for wallet and earnings
    useEffect(() => {
        const channel = supabase
            .channel("wallet_sync")
            .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, () => fetchWalletData(true))
            .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => fetchWalletData(true))
            .on("postgres_changes", { event: "*", schema: "public", table: "creator_earnings_ledger" }, () => fetchWalletData(true))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [supabase, fetchWalletData]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleAddFunds = async (amount: number, method: string, status: "pending" | "completed" = "completed", proofUrl?: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (status === "completed") {
                // Card/PayPal — use RPC (add_funds creates tx + updates balance)
                const { error } = await supabase.rpc("add_funds", {
                    user_uuid: user.id,
                    amount_val: amount,
                    desc_text: `Top Up via ${method === "card" ? "Credit Card" : "PayPal"}`,
                });
                if (error) throw error;
                toast.success(`+${fmt(amount)} added to your wallet!`);
            } else {
                // Bank transfer — insert pending tx manually
                let wallet = (await supabase.from("wallets").select("id").eq("user_id", user.id).maybeSingle()).data;
                if (!wallet) {
                    const res = await supabase.from("wallets").insert({ user_id: user.id, balance: 0 }).select("id").single();
                    wallet = res.data;
                }
                if (!wallet) throw new Error("Wallet not found");

                const { error } = await supabase.from("transactions").insert({
                    wallet_id: wallet.id,
                    user_id: user.id,
                    amount,
                    type: "deposit",
                    description: "Top Up via Bank Transfer",
                    status: "pending",
                    payment_method: "bank",
                    proof_url: proofUrl,
                    metadata: { user_submitted: true, submitted_at: new Date().toISOString() },
                });
                if (error) throw error;
                toast.success("Bank transfer submitted. Pending admin review.");
            }

            fetchWalletData(true);
        } catch (error: any) {
            toast.error("Failed to process: " + error.message);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────

    const displayedTx = showAllTx ? transactions : transactions.slice(0, 6);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto mb-3" />
                    <div className="text-gray-500 text-sm">Loading wallet...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <TopUpModal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} onTopUp={handleAddFunds} />
            <WithdrawalModal
                isOpen={withdrawModalOpen}
                onClose={() => setWithdrawModalOpen(false)}
                balance={balance}
                onSuccess={() => fetchWalletData(true)}
            />

            <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {role === "creator" && (
                            <Link
                                href="/creator/dashboard"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-pink-500/30 text-gray-400 hover:text-white text-xs font-medium transition-all group"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                                Creator Dashboard
                            </Link>
                        )}
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <div className="p-2 bg-pink-500/10 rounded-xl border border-pink-500/20">
                                <Wallet className="w-5 h-5 text-pink-400" />
                            </div>
                            Wallet
                        </h1>
                    </div>
                    <button
                        onClick={() => fetchWalletData(true)}
                        disabled={refreshing}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={cx("w-4 h-4", refreshing && "animate-spin")} />
                    </button>
                </div>

                {/* ── Balance Hero ── */}
                <div className="relative rounded-3xl overflow-hidden p-8 border border-white/10 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-900 via-black to-blue-900 opacity-80 group-hover:opacity-100 transition duration-700" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full" />

                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className="text-pink-200/80 text-xs font-medium uppercase tracking-widest">
                            {role === "creator" ? "Wallet Balance" : "Total Balance"}
                        </div>
                        <div className="text-5xl md:text-6xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                            {fmt(balance)}
                        </div>
                        <div className="text-xs text-gray-400">EUR · Available for spending</div>

                        <div className="flex flex-wrap gap-3 pt-2 justify-center">
                            <button
                                onClick={() => setIsTopUpOpen(true)}
                                className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" /> Add Funds
                            </button>

                            {role === "creator" ? (
                                <button
                                    onClick={() => setWithdrawModalOpen(true)}
                                    disabled={balance < 10}
                                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                >
                                    <ArrowUpRight className="w-4 h-4" /> Withdraw{balance < 10 ? " (min €10)" : ""}
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-sm font-medium flex items-center gap-2 cursor-not-allowed"
                                >
                                    <ArrowUpRight className="w-4 h-4" /> Withdraw
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Stats Grid ── */}
                <div className="grid grid-cols-3 gap-3">
                    <NeonCard className="p-4 text-center">
                        <div className="flex items-center justify-center text-green-400 mb-2">
                            <ArrowDownLeft className="w-4 h-4 mr-1" />
                            <span className="text-[10px] uppercase tracking-wider">Deposited</span>
                        </div>
                        <div className="text-lg font-bold text-white">{fmt(totalDeposited)}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">All time</div>
                    </NeonCard>
                    <NeonCard className="p-4 text-center">
                        <div className="flex items-center justify-center text-pink-400 mb-2">
                            <ArrowUpRight className="w-4 h-4 mr-1" />
                            <span className="text-[10px] uppercase tracking-wider">Spent</span>
                        </div>
                        <div className="text-lg font-bold text-white">{fmt(totalSpent)}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">All time</div>
                    </NeonCard>
                    <NeonCard className="p-4 text-center">
                        <div className="flex items-center justify-center text-amber-400 mb-2">
                            <Clock className="w-4 h-4 mr-1" />
                            <span className="text-[10px] uppercase tracking-wider">Pending</span>
                        </div>
                        <div className="text-lg font-bold text-white">{fmt(pendingAmount)}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">Awaiting approval</div>
                    </NeonCard>
                </div>

                {/* ── Creator Earnings Card ── */}
                {role === "creator" && (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-pink-500" />
                            Earnings
                        </h2>

                        <Link href="/creator/earnings">
                            <div className="group relative rounded-2xl overflow-hidden border border-pink-500/20 hover:border-pink-500/50 transition-all duration-300 cursor-pointer">
                                <div className="absolute inset-0 bg-gradient-to-br from-pink-950/60 via-black to-purple-950/40" />
                                <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/8 blur-[80px] rounded-full group-hover:bg-pink-500/15 transition-all duration-500" />

                                <div className="relative p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 group-hover:bg-pink-500/20 transition">
                                                <TrendingUp className="w-5 h-5 text-pink-400" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-white">Earnings Dashboard</div>
                                                <div className="text-xs text-gray-500 mt-0.5">Tips · Reactions · Requests · Entry fees</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {earningsLedger ? (
                                                <>
                                                    <div className="text-lg font-bold text-green-400">
                                                        {fmt(Number(earningsLedger.total_earned || 0))}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500">lifetime earned</div>
                                                </>
                                            ) : (
                                                <div className="text-xs text-gray-600">No earnings yet</div>
                                            )}
                                        </div>
                                    </div>

                                    {earningsLedger && (
                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            {[
                                                { label: "Tips", value: earningsLedger.total_tips, icon: "💰" },
                                                { label: "Reactions", value: earningsLedger.total_reactions, icon: "⚡" },
                                                { label: "Per-Min", value: earningsLedger.total_per_min, icon: "⏱️" },
                                            ].map(item => (
                                                <div key={item.label} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                                                    <div className="text-sm">{item.icon}</div>
                                                    <div className="text-xs font-bold text-white mt-0.5">{fmt(Number(item.value || 0))}</div>
                                                    <div className="text-[9px] text-gray-600">{item.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center justify-end gap-1 text-xs text-pink-400 group-hover:text-pink-300 transition">
                                        View full breakdown <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}

                {/* ── Withdrawal Requests (creator) ── */}
                {role === "creator" && withdrawalRequests.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <ArrowUpRight className="w-4 h-4 text-purple-400" />
                            Withdrawal Requests
                        </h2>
                        <div className="space-y-2">
                            {withdrawalRequests.map(wr => (
                                <NeonCard key={wr.id} className="p-4 flex items-center justify-between border-white/[0.06]">
                                    <div>
                                        <div className="text-sm font-medium text-white">{fmt(Number(wr.amount))} via {wr.method.replace("_", " ")}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {formatDistanceToNow(new Date(wr.created_at), { addSuffix: true })}
                                        </div>
                                    </div>
                                    <StatusBadge status={wr.status} />
                                </NeonCard>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Transaction History ── */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                            <History className="w-4 h-4 text-blue-400" />
                            Recent Activity
                        </h2>
                        {transactions.length > 6 && (
                            <button
                                onClick={() => setShowAllTx(!showAllTx)}
                                className="text-xs text-pink-400 hover:text-pink-300 transition"
                            >
                                {showAllTx ? "Show less" : `Show all (${transactions.length})`}
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {transactions.length === 0 ? (
                            <div className="py-12 text-center text-gray-600">
                                <Wallet className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                <div className="text-sm">No transactions yet.</div>
                                <div className="text-xs mt-1">Add funds to get started.</div>
                            </div>
                        ) : (
                            displayedTx.map(tx => {
                                const isIncoming = tx.type === "deposit" || tx.type === "credit";
                                const txIcon = isIncoming
                                    ? <ArrowDownLeft className="w-4 h-4" />
                                    : <ArrowUpRight className="w-4 h-4" />;
                                const txColor = isIncoming ? "bg-green-500/15 text-green-400" : "bg-pink-500/15 text-pink-400";

                                return (
                                    <NeonCard key={tx.id} className="p-4 flex items-center justify-between border-white/[0.05] hover:border-pink-500/20 transition group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`p-2 rounded-full shrink-0 ${txColor}`}>
                                                {txIcon}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-white truncate">
                                                    {tx.description || (isIncoming ? "Deposit" : "Payment")}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-gray-500">
                                                        {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
                                                    </span>
                                                    <StatusBadge status={tx.status || "completed"} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-bold shrink-0 ${isIncoming ? "text-green-400" : "text-white"}`}>
                                            {isIncoming ? "+" : "−"}{fmt(Number(tx.amount))}
                                        </div>
                                    </NeonCard>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Info Banner ── */}
                <div className="p-4 rounded-2xl border border-blue-500/15 bg-blue-500/5 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-400 leading-relaxed">
                        Wallet funds are used for room entry fees, tips, reactions, and other in-platform purchases.
                        {role === "creator" && " As a creator, earnings are tracked separately and can be withdrawn via bank transfer or PayPal."}
                        {" "}Deposits via bank transfer require admin approval (typically 1–2 business days).
                    </div>
                </div>

            </div>
        </div>
    );
}
