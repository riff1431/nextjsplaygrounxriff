"use strict";
import React, { useEffect, useState } from "react";
import { CreditCard, Search, ChevronDown, Calendar, Wallet, DollarSign, Filter, ArrowUpRight, TrendingUp, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminPill } from "../shared/AdminPill";
import { useAdmin } from "../hooks/useAdmin";

// Mock Data imported from separate file
import { MOCK_PAYOUTS } from "./data";

export default function PayoutManager() {
    const supabase = createClient();
    const { logAction } = useAdmin();
    const [payouts, setPayouts] = useState<any[]>(MOCK_PAYOUTS); // Start with mock data
    const [loading, setLoading] = useState(false);
    const [filterDate, setFilterDate] = useState("April 2024");
    const [filterType, setFilterType] = useState("All");
    const [filterStatus, setFilterStatus] = useState("Ready");

    // Collapsible Logic
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const fetchPayouts = async () => {
        setLoading(true);
        // In real impl, would fetch from Supabase
        // const { data, error } = await supabase...
        console.log("Fetching payouts...");
        await new Promise(r => setTimeout(r, 800)); // Simulate loading
        setPayouts(MOCK_PAYOUTS);
        setLoading(false);
    };

    const toggleExpand = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <NeonCard className="p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30">
                <div className="flex flex-col gap-1">
                    <div className="text-gray-400 text-sm font-medium flex items-center gap-2">
                        Total Creators Earned This Month:
                    </div>
                    <div className="text-4xl font-bold text-white tracking-tight flex items-baseline gap-2">
                        $ 48,250.25
                    </div>
                    <div className="text-cyan-400 text-sm font-medium mt-1">
                        $ 8,520.75 <span className="text-gray-500 font-normal">Platform Revenue</span>
                    </div>
                </div>
            </NeonCard>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                    {/* Date Selector */}
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-black/40 text-gray-300 text-sm hover:bg-white/5 transition whitespace-nowrap">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {filterDate}
                        <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
                    </button>

                    {/* Revenue Type */}
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-black/40 text-gray-300 text-sm hover:bg-white/5 transition whitespace-nowrap">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        Revenue Type: <span className="text-white font-medium">{filterType}</span>
                    </button>

                    {/* Status */}
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-black/40 text-gray-300 text-sm hover:bg-white/5 transition whitespace-nowrap">
                        <Filter className="w-4 h-4 text-gray-400" />
                        Status: <span className="text-white font-medium">{filterStatus}</span>
                        <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search creators..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-white/10 bg-black/40 text-gray-200 text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-gray-600"
                        />
                    </div>
                    {/* Actions */}
                    <button className="p-2 rounded-lg border border-white/10 bg-black/40 text-gray-400 hover:text-white hover:bg-white/5 transition">
                        <Search className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg border border-white/10 bg-black/40 text-gray-400 hover:text-white hover:bg-white/5 transition">
                        <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg border border-white/10 bg-black/40 text-gray-400 hover:text-white hover:bg-white/5 transition">
                        <TrendingUp className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <NeonCard className="overflow-hidden border-white/5 bg-black/40">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-4 font-medium">Creator</th>
                                <th className="px-6 py-4 font-medium text-right">Gross</th>
                                <th className="px-6 py-4 font-medium text-right">Gross (Net)</th>
                                <th className="px-6 py-4 font-medium text-right text-pink-300">Creator Earned</th>
                                <th className="px-6 py-4 font-medium text-right">Platform Earned</th>
                                <th className="px-6 py-4 font-medium text-center">Events</th>
                                <th className="px-6 py-4 font-medium text-right">Last Activity</th>
                                <th className="px-6 py-4 font-medium text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {payouts.map((p) => (
                                <React.Fragment key={p.id}>
                                    <tr
                                        onClick={() => toggleExpand(p.id)}
                                        className="group hover:bg-white/[0.02] transition cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border border-white/10">
                                                        <img src={p.creator.avatar} alt={p.creator.username} className="w-full h-full object-cover" />
                                                    </div>
                                                    {/* Online Indicator if needed */}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium text-sm">{p.creator.name}</div>
                                                    <div className="text-gray-500 text-xs">{p.creator.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-400 text-sm">
                                            ${p.gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-400 text-sm">
                                            ${p.gross_net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-pink-300 text-sm">
                                            ${p.creator_earned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-purple-300 text-sm">
                                            ${p.platform_earned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-400 text-sm">
                                            {p.events}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-500 text-xs">
                                            {p.last_activity}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${p.status === 'ready'
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                    {/* Expanded Details Row */}
                                    {expandedRow === p.id && (
                                        <tr className="bg-white/[0.02]">
                                            <td colSpan={8} className="p-0">
                                                <div className="p-4 bg-gradient-to-b from-black/40 to-black/20 border-t border-white/5">
                                                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 px-2">Recent Transactions</div>
                                                    <div className="space-y-1">
                                                        {/* Mock Transaction Rows */}
                                                        {[1, 2, 3].map((i) => (
                                                            <div key={i} className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-gray-400 border-b border-white/5 last:border-0 hover:bg-white/5 rounded transition">
                                                                <div className="col-span-3">Apr 22, 2024 · Confections</div>
                                                                <div className="col-span-3 flex items-center gap-2">
                                                                    <div className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center text-[8px] text-purple-300 font-bold">J</div>
                                                                    julnvfaank
                                                                </div>
                                                                <div className="col-span-2 text-right text-white">$30.00</div>
                                                                <div className="col-span-2 text-center">85% / 10%</div>
                                                                <div className="col-span-2 text-right flex justify-end gap-4">
                                                                    <span className="text-pink-300">$52.50</span>
                                                                    <span className="text-purple-300">$52.50</span>
                                                                    <span className="text-green-400 font-bold ml-2">Ready</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination / Actions */}
                <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-black/20">
                    <div className="text-xs text-gray-500">
                        1 Collapsed (Example footer text)
                    </div>
                    <NeonButton variant="ghost" className="bg-pink-900/20 border-pink-500/30 text-pink-200 hover:bg-pink-900/40 text-xs py-1 px-3">
                        Collapse All
                    </NeonButton>
                </div>
            </NeonCard>
        </div>
    );
}
