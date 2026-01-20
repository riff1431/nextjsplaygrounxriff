"use strict";
import React from "react";
import { Flame, Server, Database, Activity } from "lucide-react";
import { NeonCard } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";

export default function SystemMonitoring() {
    function HealthCard({ label, status, latency }: { label: string; status: 'healthy' | 'degraded' | 'down'; latency: string }) {
        const color = status === 'healthy' ? 'green' : status === 'degraded' ? 'amber' : 'red';
        return (
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full bg-${color}-500 shadow-[0_0_8px_currentColor]`} />
                    <span className="text-sm text-gray-200">{label}</span>
                </div>
                <div className="text-xs font-mono text-gray-500">{latency}</div>
            </div>
        );
    }

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Flame className="w-4 h-4" />}
                title="System Health"
                sub="Real-time infrastructure monitoring."
                right={<AdminPill tone="green">All Systems Operational</AdminPill>}
            />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <HealthCard label="API Gateway" status="healthy" latency="24ms" />
                <HealthCard label="Database (Primary)" status="healthy" latency="12ms" />
                <HealthCard label="Storage Bucket" status="healthy" latency="45ms" />
                <HealthCard label="Realtime Cluster" status="healthy" latency="18ms" />
                <HealthCard label="Edge Functions" status="healthy" latency="89ms" />
                <HealthCard label="Auth Service" status="healthy" latency="31ms" />
            </div>

            <div className="mt-6">
                <div className="text-xs text-gray-400 mb-2 font-mono uppercase tracking-wider">System Load</div>
                <div className="h-48 w-full bg-black/40 rounded-xl border border-white/10 relative overflow-hidden flex items-end justify-between px-2 pb-0 pt-10">
                    {/* Fake Chart Bars for visual flair */}
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div
                            key={i}
                            className="w-1.5 bg-cyan-500/20 rounded-t-sm hover:bg-cyan-500/50 transition-colors"
                            style={{ height: `${Math.random() * 80 + 10}%` }}
                        />
                    ))}
                </div>
            </div>
        </NeonCard>
    );
}
