"use strict";
import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { useAdmin } from "../hooks/useAdmin";

export default function UserManagement() {
    const supabase = createClient();
    const { logAction } = useAdmin();
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Debounced search
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);

            if (query.trim()) {
                const term = query.trim();
                q = q.or(`username.ilike.%${term}%,full_name.ilike.%${term}%,id.eq.${term}`);
            }

            const { data, error } = await q;
            if (error) {
                toast.error("Failed to fetch users");
            } else {
                setUsers(data || []);
            }
            setLoading(false);
        };

        const timer = setTimeout(fetchUsers, 500);
        return () => clearTimeout(timer);
    }, [query, supabase]);

    const toggleStatus = async (userId: string, currentStatus: string | null) => {
        // 'Restricted' vs 'Active' (or null)
        const newStatus = currentStatus === "Restricted" ? "Active" : "Restricted";

        const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);

        if (error) {
            toast.error("Update failed");
            return;
        }

        toast.success(`User ${newStatus === 'Restricted' ? 'restricted' : 'activated'}`);
        await logAction('UPDATE_USER_STATUS', userId, { from: currentStatus, to: newStatus });

        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    };

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Users className="w-4 h-4" />}
                title="User Management"
                sub="Search and manage user access."
            />

            <div className="mt-4 flex items-center gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by id, name, username..."
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 transition-colors"
                />
                <NeonButton variant="ghost" onClick={() => setQuery("")}>Clear</NeonButton>
            </div>

            <div className="mt-4">
                {loading ? (
                    <div className="py-8 text-center text-gray-500 text-sm">Loading users...</div>
                ) : (
                    <AdminTable
                        columns={[
                            { key: "info", label: "User Info" },
                            { key: "role", label: "Role", w: "120px" },
                            { key: "status", label: "Status", w: "120px" },
                            { key: "joined", label: "Joined", w: "140px" },
                            { key: "act", label: "Actions", w: "120px", right: true },
                        ]}
                        rows={users.map((u) => ({
                            info: (
                                <div>
                                    <div className="text-white font-medium">{u.full_name || "Unknown"}</div>
                                    <div className="text-[10px] text-gray-400">@{u.username} • {u.id.slice(0, 8)}...</div>
                                </div>
                            ),
                            role: <AdminPill tone={u.role === "creator" ? "pink" : "cyan"}>{u.role || "fan"}</AdminPill>,
                            status: u.status === "Restricted" ? <AdminPill tone="red">Restricted</AdminPill> : <AdminPill tone="green">Active</AdminPill>,
                            joined: new Date(u.created_at).toLocaleDateString(),
                            act: (
                                <NeonButton
                                    variant={u.status === "Restricted" ? "blue" : "pink"}
                                    onClick={() => toggleStatus(u.id, u.status)}
                                    className="scale-90"
                                >
                                    {u.status === "Restricted" ? "Lift" : "Restrict"}
                                </NeonButton>
                            ),
                        }))}
                    />
                )}
            </div>
        </NeonCard>
    );
}
