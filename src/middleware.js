import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sw.js, manifest.json, icons (PWA files)
     * - api routes that don't need auth
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icons).*)',
  ],
};
