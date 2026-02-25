import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const returnTo = searchParams.get('returnTo') ?? '/';

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed`
    );
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed`
    );
  }

  const pdpaConsented = data.user?.app_metadata?.pdpa_consented === true
    || data.user?.user_metadata?.pdpa_consented === true;

  if (!pdpaConsented) {
    const consentUrl = new URL('/onboarding/consent', origin);
    consentUrl.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(consentUrl.toString());
  }

  return NextResponse.redirect(`${origin}${returnTo}`);
}
