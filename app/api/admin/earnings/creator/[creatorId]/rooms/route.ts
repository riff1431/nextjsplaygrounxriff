/**
 * GET /api/admin/earnings/creator/[creatorId]/rooms
 *
 * Admin endpoint — returns per-room earnings breakdown for a specific creator.
 * Reuses getRoomEarnings() utility — same data shape as the creator's own room view.
 * Query params:
 *   - year (number)
 *   - month (number)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getRoomEarnings } from '@/utils/finance/invoiceService';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ creatorId: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access only' }, { status: 403 });
        }

        const { creatorId } = await context.params;
        if (!creatorId) {
            return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

        const roomEarnings = await getRoomEarnings({ creatorId, year, month });

        return NextResponse.json({ rooms: roomEarnings });
    } catch (err: any) {
        console.error('Admin creator room earnings error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
