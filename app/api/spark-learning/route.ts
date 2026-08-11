import { NextResponse } from 'next/server';
import type { VocabLevel } from '@/entities/vocabulary';
import {
  createSparkLearningDataProvider,
  SparkDataSourceError,
  SparkUnauthorizedError,
} from '@/features/SparkIntegration/server/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEVELS = new Set<VocabLevel>(['n1', 'n2', 'n3', 'n4', 'n5']);
const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
};

function json(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: PRIVATE_HEADERS,
  });
}

function parseLevel(value: string | null): VocabLevel | undefined {
  if (!value) return undefined;
  const level = value.toLowerCase() as VocabLevel;
  return LEVELS.has(level) ? level : undefined;
}

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const limit = Number(value);
  return Number.isInteger(limit) ? limit : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind');
  const levelInput = url.searchParams.get('level');
  const level = parseLevel(levelInput);

  if (kind !== 'vocabulary' && kind !== 'grammar') {
    return json({ error: 'kind must be vocabulary or grammar.' }, 400);
  }
  if (!levelInput || !level) {
    return json({ error: 'level must be one of n1, n2, n3, n4, n5.' }, 400);
  }

  try {
    const provider = await createSparkLearningDataProvider();
    const limit = parseLimit(url.searchParams.get('limit'));
    const items =
      kind === 'vocabulary'
        ? await provider.listVocabulary(level, limit)
        : await provider.listGrammar(level, limit);

    return json({ ok: true, kind, level, items });
  } catch (error) {
    if (error instanceof SparkUnauthorizedError) {
      return json({ error: 'Spark account login is required.' }, 401);
    }
    if (error instanceof SparkDataSourceError) {
      return json(
        { error: 'Spark learning data is temporarily unavailable.' },
        503,
      );
    }
    return json({ error: 'Unable to load Spark learning data.' }, 500);
  }
}
