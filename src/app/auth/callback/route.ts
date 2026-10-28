import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const isLocalEnv = process.env.NODE_ENV === 'development';

  let redirectBase = origin;
  if (!isLocalEnv && forwardedHost) {
    redirectBase = `${forwardedProto}://${forwardedHost}`;
  } else if (!isLocalEnv && process.env.NEXT_PUBLIC_SITE_URL) {
    redirectBase = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${redirectBase}${next}`);
      }
    }
  }

  // Return user to login if oauth code exchange fails
  return NextResponse.redirect(`${redirectBase}/login?error=oauth_failed`);
}

