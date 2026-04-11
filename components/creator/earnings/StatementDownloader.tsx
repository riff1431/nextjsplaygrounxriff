'use client';

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StatementDownloaderProps {
    /** API base path for download, e.g. '/api/v1/creator/earnings/download' */
    downloadEndpoint: string;
    /** Optional extra query params */
    extraParams?: Record<string, string>;
    /** Summary stats to preview */
    previewStats?: {
        gross?: number;
        earned?: number;
        events?: number;
    };
}

export default function StatementDownloader({
    downloadEndpoint,
    extraParams = {},
    previewStats,
}: StatementDownloaderProps) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);
    const [expanded, setExpanded] = useState(false);

    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Month navigation
    const handleMonthChange = (offset: number) => {
        let nM = month + offset;
        let nY = year;
        if (nM > 12) { nM = 1; nY++; }
        if (nM < 1) { nM = 12; nY--; }
        setMonth(nM);
        setYear(nY);
    };

    const handleDownload = async (format: 'pdf' | 'excel') => {
        setDownloading(format);
        try {
            const qs = new URLSearchParams({
                format,
                year: String(year),
                month: String(month),
                ...extraParams,
            });

            const res = await fetch(`${downloadEndpoint}?${qs.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Download failed' }));
                throw new Error(err.error || 'Download failed');
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `earnings_${year}_${month}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            toast.success(`${format === 'pdf' ? 'PDF' : 'Excel'} statement downloaded!`);
        } catch (err: any) {
            console.error('Download error:', err);
            toast.error(err.message || 'Download failed');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20">
                        <Download className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                        <div className="text-base font-semibold text-white">Download Statement</div>
                        <div className="text-xs text-gray-500 mt-0.5">PDF or Excel format</div>
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
            </button>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                    {/* Month Picker */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Period</span>
                        <div className="flex items-center bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                            <button
                                onClick={() => handleMonthChange(-1)}
                                className="px-3 py-2 hover:bg-white/5 transition text-gray-400"
                            >
                                <ChevronDown className="w-4 h-4 rotate-90" />
                            </button>
                            <span className="px-4 py-2 text-sm text-white font-medium min-w-[130px] text-center">
                                {monthName}
                            </span>
                            <button
                                onClick={() => handleMonthChange(1)}
                                className="px-3 py-2 hover:bg-white/5 transition text-gray-400"
                            >
                                <ChevronDown className="w-4 h-4 -rotate-90" />
                            </button>
                        </div>
                    </div>

                    {/* Preview Stats */}
                    {previewStats && (
                        <div className="grid grid-cols-3 gap-3">
                            {previewStats.earned !== undefined && (
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                                    <div className="text-[10px] text-gray-500 uppercase">Net Earned</div>
                                    <div className="text-sm font-bold text-green-400 mt-1">{fmt(previewStats.earned)}</div>
                                </div>
                            )}
                            {previewStats.gross !== undefined && (
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                                    <div className="text-[10px] text-gray-500 uppercase">Gross</div>
                                    <div className="text-sm font-bold text-white mt-1">{fmt(previewStats.gross)}</div>
                                </div>
                            )}
                            {previewStats.events !== undefined && (
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                                    <div className="text-[10px] text-gray-500 uppercase">Events</div>
                                    <div className="text-sm font-bold text-white mt-1">{previewStats.events}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Download buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleDownload('pdf')}
                            disabled={downloading !== null}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 text-white font-medium text-sm transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {downloading === 'pdf' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileText className="w-4 h-4" />
                            )}
                            PDF
                        </button>
                        <button
                            onClick={() => handleDownload('excel')}
                            disabled={downloading !== null}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {downloading === 'excel' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="w-4 h-4" />
                            )}
                            Excel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
