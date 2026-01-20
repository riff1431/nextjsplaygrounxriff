"use strict";
import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { useAdmin } from "../hooks/useAdmin";

export default function ModerationQueue() {
    const supabase = createClient();
    const { logAction } = useAdmin();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('status', 'open') // Only show open by default
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to fetch reports");
        } else {
            setReports(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const resolveReport = async (id: string, action: 'resolved' | 'dismissed') => {
        const { error } = await supabase.from('reports').update({ status: action }).eq('id', id);

        if (error) {
            toast.error("Action failed");
            return;
        }

        toast.success(`Report ${action}`);
        await logAction('MODERATION_ACTION', id, { decision: action });
        fetchReports();
    };

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Bell className="w-4 h-4" />}
                title="Moderation Queue"
                sub="Review user reports and safety flags."
                right={<NeonButton onClick={fetchReports} variant="ghost">Refresh</NeonButton>}
            />

            <div className="mt-4">
                {loading ? (
                    <div className="py-8 text-center text-gray-500 text-sm">Loading queue...</div>
                ) : (
                    <AdminTable
                        columns={[
                            { key: "id", label: "Report ID", w: "120px" },
                            { key: "sev", label: "Severity", w: "100px" },
                            { key: "type", label: "Reason" },
                            { key: "target", label: "Target" },
                            { key: "time", label: "Time", w: "140px" },
                            { key: "act", label: "Actions", w: "180px", right: true },
                        ]}
                        rows={reports.map((r) => ({
                            id: <span className="font-mono text-[10px] text-gray-400">{r.id.slice(0, 8)}</span>,
                            sev: r.severity === 'critical' ? <AdminPill tone="red">Critical</AdminPill> :
                                r.severity === 'high' ? <AdminPill tone="amber">High</AdminPill> :
                                    <AdminPill tone="cyan">Low</AdminPill>,
                            type: <span className="text-white font-medium">{r.reason}</span>,
                            target: <span className="font-mono text-xs text-cyan-200">{r.target_id?.slice(0, 8)}...</span>,
                            time: new Date(r.created_at).toLocaleString(),
                            act: (
                                <div className="flex justify-end gap-2">
                                    <NeonButton onClick={() => resolveReport(r.id, 'resolved')} variant="pink" className="scale-90">Resolve</NeonButton>
                                    <NeonButton onClick={() => resolveReport(r.id, 'dismissed')} variant="ghost" className="scale-90">Dismiss</NeonButton>
                                </div>
                            )
                        }))}
                    />
                )}
                {!loading && reports.length === 0 && (
                    <div className="py-8 text-center text-gray-500 text-xs">All caught up! No pending reports.</div>
                )}
            </div>
        </NeonCard>
    );
}
