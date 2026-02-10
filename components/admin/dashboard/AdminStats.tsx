"use strict";
import React, { useEffect, useState } from "react";
import { Users, CreditCard, Bell, TrendingUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { NeonCard } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";

export default function AdminStats() {
    const supabase = createClient();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalRevenue: 0,
        pendingReports: 0,
        activeCreators: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            // 1. Total Users
            const { count: usersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // 2. Total Revenue (sum of all 'charge' transactions)
            const { data: transactions } = await supabase
                .from('transactions')
                .select('amount')
                .eq('type', 'charge')
                .eq('status', 'succeeded');

            const revenue = transactions?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

            // 3. Pending Reports
            const { count: reportsCount } = await supabase
                .from('reports')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'open');

            // 4. Active Creators
            const { count: creatorsCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'creator');

            setStats({
                totalUsers: usersCount || 0,
                totalRevenue: revenue,
                pendingReports: reportsCount || 0,
                activeCreators: creatorsCount || 0
            });
            setLoading(false);
        };

        fetchStats();
    }, []);

    function StatCard({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: "cyan" | "green" | "amber" | "red" }) {
        const colors = {
            cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
            green: "text-green-400 bg-green-400/10 border-green-400/20",
            amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
            red: "text-red-400 bg-red-400/10 border-red-400/20",
        };

        return (
            <div className={`rounded-xl border p-4 ${colors[tone]}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider font-semibold opacity-80">{label}</span>
                    {icon}
                </div>
                <div className="text-2xl font-bold">{loading ? "..." : value}</div>
            </div>
        );
    }

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<TrendingUp className="w-4 h-4" />}
                title="Platform Overview"
                sub="Live metrics from across the system."
            />

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Users"
                    value={stats.totalUsers.toLocaleString()}
                    icon={<Users className="w-5 h-5" />}
                    tone="cyan"
                />
                <StatCard
                    label="Total Revenue"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    icon={<CreditCard className="w-5 h-5" />}
                    tone="green"
                />
                <StatCard
                    label="Active Creators"
                    value={stats.activeCreators.toLocaleString()}
                    icon={<Users className="w-5 h-5" />}
                    tone="amber"
                />
                <StatCard
                    label="Pending Reports"
                    value={stats.pendingReports}
                    icon={<Bell className="w-5 h-5" />}
                    tone="red"
                />
            </div>
        </NeonCard>
    );
}
