"use strict";
import React, { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { useAdmin } from "../hooks/useAdmin";

export default function RefundManager() {
    const supabase = createClient();
    const { logAction } = useAdmin();
    const [refunds, setRefunds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRefunds = async () => {
        setLoading(true);
        // Joining with transaction to get amount/user if needed, though schema might vary
        const { data, error } = await supabase
            .from('refunds')
            .select(`
                *,
                transaction:transaction_id (
                    id, amount, currency, user_id
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to fetch refunds");
        } else {
            setRefunds(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRefunds();
    }, []);

    const processRefund = async (id: string, decision: 'approved' | 'declined') => {
        const { error } = await supabase.from('refunds').update({ status: decision }).eq('id', id);

        if (error) {
            toast.error("Action failed");
            return;
        }

        toast.success(`Refund ${decision}`);
        await logAction('PROCESS_REFUND', id, { decision });
        fetchRefunds(); // Refresh to see update
    };

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<CreditCard className="w-4 h-4" />}
                title="Refund Requests"
                sub="Manage disputes and user refund requests."
                right={<NeonButton onClick={fetchRefunds} variant="ghost">Refresh</NeonButton>}
            />

            <div className="mt-4">
                {loading ? (
                    <div className="py-8 text-center text-gray-500 text-sm">Loading refunds...</div>
                ) : (
                    <AdminTable
                        columns={[
                            { key: "id", label: "Request ID", w: "120px" },
                            { key: "reason", label: "Reason" },
                            { key: "amount", label: "Amount", w: "100px", right: true },
                            { key: "status", label: "Status", w: "120px" },
                            { key: "date", label: "Date", w: "140px" },
                            { key: "act", label: "Actions", w: "180px", right: true },
                        ]}
                        rows={refunds.map((r) => ({
                            id: <span className="font-mono text-[10px] text-gray-400">{r.id.slice(0, 8)}</span>,
                            reason: <span className="text-white">{r.reason || "No reason provided"}</span>,
                            amount: <span className="text-cyan-200">${r.transaction?.amount ?? "0.00"}</span>,
                            status: r.status === 'approved' ? <AdminPill tone="green">Approved</AdminPill> :
                                r.status === 'declined' ? <AdminPill tone="red">Declined</AdminPill> :
                                    <AdminPill tone="amber">{r.status}</AdminPill>,
                            date: new Date(r.created_at).toLocaleDateString(),
                            act: (
                                <div className="flex justify-end gap-2">
                                    {r.status === 'requested' || r.status === 'dispute' ? (
                                        <>
                                            <NeonButton onClick={() => processRefund(r.id, 'approved')} variant="pink" className="scale-90">Approve</NeonButton>
                                            <NeonButton onClick={() => processRefund(r.id, 'declined')} variant="ghost" className="scale-90">Decline</NeonButton>
                                        </>
                                    ) : (
                                        <span className="text-[10px] text-gray-500 py-2">Closed</span>
                                    )}
                                </div>
                            )
                        }))}
                    />
                )}
                {!loading && refunds.length === 0 && (
                    <div className="py-8 text-center text-gray-500 text-xs">No refund requests found.</div>
                )}
            </div>
        </NeonCard>
    );
}
