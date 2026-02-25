import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/auth/callback', '/privacy'];
const PUBLIC_PREFIXES = ['/shops'];

// Routes that require session but NOT pdpa consent
const ONBOARDING_ROUTES = ['/onboarding/consent'];

// Routes that require session + consent but serve deletion recovery
const RECOVERY_ROUTES = ['/account/recover'];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { user, supabaseResponse } = await updateSession(request);

  // Public routes — pass through
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  // No session — redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  // Check custom claims from JWT
  const appMetadata = user.app_metadata || {};
  const pdpaConsented = appMetadata.pdpa_consented === true;
  const deletionRequested = appMetadata.deletion_requested === true;

  // Onboarding routes — just need session
  if (ONBOARDING_ROUTES.some((r) => pathname.startsWith(r))) {
    return supabaseResponse;
  }

  // Recovery routes — need session, allow even without consent
  if (RECOVERY_ROUTES.some((r) => pathname.startsWith(r))) {
    return supabaseResponse;
  }

  // Deletion pending — redirect to recovery
  if (deletionRequested) {
    const url = request.nextUrl.clone();
    url.pathname = '/account/recover';
    return NextResponse.redirect(url);
  }

  // No PDPA consent — redirect to onboarding
  if (!pdpaConsented) {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding/consent';
    return NextResponse.redirect(url);
  }

  // Authenticated + consented — pass through
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
