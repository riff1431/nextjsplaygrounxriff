"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Check, X, Eye, Loader2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Image from "next/image";
import { useCurrency } from "@/app/context/CurrencyContext";

interface Transaction {
    id: string;
    amount: number;
    description: string;
    created_at: string;
    status: string;
    proof_url: string | null;
    payment_method: string;
    metadata: any;
    wallet: {
        user: {
            email: string;
            full_name: string;
            username?: string;
            avatar_url?: string | null;
        }
    }
}

export default function PaymentApprovals() {
    const supabase = createClient();
    const { formatPrice } = useCurrency();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchPendingTransactions = async () => {
        setLoading(true);
        try {
            // Fetch pending bank transactions using the direct user_id
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('status', 'pending')
                .eq('payment_method', 'bank')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Enrich with user emails and names from profiles table using direct user_id
            const enriched = await Promise.all(data.map(async (tx: any) => {
                let userName = "Unknown User";
                let userEmail = "";
                let userUsername = "";
                let userAvatarUrl = null;

                const targetUserId = tx.user_id;

                if (targetUserId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, username, avatar_url, role')
                        .eq('id', targetUserId)
                        .single();

                    if (profile) {
                        userName = profile.full_name || "No Name";
                        userEmail = profile.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) : "User";
                        userUsername = profile.username || "";
                        userAvatarUrl = profile.avatar_url || null;
                    } else {
                        userEmail = "User";
                    }
                }

                return {
                    ...tx,
                    wallet: {
                        user: {
                            full_name: userName,
                            email: userEmail,
                            username: userUsername,
                            avatar_url: userAvatarUrl
                        }
                    }
                };
            }));

            setTransactions(enriched);
        } catch (error: any) {
            toast.error("Failed to fetch payments: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingTransactions();
    }, []);

    const handleApprove = async (txId: string) => {
        if (!confirm("Are you sure you want to approve this transaction? This will add funds to the user's wallet.")) return;

        setProcessingId(txId);
        try {
            const { error } = await supabase.rpc('approve_transaction', { transaction_id: txId });
            if (error) throw error;

            toast.success("Transaction approved successfully!");
            setTransactions(prev => prev.filter(t => t.id !== txId));
        } catch (error: any) {
            toast.error("Approval failed: " + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (txId: string) => {
        if (!confirm("Reject this transaction?")) return;

        setProcessingId(txId);
        try {
            const { error } = await supabase
                .from('transactions')
                .update({ status: 'rejected' })
                .eq('id', txId);

            if (error) throw error;

            toast.info("Transaction rejected.");
            setTransactions(prev => prev.filter(t => t.id !== txId));
        } catch (error: any) {
            toast.error("Reject failed: " + error.message);
        } finally {
            setProcessingId(null);
        }
    };



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Payment Approvals</h2>
                    <p className="text-sm text-gray-400">Review and approve offline bank transfers</p>
                </div>
                <button onClick={fetchPendingTransactions} className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-sm border border-white/10 transition">
                    Refresh List
                </button>
            </div>

            <div className="border border-pink-500/20 rounded-2xl overflow-hidden bg-black/40">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4">User</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4 text-center">Proof</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading requests...</td></tr>
                        ) : transactions.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No pending payments found.</td></tr>
                        ) : (
                            transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/5 transition">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {tx.wallet?.user?.avatar_url ? (
                                                <img
                                                    src={tx.wallet.user.avatar_url}
                                                    alt={tx.wallet.user.full_name}
                                                    className="w-10 h-10 rounded-full border border-pink-500/25 object-cover shrink-0"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-extrabold text-xs shrink-0 border border-pink-500/25">
                                                    {(tx.wallet?.user?.full_name || "U")[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="font-bold text-white truncate flex items-center gap-1.5">
                                                    {tx.wallet?.user?.full_name || "Unknown User"}
                                                    {tx.wallet?.user?.username && (
                                                        <span className="text-[10px] text-pink-400 font-semibold bg-pink-500/10 px-1.5 py-0.5 rounded-md border border-pink-500/15">
                                                            @{tx.wallet.user.username}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-gray-500 truncate">{tx.wallet?.user?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-green-400">{formatPrice(tx.amount)}</div>
                                        <div className="text-xs text-gray-500">{tx.payment_method}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        {tx.proof_url ? (
                                            <a
                                                href={tx.proof_url || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20"
                                            >
                                                <Eye className="w-3 h-3" /> View Proof
                                            </a>
                                        ) : (
                                            <span className="text-gray-600 text-xs italic">No proof attached</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">
                                        {format(new Date(tx.created_at), 'MMM d, p')}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleReject(tx.id)}
                                                disabled={processingId === tx.id}
                                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50"
                                                title="Reject"
                                            >
                                                {processingId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleApprove(tx.id)}
                                                disabled={processingId === tx.id}
                                                className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 disabled:opacity-50"
                                                title="Approve"
                                            >
                                                {processingId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
