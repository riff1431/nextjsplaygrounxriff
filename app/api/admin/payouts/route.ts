import { NextRequest, NextResponse } from 'next/server';
import { getPayoutsMonth } from '@/utils/finance/payoutsService';

// Add RBAC here if needed, or rely on middleware
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const year = Number(searchParams.get('year'));
        const month = Number(searchParams.get('month'));
        const search = searchParams.get('search') || undefined;
        const revenueTypeCode = searchParams.get('revenueType') || undefined;
        const status = searchParams.get('status') || undefined;
        const sort = (searchParams.get('sort') as any) || undefined;

        if (!year || !month) {
            return NextResponse.json({ error: "Year and Month required" }, { status: 400 });
        }

        const data = await getPayoutsMonth({ year, month, search, revenueTypeCode, status, sort });
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Payouts API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
