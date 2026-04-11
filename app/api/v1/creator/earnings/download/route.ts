/**
 * GET /api/v1/creator/earnings/download
 *
 * Generates and streams a PDF or Excel earnings statement for the creator.
 * Query params:
 *   - format: 'pdf' | 'excel'
 *   - year (number)
 *   - month (number)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCreatorInvoice } from '@/utils/finance/invoiceService';
import { generateEarningsExcel } from '@/utils/finance/excelExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify creator role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, username, full_name')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'creator') {
            return NextResponse.json({ error: 'Creator access only' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const format = searchParams.get('format') || 'pdf';
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

        // Fetch invoice data
        const invoice = await getCreatorInvoice({
            creatorId: user.id,
            year,
            month,
        });

        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        const filename = `PlayGroundX_Earnings_${profile.username || 'creator'}_${year}_${month}`;

        if (format === 'excel') {
            // Generate Excel
            const buffer = await generateEarningsExcel(
                invoice.summary,
                invoice.lines,
                {
                    creatorName: profile.full_name || profile.username,
                    creatorUsername: profile.username,
                    creatorId: user.id,
                    period: monthName,
                    generatedAt: new Date().toLocaleDateString(),
                    includeplatformShare: false, // Creator doesn't see platform share
                }
            );

            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
                },
            });
        }

        // Generate PDF (default)
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(236, 72, 153);
        doc.text('PlayGroundX', 14, 20);

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Earnings Statement', 14, 30);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Period: ${monthName}`, 14, 38);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 43);
        doc.text(`Creator: ${profile.full_name || profile.username} (@${profile.username})`, 14, 48);

        // Summary
        autoTable(doc, {
            startY: 55,
            head: [['Description', 'Amount']],
            body: [
                ['Gross Collected', `$${invoice.summary.gross_collected.toFixed(2)}`],
                ['Net Earnings (Your Share)', `$${invoice.summary.creator_earned.toFixed(2)}`],
                ['Total Events', `${invoice.summary.events_count}`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
            styles: { fontSize: 10 },
        });

        // Line Items
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Earnings Details', 14, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Date', 'Type', 'From', 'Amount Earned']],
            body: invoice.lines.map((line: any) => [
                new Date(line.occurred_at).toLocaleDateString(),
                (line.revenue_type || '').replace(/_/g, ' '),
                line.fan_username || 'Unknown',
                `$${line.creator_share.toFixed(2)}`,
            ]),
            theme: 'grid',
            headStyles: { fillColor: [236, 72, 153], textColor: [255, 255, 255] },
            styles: { fontSize: 9 },
        });

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `PlayGroundX — Confidential | Page ${i} of ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        const pdfBuffer = new Uint8Array(doc.output('arraybuffer'));

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}.pdf"`,
            },
        });
    } catch (err: any) {
        console.error('Creator download error:', err);
        return NextResponse.json({ error: err.message || 'Download failed' }, { status: 500 });
    }
}
