"use strict";
import React, { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { useAdmin } from "../hooks/useAdmin";

export default function PayoutManager() {
    const supabase = createClient();
    const { logAction } = useAdmin();
    const [payouts, setPayouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPayouts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('payouts')
            .select('*, creator:profiles(full_name, username)')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to fetch payouts");
        } else {
            setPayouts(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPayouts();
    }, []);

    const markPaid = async (id: string) => {
        const { error } = await supabase.from('payouts').update({ status: 'paid', processed_at: new Date() }).eq('id', id);
        if (error) {
            toast.error("Update failed");
            return;
        }
        toast.success("Marked as paid");
        await logAction('PAYOUT_PAID', id);
        fetchPayouts();
    };

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<CreditCard className="w-4 h-4" />}
                title="Creator Payouts"
                sub="Process and track creator earnings."
                right={<NeonButton onClick={fetchPayouts} variant="ghost">Refresh</NeonButton>}
            />

            <div className="mt-4">
                {loading ? (
                    <div className="py-8 text-center text-gray-500 text-sm">Loading payouts...</div>
                ) : (
                    <AdminTable
                        columns={[
                            { key: "batch", label: "Batch ID", w: "120px" },
                            { key: "creator", label: "Creator" },
                            { key: "amount", label: "Amount", w: "120px", right: true },
                            { key: "status", label: "Status", w: "120px" },
                            { key: "due", label: "Period End", w: "140px" },
                            { key: "act", label: "Actions", w: "140px", right: true },
                        ]}
                        rows={payouts.map((p) => ({
                            batch: <span className="font-mono text-[10px] text-gray-400">{p.id.slice(0, 8)}</span>,
                            creator: <span className="text-white">{p.creator?.full_name || p.creator?.username || "Unknown"}</span>,
                            amount: <span className="text-green-400 font-bold">${p.amount}</span>,
                            status: p.status === 'paid' ? <AdminPill tone="green">Paid</AdminPill> :
                                p.status === 'processing' ? <AdminPill tone="cyan">Processing</AdminPill> :
                                    <AdminPill tone="amber">{p.status}</AdminPill>,
                            due: new Date(p.period_end || p.created_at).toLocaleDateString(),
                            act: (
                                <div className="flex justify-end">
                                    {p.status !== 'paid' && (
                                        <NeonButton onClick={() => markPaid(p.id)} variant="blue" className="scale-90">Mark Paid</NeonButton>
                                    )}
                                </div>
                            )
                        }))}
                    />
                )}
                {!loading && payouts.length === 0 && (
                    <div className="py-8 text-center text-gray-500 text-xs">No pending payouts found.</div>
                )}
            </div>
        </NeonCard>
    );
}
