import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createSparkKanaDojoSession,
  verifySparkKanaDojoHandoff,
} from '@/features/SparkIntegration/server/handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'spark_kana_dojo_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

function getAdminClient() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const token =
    body && typeof body === 'object' && 'token' in body
      ? (body as { token?: unknown }).token
      : null;
  if (typeof token !== 'string' || token.length > 4096) {
    return NextResponse.json({ error: 'Invalid handoff token.' }, { status: 400 });
  }

  let accountId: string | null = null;
  try {
    accountId = verifySparkKanaDojoHandoff(token);
  } catch {
    return NextResponse.json({ error: 'Handoff is not configured.' }, { status: 503 });
  }
  if (!accountId) {
    return NextResponse.json({ error: 'Handoff token expired.' }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Spark learning data is temporarily unavailable.' },
      { status: 503 },
    );
  }
  const { data, error } = await admin
    .from('spark_accounts')
    .select('id')
    .eq('id', accountId)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: 'Spark learning data is temporarily unavailable.' },
      { status: 503 },
    );
  }
  if (typeof data?.id !== 'string') {
    return NextResponse.json({ error: 'Spark account is not available.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, createSparkKanaDojoSession(accountId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
