"use strict";
import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { NeonCard } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";

export default function AuditLogViewer() {
    const supabase = createClient();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const { data } = await supabase
                .from('audit_logs')
                .select('*, actor:actor_id(username, full_name)')
                .order('created_at', { ascending: false })
                .limit(50);

            setLogs(data || []);
            setLoading(false);
        };
        fetchLogs();
    }, [supabase]);

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Lock className="w-4 h-4" />}
                title="System Audit Logs"
                sub="Immutable record of administrative actions."
            />

            <div className="mt-4">
                {loading ? (
                    <div className="py-8 text-center text-gray-500 text-sm">Loading logs...</div>
                ) : (
                    <AdminTable
                        columns={[
                            { key: "time", label: "Time", w: "160px" },
                            { key: "actor", label: "Actor", w: "150px" },
                            { key: "action", label: "Action", w: "180px" },
                            { key: "target", label: "Target" },
                            { key: "details", label: "Details" },
                        ]}
                        rows={logs.map((L) => ({
                            time: new Date(L.created_at).toLocaleString(),
                            actor: <span className="text-cyan-200">{L.actor?.username || L.actor_id?.slice(0, 8)}</span>,
                            action: <span className="font-bold text-white">{L.action}</span>,
                            target: <span className="font-mono text-[10px] bg-white/5 px-1 py-0.5 rounded">{L.target_resource}</span>,
                            details: <span className="text-[10px] text-gray-400 font-mono truncate max-w-[200px] block">{JSON.stringify(L.details)}</span>
                        }))}
                    />
                )}
            </div>
        </NeonCard>
    );
}
