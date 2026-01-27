import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    let user = null
    try {
        const result = await supabase.auth.getUser()
        user = result.data.user
    } catch (e) {
        // Suppress fetch errors in Edge runtime to avoid log spam
        // console.error("Middleware auth check failed (likely network/edge issue):", e)
    }

    // ROUTE PROTECTION LOGIC
    const path = request.nextUrl.pathname;

    // 1. Admin Protection
    if (path.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/auth', request.url));
        }
        // Check role in metadata (set during signup)
        const role = user.user_metadata?.role;
        if (role !== 'admin') {
            return NextResponse.redirect(new URL('/home', request.url));
        }
    }

    // 2. Creator Protection
    if (path.startsWith('/creator')) {
        if (!user) {
            return NextResponse.redirect(new URL('/auth', request.url));
        }
        const role = user.user_metadata?.role;
        if (role !== 'creator' && role !== 'admin') { // Admins can probably see creator backend too?
            return NextResponse.redirect(new URL('/home', request.url));
        }
    }

    // 3. Redirect /auth pages if already logged in
    if (path.startsWith('/auth') && user) {
        return NextResponse.redirect(new URL('/home', request.url));
    }

    return response
}
