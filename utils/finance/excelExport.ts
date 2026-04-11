/**
 * Excel Export Utility
 *
 * Generates branded .xlsx files for creator earnings statements.
 * Works server-side (Node) using exceljs.
 */
import ExcelJS from 'exceljs';

export interface ExcelLineItem {
    occurred_at: string;
    revenue_type: string;
    room_key?: string | null;
    fan_username?: string;
    fan_display_name?: string;
    gross_amount: number;
    creator_share: number;
    platform_share: number;
    split_name?: string;
    currency?: string;
}

export interface ExcelSummary {
    gross_collected: number;
    creator_earned: number;
    platform_earned: number;
    events_count: number;
    last_activity: string | null;
}

export interface ExcelExportOptions {
    creatorName?: string;
    creatorUsername?: string;
    creatorId?: string;
    period: string; // e.g. "April 2026"
    generatedAt?: string;
    /** Admin mode: include platform share column */
    includeplatformShare?: boolean;
}

/**
 * Generate an earnings Excel workbook and return it as a Buffer.
 */
export async function generateEarningsExcel(
    summary: ExcelSummary,
    lines: ExcelLineItem[],
    options: ExcelExportOptions
): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'PlayGroundX';
    wb.created = new Date();

    // ── Colors ──
    const PINK = 'FFEC4899';
    const DARK_BG = 'FF111111';
    const HEADER_BG = 'FF1A1A2E';
    const WHITE = 'FFFFFFFF';
    const CYAN = 'FF00FFD5';
    const MUTED = 'FF999999';

    // ═══════════════════════════════════════
    //  Sheet 1: Summary
    // ═══════════════════════════════════════
    const summarySheet = wb.addWorksheet('Summary', {
        properties: { tabColor: { argb: PINK } },
    });

    // Title
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'PlayGroundX — Earnings Statement';
    titleCell.font = { bold: true, size: 18, color: { argb: PINK } };
    titleCell.alignment = { horizontal: 'left' };

    // Period
    summarySheet.mergeCells('A2:D2');
    const periodCell = summarySheet.getCell('A2');
    periodCell.value = `Period: ${options.period}`;
    periodCell.font = { size: 11, color: { argb: MUTED } };

    // Creator info
    if (options.creatorName) {
        summarySheet.mergeCells('A3:D3');
        const creatorCell = summarySheet.getCell('A3');
        creatorCell.value = `Creator: ${options.creatorName} (@${options.creatorUsername || ''})`;
        creatorCell.font = { size: 11, color: { argb: WHITE } };
    }

    // Generated
    summarySheet.mergeCells('A4:D4');
    const genCell = summarySheet.getCell('A4');
    genCell.value = `Generated: ${options.generatedAt || new Date().toLocaleDateString()}`;
    genCell.font = { size: 10, color: { argb: MUTED } };

    // Summary Table
    const summaryStartRow = 6;
    const summaryHeaders = ['Description', 'Amount'];
    const headerRow = summarySheet.getRow(summaryStartRow);
    headerRow.values = summaryHeaders;
    headerRow.font = { bold: true, color: { argb: WHITE } };
    headerRow.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
        c.border = { bottom: { style: 'thin', color: { argb: PINK } } };
    });

    const summaryData = [
        ['Gross Collected', summary.gross_collected],
        ['Creator Earned (Net)', summary.creator_earned],
        ['Platform Fee', summary.platform_earned],
        ['Total Events', summary.events_count],
    ];

    summaryData.forEach((row, i) => {
        const r = summarySheet.getRow(summaryStartRow + 1 + i);
        r.values = [row[0], typeof row[1] === 'number' ? `$${(row[1] as number).toFixed(2)}` : row[1]];
        r.font = { color: { argb: WHITE } };
    });

    // Highlight net payout row
    const netRow = summarySheet.getRow(summaryStartRow + 2);
    netRow.font = { bold: true, color: { argb: CYAN }, size: 12 };

    summarySheet.columns = [
        { width: 30 },
        { width: 20 },
    ];

    // ═══════════════════════════════════════
    //  Sheet 2: Line Items
    // ═══════════════════════════════════════
    const itemsSheet = wb.addWorksheet('Line Items', {
        properties: { tabColor: { argb: CYAN } },
    });

    const colHeaders = ['Date', 'Type', 'Room', 'From', 'Gross Amount', 'Creator Share'];
    if (options.includeplatformShare) colHeaders.push('Platform Share');
    colHeaders.push('Split Profile');

    const itemHeaderRow = itemsSheet.getRow(1);
    itemHeaderRow.values = colHeaders;
    itemHeaderRow.font = { bold: true, color: { argb: WHITE } };
    itemHeaderRow.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
        c.border = { bottom: { style: 'thin', color: { argb: PINK } } };
    });

    lines.forEach((line, i) => {
        const vals: (string | number)[] = [
            new Date(line.occurred_at).toLocaleDateString(),
            (line.revenue_type || '').replace(/_/g, ' ').toUpperCase(),
            line.room_key || '-',
            line.fan_username || 'Unknown',
            `$${line.gross_amount.toFixed(2)}`,
            `$${line.creator_share.toFixed(2)}`,
        ];
        if (options.includeplatformShare) vals.push(`$${line.platform_share.toFixed(2)}`);
        vals.push(line.split_name || '-');

        const row = itemsSheet.getRow(i + 2);
        row.values = vals;
        row.font = { color: { argb: WHITE } };
    });

    // Column widths
    itemsSheet.columns = [
        { width: 14 },
        { width: 22 },
        { width: 18 },
        { width: 16 },
        { width: 14 },
        { width: 14 },
        ...(options.includeplatformShare ? [{ width: 14 }] : []),
        { width: 20 },
    ];

    // Generate buffer
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
