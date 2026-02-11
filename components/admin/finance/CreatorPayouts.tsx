'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Search, ChevronDown, Calendar, Filter, ArrowUpRight, TrendingUp, Download, Mail } from "lucide-react";
import { toast } from "sonner";
import InvoiceDrawer from "./InvoiceDrawer";
import "./Payouts.css";

type CreatorRow = {
    creator_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    gross_collected: number;
    creator_earned: number; // net payout
    platform_earned: number;
    events_count: number;
    last_activity: string;
    status: string;
};

export default function CreatorPayouts() {
    // State
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [rows, setRows] = useState<CreatorRow[]>([]);
    const [totals, setTotals] = useState({ total_creators_earned: "0.00", total_platform_earned: "0.00" });
    const [loading, setLoading] = useState(false);

    // Invoice Drawer
    const [selectedCreator, setSelectedCreator] = useState<CreatorRow | null>(null);
    const [invoiceData, setInvoiceData] = useState<any | null>(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    // Initial Load & Filter change
    useEffect(() => {
        const t = setTimeout(() => {
            fetchPayouts();
        }, 500); // 500ms debounce for everything
        return () => clearTimeout(t);
    }, [year, month, status, search]);

    async function fetchPayouts() {
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            qs.set("year", String(year));
            qs.set("month", String(month));
            if (search) qs.set("search", search);
            if (status !== "All") qs.set("status", status.toLowerCase());

            const res = await fetch(`/api/admin/payouts?${qs.toString()}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to fetch payouts");
            }

            const data = await res.json();
            setRows(data.rows || []);
            setTotals(data.totals || { total_creators_earned: "0.00", total_platform_earned: "0.00" });
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Error loading payouts");
        } finally {
            setLoading(false);
        }
    }

    async function openInvoice(creator: CreatorRow) {
        setSelectedCreator(creator);
        setInvoiceData(null);
        setInvoiceLoading(true);
        try {
            const res = await fetch(`/api/admin/payouts/${creator.creator_id}/invoice?year=${year}&month=${month}`);
            if (!res.ok) throw new Error("Failed to load invoice");
            const data = await res.json();
            setInvoiceData(data);
        } catch (e) {
            console.error(e);
            toast.error("Could not load invoice");
        } finally {
            setInvoiceLoading(false);
        }
    }

    // Handlers
    const handleMonthChange = (offset: number) => {
        let nM = month + offset;
        let nY = year;
        if (nM > 12) { nM = 1; nY++; }
        if (nM < 1) { nM = 12; nY--; }
        setMonth(nM);
        setYear(nY);
    };

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className={`pgx-page ${selectedCreator ? 'with-invoice' : ''}`}>
            <div className="pgx-main">
                {/* Header Stats */}
                <div className="pgx-summary glass neon-pink">
                    <div className="flex flex-col">
                        <span className="text-sm text-[var(--muted)]">Total Creators Payout</span>
                        <span className="text-3xl font-bold text-white mt-1">${Number(totals.total_creators_earned).toLocaleString()}</span>
                    </div>
                    <div className="h-8 w-[1px] bg-[var(--line)]"></div>
                    <div className="flex flex-col">
                        <span className="text-sm text-[var(--muted)]">Platform Revenue</span>
                        <span className="text-xl font-bold text-[var(--cyan)] mt-1">${Number(totals.total_platform_earned).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white">
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="pgx-filters glass">
                    <div className="flex items-center bg-[rgba(0,0,0,0.3)] rounded-lg p-1 border border-[var(--line)]">
                        <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded text-white"><ChevronDown className="rotate-90" size={16} /></button>
                        <span className="px-3 text-sm font-medium text-white min-w-[120px] text-center">{monthName}</span>
                        <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded text-white"><ChevronDown className="-rotate-90" size={16} /></button>
                    </div>

                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search creator..."
                            className="w-full bg-[rgba(0,0,0,0.3)] border border-[var(--line)] rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-[var(--pink)] focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--muted)] uppercase tracking-wider">Status:</span>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="bg-[rgba(0,0,0,0.3)] border border-[var(--line)] rounded px-3 py-1 text-sm text-white focus:outline-none"
                        >
                            <option value="All">All Status</option>
                            <option value="Ready">Ready</option>
                            <option value="Paid">Paid</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className={`pgx-grid ${selectedCreator ? 'with-invoice' : ''}`}>
                    <div className="pgx-table glass">
                        <div className="table-head">
                            <span>Creator</span>
                            <span className="text-right">Gross</span>
                            <span className="text-right text-[var(--pink)]">Net Payout</span>
                            <span className="text-right text-[var(--cyan)]">Platform</span>
                            <span className="text-center">Events</span>
                            <span className="text-right">Last Activity</span>
                            <span className="text-center">Status</span>
                        </div>

                        {loading && <div className="p-8 text-center text-[var(--muted)]">Loading payouts...</div>}

                        {!loading && rows.map(row => (
                            <div
                                key={row.creator_id}
                                className={`tr ${selectedCreator?.creator_id === row.creator_id ? 'selected' : ''}`}
                                onClick={() => openInvoice(row)}
                            >
                                <div className="td gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[var(--bg1)] overflow-hidden">
                                        {row.avatar_url ? <img src={row.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[var(--pink)] flex items-center justify-center text-black font-bold">{row.username[0].toUpperCase()}</div>}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium">{row.display_name}</span>
                                        <span className="text-[var(--muted2)] text-xs">@{row.username}</span>
                                    </div>
                                </div>
                                <div className="td justify-end text-[var(--muted)]">${row.gross_collected.toFixed(2)}</div>
                                <div className="td justify-end font-bold text-[var(--pink)]">${row.creator_earned.toFixed(2)}</div>
                                <div className="td justify-end font-medium text-[var(--cyan)]">${row.platform_earned.toFixed(2)}</div>
                                <div className="td justify-center text-[var(--muted)]">{row.events_count}</div>
                                <div className="td justify-end text-xs text-[var(--muted2)]">{new Date(row.last_activity).toLocaleDateString()}</div>
                                <div className="td justify-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-[rgba(0,255,213,0.1)] text-[var(--cyan)] border border-[rgba(0,255,213,0.2)]">
                                        {row.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Invoice Drawer Overlay */}
                    {selectedCreator && (
                        <InvoiceDrawer
                            creator={selectedCreator}
                            invoice={invoiceData}
                            loading={invoiceLoading}
                            year={year}
                            month={month}
                            onClose={() => setSelectedCreator(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
