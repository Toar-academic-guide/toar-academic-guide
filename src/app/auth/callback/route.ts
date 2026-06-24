import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const DEFAULT_REDIRECT_PATH = '/';
const ERROR_REDIRECT_PATH = '/?auth=oauth_error';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextPath = resolveNextPath(searchParams.get('next'));

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

function resolveNextPath(next: string | null) {
  if (!next || !next.startsWith('/')) {
    return DEFAULT_REDIRECT_PATH;
  }

  return next;
}
