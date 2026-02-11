import React from 'react';

type InvoiceLine = {
    event_id: string;
    occurred_at: string;
    revenue_type: string;
    room_key?: string;
    gross_amount: number;
    creator_share: number;
    platform_share: number;
    fan_username?: string;
    split_name?: string;
};

type InvoiceSummary = {
    gross_collected: number;
    creator_earned: number;
    platform_earned: number;
    events_count: number;
    last_activity: string;
};

type InvoiceData = {
    summary: InvoiceSummary;
    lines: InvoiceLine[];
};

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InvoiceDrawer({
    invoice,
    creator,
    year,
    month,
    onClose,
    loading
}: {
    invoice: InvoiceData | null,
    creator: any,
    year: number,
    month: number,
    onClose: () => void,
    loading: boolean
}) {
    if (!creator) return null;

    const handleDownloadPDF = () => {
        if (!invoice) return;

        const doc = new jsPDF();
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

        // Header
        doc.setFontSize(22);
        doc.setTextColor(255, 79, 216); // Pink
        doc.text("PlayGroundX", 14, 20);

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("Creator Payout Invoice", 14, 30);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Invoice Period: ${monthName}`, 14, 38);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 43);

        // Creator Details
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`To: ${creator.display_name} (@${creator.username})`, 14, 55);
        doc.text(`Creator ID: ${creator.creator_id}`, 14, 60);

        // Summary Table
        autoTable(doc, {
            startY: 65,
            head: [['Description', 'Amount']],
            body: [
                ['Gross Collected', `$${invoice.summary.gross_collected.toFixed(2)}`],
                ['Platform Fee', `$${invoice.summary.platform_earned.toFixed(2)}`],
                ['Net Payout', `$${invoice.summary.creator_earned.toFixed(2)}`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
            styles: { fontSize: 10 },
        });

        // Line Items
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.text("Line Items", 14, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Date', 'Type', 'From', 'Creator Split', 'Amount']],
            body: invoice.lines.map(line => [
                new Date(line.occurred_at).toLocaleDateString(),
                line.revenue_type.toUpperCase(),
                line.fan_username || 'Unknown',
                `$${line.creator_share.toFixed(2)}`,
                `$${line.gross_amount.toFixed(2)}` // Showing gross here provides context, or maybe show net? Invoice logic implies paying out net.
                // Actually, let's show net to creator in the amount column for clarity 
            ]),
            // Let's refine the columns: Date, Type, Fan, Split %, Net Amount
            // But split % isn't readily available as a number, just split_name.
        });

        // Re-doing the body to be safer
        autoTable(doc, {
            startY: finalY + 5,
            head: [['Date', 'Type', 'From', 'Details', 'Net Amount']],
            body: invoice.lines.map(line => [
                new Date(line.occurred_at).toLocaleDateString(),
                line.revenue_type,
                line.fan_username || 'Unknown',
                line.split_name || '-',
                `$${line.creator_share.toFixed(2)}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [255, 79, 216], textColor: [255, 255, 255] },
            styles: { fontSize: 9 },
        });

        doc.save(`Invoice_${creator.username}_${year}_${month}.pdf`);
    };

    return (
        <div className="pgx-invoice glass neon-blue">
            <div className="flex justify-between items-start mb-6">
                {/* ... existing header ... */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Invoice Details</h2>
                    <div className="text-sm text-[var(--muted)]">For {creator.username}</div>
                </div>
                <button onClick={onClose} className="text-[var(--pink)] hover:text-white">Close</button>
            </div>

            {loading && <div className="p-4 text-center text-[var(--muted)]">Loading invoice data...</div>}

            {!loading && invoice && (
                <>
                    <div className="pgx-summary glass subtle mb-6 flex-col items-start gap-2">
                        {/* ... existing summary ... */}
                        <div className="flex w-full justify-between">
                            <span className="text-xs uppercase tracking-wider text-[var(--muted2)]">Gross</span>
                            <span className="text-white font-mono">${invoice.summary.gross_collected.toFixed(2)}</span>
                        </div>
                        <div className="flex w-full justify-between">
                            <span className="text-xs uppercase tracking-wider text-[var(--muted2)]">Net Payout</span>
                            <span className="text-[var(--cyan)] font-mono text-lg">${invoice.summary.creator_earned.toFixed(2)}</span>
                        </div>
                        <div className="flex w-full justify-between border-t border-[var(--line)] pt-2 mt-2">
                            <span className="text-xs uppercase tracking-wider text-[var(--muted2)]">Platform</span>
                            <span className="text-[var(--pink)] font-mono">${invoice.summary.platform_earned.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Line Items</h3>
                        {invoice.lines.length === 0 && <div className="text-sm text-[var(--muted)]">No items found.</div>}

                        {invoice.lines.map((line) => (
                            <div key={line.event_id} className="p-3 rounded bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-white font-medium">{line.revenue_type}</span>
                                    <span className="text-sm font-mono text-[var(--cyan)]">+${line.creator_share.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-[var(--muted2)]">
                                    <span>{new Date(line.occurred_at).toLocaleDateString()}</span>
                                    <span>from {line.fan_username || 'Unknown'}</span>
                                </div>
                                {line.split_name && (
                                    <div className="mt-1 text-[10px] text-[var(--muted)] bg-[rgba(0,0,0,0.2)] inline-block px-1 rounded">
                                        {line.split_name}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[var(--line)] flex gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            className="flex-1 py-2 px-4 rounded bg-[var(--pink)] text-black font-bold text-sm hover:opacity-90 transition transform active:scale-95"
                        >
                            Download PDF
                        </button>
                        <button className="flex-1 py-2 px-4 rounded bg-[var(--glass)] border border-[var(--line)] text-white text-sm hover:bg-[rgba(255,255,255,0.05)]">
                            Email Invoice
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
