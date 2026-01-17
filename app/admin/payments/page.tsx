"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { Check, X, Loader2, DollarSign, Calendar, User } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsPage() {
    const [pendingTxs, setPendingTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                wallet:wallets (
                    user:profiles (
                        username,
                        email,
                        avatar_url
                    )
                )
            `)
            .eq('status', 'pending')
            .eq('type', 'deposit')
            .order('created_at', { ascending: false });

        if (data) setPendingTxs(data);
        setLoading(false);
    };

    const handleApprove = async (id: string, amount: number) => {
        setProcessing(id);
        try {
            const { error } = await supabase.rpc('approve_transaction', { tx_id: id });
            if (error) throw error;
            toast.success(`Approved deposit of $${amount}`);
            fetchPending();
        } catch (error: any) {
            toast.error("Failed to approve: " + error.message);
        } finally {
            setProcessing(null);
        }
    };

    const handleDecline = async (id: string) => {
        setProcessing(id);
        try {
            const { error } = await supabase.rpc('decline_transaction', { tx_id: id });
            if (error) throw error;
            toast.warning("Transaction declined");
            fetchPending();
        } catch (error: any) {
            toast.error("Failed to decline: " + error.message);
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-blue-500">
                        Payment Requests
                    </h1>
                    <button onClick={fetchPending} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition">
                        Refresh
                    </button>
                </div>

                <div className="grid gap-4">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-500" /></div>
                    ) : pendingTxs.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 text-gray-400">
                            No pending payment requests
                        </div>
                    ) : (
                        pendingTxs.map((tx) => (
                            <div key={tx.id} className="relative group bg-zinc-900/50 border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-pink-500/30 transition-all">
                                {/* User Info */}
                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                                        {tx.wallet?.user?.avatar_url && (
                                            <img src={tx.wallet.user.avatar_url} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {tx.wallet?.user?.username || "Unknown"}
                                            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/30">Pending</span>
                                        </div>
                                        <div className="text-xs text-gray-400">{tx.wallet?.user?.email}</div>
                                    </div>
                                </div>

                                {/* Transaction Details */}
                                <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                    <div className="space-y-1">
                                        <div className="text-gray-500 flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Amount</div>
                                        <div className="font-mono text-lg text-green-400 font-bold">${tx.amount}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-gray-500 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Date</div>
                                        <div className="text-gray-300">{format(new Date(tx.created_at), 'MMM dd, p')}</div>
                                    </div>
                                    <div className="space-y-1 col-span-2 lg:col-span-1">
                                        <div className="text-gray-500">Reference / Method</div>
                                        <div className="text-gray-300 italic truncate max-w-[200px]" title={tx.description}>{tx.description}</div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => handleDecline(tx.id)}
                                        disabled={!!processing}
                                        className="flex-1 md:flex-none px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => handleApprove(tx.id, tx.amount)}
                                        disabled={!!processing}
                                        className="flex-1 md:flex-none px-6 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)] transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {processing === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Approve
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
