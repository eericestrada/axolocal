import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from app routes
  const isAppRoute = request.nextUrl.pathname.startsWith('/map') ||
    request.nextUrl.pathname.startsWith('/places') ||
    request.nextUrl.pathname.startsWith('/add') ||
    request.nextUrl.pathname.startsWith('/discover') ||
    request.nextUrl.pathname.startsWith('/activity') ||
    request.nextUrl.pathname.startsWith('/profile') ||
    request.nextUrl.pathname.startsWith('/group') ||
    request.nextUrl.pathname.startsWith('/regions');

  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup';

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/map';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
