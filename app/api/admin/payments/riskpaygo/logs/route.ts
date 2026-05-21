import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const supabase = await createClient();

    try {
        // 1. Verify Authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify Admin Role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Query the logs table using the service role admin client
        const adminSupabase = createAdminClient();
        const { data: logs, error } = await adminSupabase
            .from('payment_gateway_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('[RiskPayGo Logs API] DB Error fetching logs:', error);
            // If the table doesn't exist, we'll return an empty array with a message so it doesn't break the UI
            if (error.code === '42P01') {
                return NextResponse.json({ 
                    logs: [], 
                    warning: 'The payment_gateway_logs table has not been created yet in Supabase.'
                });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ logs: logs || [] });

    } catch (err: any) {
        console.error('[RiskPayGo Logs API] Fatal Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
