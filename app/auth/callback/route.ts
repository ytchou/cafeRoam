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
    // New email signup: propagate consent from user_metadata → profiles table.
    // Write directly via the server client (already has user session) to avoid a
    // self-referencing HTTP round-trip which can fail behind load balancers.
    // Idempotent: .is('pdpa_consent_at', null) is a no-op if consent is already recorded.
    await supabase
      .from('profiles')
      .update({ pdpa_consent_at: new Date().toISOString() })
      .eq('id', data.user.id)
      .is('pdpa_consent_at', null);
    // Force a token refresh so the new JWT includes pdpa_consented: true from the
    // JWT claim hook. Without this, the just-minted token (from exchangeCodeForSession)
    // still has pdpa_consented: false and middleware would loop back to consent.
    await supabase.auth.refreshSession();
    return NextResponse.redirect(`${origin}${returnTo}`);
  }

  if (!appConsented) {
    const consentUrl = new URL('/onboarding/consent', origin);
    consentUrl.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(consentUrl.toString());
  }

  return NextResponse.redirect(`${origin}${returnTo}`);
}
