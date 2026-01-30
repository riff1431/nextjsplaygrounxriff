import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data: wallets, error: wError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id || '');

    const { data: transactions, error: tError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id || '');

    return NextResponse.json({
        user: user ? { id: user.id, email: user.email } : 'No User',
        wallets,
        transactions,
        errors: { wError, tError }
    });
}
