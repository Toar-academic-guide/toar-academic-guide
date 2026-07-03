import { NextResponse } from 'next/server';

import { ROUTES, normalizeSafeNextPath } from '@/lib/routes';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ERROR_REDIRECT_PATH = '/?auth=oauth_error';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextPath = normalizeSafeNextPath(searchParams.get('next'), { defaultPath: ROUTES.home });

  if (!code) {
    return NextResponse.redirect(new URL(ERROR_REDIRECT_PATH, origin));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL(ERROR_REDIRECT_PATH, origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(ERROR_REDIRECT_PATH, origin));
  }

  return NextResponse.redirect(new URL(nextPath, origin));
}
