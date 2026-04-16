/**
 * GET /api/admin/earnings/download
 *
 * Admin endpoint — Download earnings report as PDF or Excel.
 * Query params:
 *   - format: 'pdf' | 'excel'
 *   - year, month
 *   - creatorId (optional — per-creator or all)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCreatorInvoice } from '@/utils/finance/invoiceService';
import { getPayoutsMonth } from '@/utils/finance/payoutsService';
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

        // Verify admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access only' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const format = searchParams.get('format') || 'pdf';
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const creatorId = searchParams.get('creatorId');

        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

        if (creatorId) {
            // Per-creator report
            const admin = createAdminClient();
            const { data: creatorProfile } = await admin
                .from('profiles')
                .select('username, full_name')
                .eq('id', creatorId)
                .single();

            const invoice = await getCreatorInvoice({ creatorId, year, month });
            const filename = `PlayGroundX_Admin_Earnings_${creatorProfile?.username || 'creator'}_${year}_${month}`;

            if (format === 'excel') {
                const buffer = await generateEarningsExcel(
                    invoice.summary,
                    invoice.lines,
                    {
                        creatorName: creatorProfile?.full_name || creatorProfile?.username,
                        creatorUsername: creatorProfile?.username,
                        creatorId,
                        period: monthName,
                        includeplatformShare: true,
                    }
                );
                return new NextResponse(new Uint8Array(buffer), {
                    headers: {
                        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
                    },
                });
            }

            // PDF
            const doc = new jsPDF();
            doc.setFontSize(22);
            doc.setTextColor(236, 72, 153);
            doc.text('PlayGroundX — Admin Report', 14, 20);

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(`Creator Earnings: ${creatorProfile?.full_name} (@${creatorProfile?.username})`, 14, 30);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Period: ${monthName} | Generated: ${new Date().toLocaleDateString()}`, 14, 38);

            autoTable(doc, {
                startY: 45,
                head: [['Description', 'Amount']],
                body: [
                    ['Gross Collected', `€${invoice.summary.gross_collected.toFixed(2)}`],
                    ['Creator Earned', `€${invoice.summary.creator_earned.toFixed(2)}`],
                    ['Platform Revenue', `€${invoice.summary.platform_earned.toFixed(2)}`],
                    ['Total Events', `${invoice.summary.events_count}`],
                ],
                theme: 'striped',
                headStyles: { fillColor: [0, 0, 0] },
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            autoTable(doc, {
                startY: finalY,
                head: [['Date', 'Type', 'From', 'Gross', 'Creator', 'Platform', 'Split']],
                body: invoice.lines.map((l: any) => [
                    new Date(l.occurred_at).toLocaleDateString(),
                    l.revenue_type,
                    l.fan_username || 'Unknown',
                    `€${l.gross_amount.toFixed(2)}`,
                    `€${l.creator_share.toFixed(2)}`,
                    `€${l.platform_share.toFixed(2)}`,
                    l.split_name || '-',
                ]),
                theme: 'grid',
                headStyles: { fillColor: [236, 72, 153], textColor: [255, 255, 255] },
                styles: { fontSize: 8 },
            });

            const pdfBuffer = new Uint8Array(doc.output('arraybuffer'));
            return new NextResponse(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}.pdf"`,
                },
            });
        }

        // ── All creators consolidated report ──
        const payoutsData = await getPayoutsMonth({ year, month });
        const filename = `PlayGroundX_Admin_AllCreators_${year}_${month}`;

        if (format === 'excel') {
            const summaryData = {
                gross_collected: payoutsData.rows.reduce((a, r) => a + r.gross_collected, 0),
                creator_earned: Number(payoutsData.totals.total_creators_earned),
                platform_earned: Number(payoutsData.totals.total_platform_earned),
                events_count: payoutsData.rows.reduce((a, r) => a + r.events_count, 0),
                last_activity: payoutsData.rows[0]?.last_activity || null,
            };

            const lines = payoutsData.rows.map(r => ({
                occurred_at: r.last_activity,
                revenue_type: 'consolidated',
                room_key: null,
                fan_username: r.username,
                fan_display_name: r.display_name,
                gross_amount: r.gross_collected,
                creator_share: r.creator_earned,
                platform_share: r.platform_earned,
                split_name: `${r.events_count} events`,
            }));

            const buffer = await generateEarningsExcel(summaryData, lines, {
                period: monthName,
                includeplatformShare: true,
            });

            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
                },
            });
        }

        // PDF for all creators
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(22);
        doc.setTextColor(236, 72, 153);
        doc.text('PlayGroundX — All Creators Earnings Report', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Period: ${monthName} | Generated: ${new Date().toLocaleDateString()}`, 14, 28);
        doc.text(`Total Platform Revenue: €${Number(payoutsData.totals.total_platform_earned).toFixed(2)} | Total Creator Payouts: €${Number(payoutsData.totals.total_creators_earned).toFixed(2)}`, 14, 33);

        autoTable(doc, {
            startY: 40,
            head: [['Creator', 'Username', 'Gross', 'Net Payout', 'Platform', 'Events', 'Last Activity', 'Status']],
            body: payoutsData.rows.map(r => [
                r.display_name,
                `@${r.username}`,
                `€${r.gross_collected.toFixed(2)}`,
                `€${r.creator_earned.toFixed(2)}`,
                `€${r.platform_earned.toFixed(2)}`,
                `${r.events_count}`,
                new Date(r.last_activity).toLocaleDateString(),
                r.status,
            ]),
            theme: 'grid',
            headStyles: { fillColor: [236, 72, 153], textColor: [255, 255, 255] },
            styles: { fontSize: 9 },
        });

        const pdfBuffer = new Uint8Array(doc.output('arraybuffer'));
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}.pdf"`,
            },
        });
    } catch (err: any) {
        console.error('Admin download error:', err);
        return NextResponse.json({ error: err.message || 'Download failed' }, { status: 500 });
    }
}
