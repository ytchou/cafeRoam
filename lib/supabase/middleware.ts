import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Refresh session -- IMPORTANT: do not remove this
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // getUser() validates the JWT server-side but returns stored app_metadata,
  // which does NOT include custom JWT hook claims (e.g. pdpa_consented).
  // getSession() decodes the JWT locally, exposing hook-injected claims.
  // Merge both so middleware can read custom claims while keeping server validation.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userWithClaims =
    user && session?.user?.app_metadata
      ? {
          ...user,
          app_metadata: {
            ...user.app_metadata,
            ...session.user.app_metadata,
          },
        }
      : user;

  return { supabase, user: userWithClaims, supabaseResponse };
}
