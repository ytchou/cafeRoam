import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const returnTo = safeReturnTo(searchParams.get('returnTo'));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // JWT claim hook reads from profiles table (app_metadata.pdpa_consented).
  // For new email signups, the user checked consent at signup and stored it in
  // user_metadata. We call POST /auth/consent to write it to profiles so the
  // JWT hook will reflect it on next token mint.
  const appConsented = data.user?.app_metadata?.pdpa_consented === true;
  const userMetaConsented = data.user?.user_metadata?.pdpa_consented === true;

  if (!appConsented && userMetaConsented) {
    // New email signup: propagate consent from user_metadata → profiles table
    const token = data.session?.access_token;
    if (token) {
      await fetch(`${origin}/api/auth/consent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    // Redirect to app — middleware will re-check JWT on next request after token refresh
    return NextResponse.redirect(`${origin}${returnTo}`);
  }

  if (!appConsented) {
    const consentUrl = new URL('/onboarding/consent', origin);
    consentUrl.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(consentUrl.toString());
  }

  return NextResponse.redirect(`${origin}${returnTo}`);
}
