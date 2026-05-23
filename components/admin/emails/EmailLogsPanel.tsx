"use client";

import React, { useEffect, useState } from "react";
import { Mail, Search, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";

interface EmailLog {
    id: string;
    user_id: string | null;
    template_id: string;
    to_email: string;
    subject: string;
    status: "sent" | "failed";
    resend_id: string | null;
    created_at: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
    sent: <CheckCircle className="w-3 h-3 text-green-400" />,
    failed: <XCircle className="w-3 h-3 text-red-400" />,
};

const TEMPLATE_COLORS: Record<string, string> = {
    welcome: "text-emerald-400",
    "wallet-deposit-success": "text-green-400",
    "wallet-low-balance": "text-yellow-400",
    "withdrawal-requested": "text-orange-400",
    "withdrawal-approved": "text-green-400",
    "withdrawal-rejected": "text-red-400",
    "account-suspended": "text-amber-400",
    "account-reinstated": "text-emerald-400",
    "account-banned": "text-red-500",
    "account-reported": "text-yellow-400",
    "kyc-approved": "text-green-400",
    "kyc-rejected": "text-red-400",
    "session-earnings": "text-purple-400",
    "new-subscriber": "text-pink-400",
    "password-changed": "text-cyan-400",
};

export default function EmailLogsPanel() {
    const supabase = createClient();
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterTemplate, setFilterTemplate] = useState("");
    const [filterStatus, setFilterStatus] = useState<"" | "sent" | "failed">("");

    const fetchLogs = async () => {
        setLoading(true);
        let q = supabase
            .from("email_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);

        if (filterTemplate) q = q.eq("template_id", filterTemplate);
        if (filterStatus) q = q.eq("status", filterStatus);
        if (searchQuery.trim()) q = q.ilike("to_email", `%${searchQuery.trim()}%`);

        const { data } = await q;
        setLogs(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [filterTemplate, filterStatus]);

    useEffect(() => {
        const timer = setTimeout(fetchLogs, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const uniqueTemplates = [...new Set(logs.map((l) => l.template_id))].sort();
    const sentCount = logs.filter((l) => l.status === "sent").length;
    const failedCount = logs.filter((l) => l.status === "failed").length;

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Mail className="w-4 h-4" />}
                title="Email Logs"
                sub="Track all transactional emails sent from the platform"
            />

            {/* Stats */}
            <div className="mt-4 flex gap-6 text-xs">
                <div className="text-gray-400">
                    Total: <span className="text-white font-medium">{logs.length}</span>
                </div>
                <div className="text-green-400">
                    Sent: <span className="font-medium">{sentCount}</span>
                </div>
                <div className="text-red-400">
                    Failed: <span className="font-medium">{failedCount}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by email..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    value={filterTemplate}
                    onChange={(e) => setFilterTemplate(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none min-w-[160px] appearance-none"
                >
                    <option value="">All Templates</option>
                    {uniqueTemplates.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none min-w-[120px] appearance-none"
                >
                    <option value="">All Status</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                </select>
                <NeonButton variant="ghost" onClick={fetchLogs} className="h-[38px]">
                    <RefreshCw className="w-3.5 h-3.5" />
                </NeonButton>
            </div>

            {/* Table */}
            <div className="mt-4">
                {loading ? (
                    <div className="py-8 text-center text-gray-500 text-sm">Loading email logs...</div>
                ) : logs.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">No emails found</div>
                ) : (
                    <AdminTable
                        columns={[
                            { key: "status", label: "", w: "32px" },
                            { key: "template", label: "Template", w: "160px" },
                            { key: "to", label: "Recipient" },
                            { key: "subject", label: "Subject" },
                            { key: "sent", label: "Sent", w: "140px", right: true },
                        ]}
                        rows={logs.map((log) => ({
                            status: STATUS_ICON[log.status] || <Clock className="w-3 h-3 text-gray-500" />,
                            template: (
                                <span className={`text-xs font-mono font-medium ${TEMPLATE_COLORS[log.template_id] || "text-gray-400"}`}>
                                    {log.template_id}
                                </span>
                            ),
                            to: (
                                <span className="text-sm text-gray-300 truncate max-w-[200px] block">
                                    {log.to_email}
                                </span>
                            ),
                            subject: (
                                <span className="text-sm text-gray-400 truncate max-w-[300px] block">
                                    {log.subject}
                                </span>
                            ),
                            sent: (
                                <span className="text-xs text-gray-500">
                                    {new Date(log.created_at).toLocaleString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            ),
                        }))}
                    />
                )}
            </div>
        </NeonCard>
    );
}
