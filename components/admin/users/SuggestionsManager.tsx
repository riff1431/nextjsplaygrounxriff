"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { MessageSquare, RefreshCw, CheckCircle, Clock, Search, X } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminTable, AdminSectionTitle } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";

interface Suggestion {
    id: string;
    content: string;
    status: string;
    created_at: string;
    profiles: {
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
        role: string | null;
    } | null;
}

export default function SuggestionsManager() {
    const supabase = createClient();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "reviewed">("all");
    const [search, setSearch] = useState("");

    const fetchSuggestions = async () => {
        setLoading(true);
        // Admin user can query platform_suggestions directly because of RLS policy
        let query = supabase
            .from("platform_suggestions")
            .select(`
                id, content, status, created_at,
                profiles:user_id(username, full_name, avatar_url, role)
            `)
            .order("created_at", { ascending: false });

        if (filterStatus !== "all") {
            query = query.eq("status", filterStatus);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching suggestions:", error);
        } else {
            setSuggestions(data as any || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSuggestions();
    }, [filterStatus]);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from("platform_suggestions")
            .update({ status: newStatus })
            .eq("id", id);
            
        if (!error) {
            setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
        } else {
            console.error("Failed to update status", error);
        }
    };

    const displayData = suggestions.filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            s.content.toLowerCase().includes(q) ||
            s.profiles?.username?.toLowerCase().includes(q) ||
            s.profiles?.full_name?.toLowerCase().includes(q)
        );
    });

    const columns = [
        { key: "user", label: "USER", w: "2fr" },
        { key: "role", label: "ROLE", w: "1fr" },
        { key: "suggestion", label: "SUGGESTION", w: "4fr" },
        { key: "status", label: "STATUS", w: "1.5fr" },
        { key: "actions", label: "ACTIONS", w: "1.5fr", right: true },
    ];

    const rows = displayData.map((s) => ({
        user: (
            <div className="flex items-center gap-3 py-1">
                {s.profiles?.avatar_url ? (
                    <img src={s.profiles.avatar_url} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20" />
                )}
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-200">{s.profiles?.full_name || 'Anonymous'}</span>
                    <span className="text-[10px] text-gray-500">@{s.profiles?.username || 'unknown'}</span>
                </div>
            </div>
        ),
        role: (
            <AdminPill tone={s.profiles?.role === 'creator' ? 'pink' : 'cyan'}>
                {s.profiles?.role || 'user'}
            </AdminPill>
        ),
        suggestion: (
            <div className="group">
                <div className="text-sm text-white/80 max-w-lg break-words whitespace-pre-wrap line-clamp-2 group-hover:line-clamp-none transition-all">
                    {s.content}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                    Submitted {new Date(s.created_at).toLocaleDateString()}
                </div>
            </div>
        ),
        status: (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                s.status === 'pending'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : s.status === 'reviewed'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-white/5 text-white/50 border-white/10'
            }`}>
                {s.status === 'pending' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                {s.status}
            </div>
        ),
        actions: s.status === 'pending' ? (
                <div className="flex justify-end">
                    <button 
                        onClick={() => handleStatusUpdate(s.id, 'reviewed')}
                        className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition whitespace-nowrap"
                    >
                        Mark Reviewed
                    </button>
                </div>
            ) : null
    }));

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<MessageSquare className="w-5 h-5 text-emerald-400" />}
                title="Platform Suggestions"
                sub="Review user feedback carefully. Good ideas make the platform better."
                right={
                    <NeonButton variant="blue" onClick={fetchSuggestions} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </NeonButton>
                }
            />

            <div className="mt-6 flex flex-col md:flex-row gap-4 items-center justify-between bg-black/40 border border-white/5 p-3 rounded-2xl">
                <div className="flex bg-black/50 p-1 rounded-xl border border-white/10 w-full md:w-auto">
                    {(["all", "pending", "reviewed"] as const).map((statusKey) => (
                        <button
                            key={statusKey}
                            onClick={() => setFilterStatus(statusKey)}
                            className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition ${
                                filterStatus === statusKey 
                                    ? "bg-white/10 text-white" 
                                    : "text-white/40 hover:text-white/70"
                            }`}
                        >
                            {statusKey}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search text or user..."
                        className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-3.5 h-3.5 text-white/40 hover:text-white" />
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-6">
                {loading && displayData.length === 0 ? (
                    <div className="py-12 text-center text-white/40 text-sm">Loading suggestions...</div>
                ) : displayData.length === 0 ? (
                    <div className="py-12 text-center text-white/40 text-sm">No suggestions found.</div>
                ) : (
                    <AdminTable columns={columns} rows={rows} />
                )}
            </div>
        </NeonCard>
    );
}
