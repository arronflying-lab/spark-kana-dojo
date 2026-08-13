import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VocabLevel } from '@/entities/vocabulary';
import {
  mapSparkGrammarRow,
  mapSparkVocabularyRow,
  type SparkRow,
} from '../mappers';
import type {
  SparkGrammarRecord,
  SparkLearningDataProvider,
  SparkVocabularyRecord,
} from '../types';
import { verifySparkKanaDojoSession } from './handoff';

export const SPARK_SESSION_COOKIE = 'spark_session';
export const SPARK_KANA_DOJO_SESSION_COOKIE = 'spark_kana_dojo_session';

const VOCAB_COLUMNS =
  'slug,headword,reading,pos,meaning_zh,jlpt_level,updated_at';
const GRAMMAR_COLUMNS =
  'slug,syllabus_point_id,name_ja,meaning_zh,level_code,examples,updated_at,lecture_md,renkei_md,comparison_md';
const MAX_LIMIT = 200;

export class SparkUnauthorizedError extends Error {
  constructor() {
    super('A valid Spark account session is required.');
    this.name = 'SparkUnauthorizedError';
  }
}

export class SparkDataSourceError extends Error {
  constructor() {
    super('The Spark learning data source is unavailable.');
    this.name = 'SparkDataSourceError';
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new SparkDataSourceError();
  return value;
}

let adminClient: SupabaseClient | undefined;

function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return adminClient;
}

function getSessionSecret(): string {
  const secret =
    process.env.SPARK_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new SparkDataSourceError();
  return secret;
}

function base64urlDecode(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Verifies the existing Spark self-managed HMAC cookie; no browser id is trusted. */
export function verifySparkSessionToken(token: string): string | null {
  const separator = token.indexOf('.');
  if (separator < 1) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest();
  const actual = Buffer.from(
    signature.replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  );
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64urlDecode(payload).toString('utf8')) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number') {
      return null;
    }
    return Date.now() <= parsed.exp ? parsed.sub : null;
  } catch {
    return null;
  }
}

async function resolveSparkAccountId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sparkToken = cookieStore.get(SPARK_SESSION_COOKIE)?.value;
  const kanaDojoToken = cookieStore.get(SPARK_KANA_DOJO_SESSION_COOKIE)?.value;
  let accountId = sparkToken ? verifySparkSessionToken(sparkToken) : null;
  if (!accountId && kanaDojoToken) {
    try {
      accountId = verifySparkKanaDojoSession(kanaDojoToken);
    } catch {
      accountId = null;
    }
  }
  if (!accountId) return null;

  const { data, error } = await getAdminClient()
    .from('spark_accounts')
    .select('id')
    .eq('id', accountId)
    .maybeSingle();
  if (error) throw new SparkDataSourceError();
  return typeof data?.id === 'string' ? data.id : null;
}

function normalizeLimit(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined) return 120;
  return Math.max(1, Math.min(MAX_LIMIT, value));
}

function normalizeLevel(level: VocabLevel | undefined): string | undefined {
  return level ? level.toUpperCase() : undefined;
}

export async function createSparkLearningDataProvider(): Promise<SparkLearningDataProvider> {
  const accountId = await resolveSparkAccountId();
  if (!accountId) throw new SparkUnauthorizedError();

  const supabase = getAdminClient();

  return {
    async listVocabulary(
      level?: VocabLevel,
      limit?: number,
    ): Promise<SparkVocabularyRecord[]> {
      const requestedLimit = normalizeLimit(limit);
      let query = supabase
        .from('v_public_vocabulary')
        .select(VOCAB_COLUMNS)
        .order('slug', { ascending: true })
        // Fetch an overflow because affixes and placeholder entries are removed
        // before this vocabulary-only game reaches a student.
        .limit(Math.min(MAX_LIMIT, requestedLimit * 2));
      const normalizedLevel = normalizeLevel(level);
      if (normalizedLevel) query = query.eq('jlpt_level', normalizedLevel);

      const { data, error } = await query;
      if (error) throw new SparkDataSourceError();
      return ((data ?? []) as SparkRow[]).flatMap(row => {
        const mapped = mapSparkVocabularyRow(row);
        return mapped ? [mapped] : [];
      }).slice(0, requestedLimit);
    },

    async listGrammar(
      level?: VocabLevel,
      limit?: number,
    ): Promise<SparkGrammarRecord[]> {
      let query = supabase
        .from('v_study_grammar_points')
        .select(GRAMMAR_COLUMNS)
        .order('slug', { ascending: true })
        .limit(normalizeLimit(limit));
      const normalizedLevel = normalizeLevel(level);
      if (normalizedLevel) query = query.eq('level_code', normalizedLevel);

      const { data, error } = await query;
      if (error) throw new SparkDataSourceError();
      return ((data ?? []) as SparkRow[]).flatMap(row => {
        const mapped = mapSparkGrammarRow(row);
        return mapped ? [mapped] : [];
      });
    },
  };
}
