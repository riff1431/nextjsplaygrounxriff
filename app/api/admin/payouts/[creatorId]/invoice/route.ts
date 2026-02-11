import { NextRequest, NextResponse } from 'next/server';
import { getCreatorInvoice } from '@/utils/finance/invoiceService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ creatorId: string }> }) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const year = Number(searchParams.get('year'));
        const month = Number(searchParams.get('month'));
        const { creatorId } = await params;

        if (!year || !month || !creatorId) {
            return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }

        const data = await getCreatorInvoice({ creatorId, year, month });
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Invoice API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
