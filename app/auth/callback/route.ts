/**
 * Auth Callback Route
 *
 * Handles Supabase auth redirects (email confirmation, password reset, etc.)
 * Exchanges the auth code for a session, then redirects to the target page.
 */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/home';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // If code exchange fails, redirect to login with error
    return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
