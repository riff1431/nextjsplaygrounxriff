"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Check, X, Eye, Loader2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Image from "next/image";

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
        }
    }
}

export default function PaymentApprovals() {
    const supabase = createClient();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchPendingTransactions = async () => {
        setLoading(true);
        try {
            // Fetch pending transactions with user details (via wallet)
            // Note: This assumes relations are set up. If not, we might need manual joins or fetch.
            // Let's try to fetch transactions and then we might need to fetch user emails if relations aren't perfect in generic Supabase setup
            // For now, simpler query on transactions first.

            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    wallets (
                        user_id
                    )
                `)
                .eq('status', 'pending')
                .eq('payment_method', 'bank')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Enrich with user emails (manual fetch avoid complex joins right now for speed)
            const enriched = await Promise.all(data.map(async (tx: any) => {
                let userName = "Unknown User";
                let userEmail = "";

                if (tx.wallets?.user_id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('email, full_name')
                        .eq('id', tx.wallets.user_id)
                        .single();

                    if (profile) {
                        userName = profile.full_name || "No Name";
                        userEmail = profile.email || tx.wallets.user_id;
                    } else {
                        userEmail = tx.wallets.user_id;
                    }
                }

                return {
                    ...tx,
                    wallet: {
                        user: {
                            full_name: userName,
                            email: userEmail
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
                                        <div className="font-medium text-white">{tx.wallet?.user?.full_name || "Unknown User"}</div>
                                        <div className="text-xs text-gray-500">{tx.wallet?.user?.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-green-400">${tx.amount}</div>
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
