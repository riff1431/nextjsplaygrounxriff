/**
 * GET /api/v1/creator/earnings/rooms
 *
 * Returns earnings broken down by room for the authenticated creator.
 * Query params:
 *   - year (number)
 *   - month (number)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getRoomEarnings } from '@/utils/finance/invoiceService';

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
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'creator') {
            return NextResponse.json({ error: 'Creator access only' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

        const roomEarnings = await getRoomEarnings({
            creatorId: user.id,
            year,
            month,
        });

        return NextResponse.json({ rooms: roomEarnings });
    } catch (err: any) {
        console.error('Room earnings API error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
