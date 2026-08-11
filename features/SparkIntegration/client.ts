import type { VocabLevel } from '@/entities/vocabulary';
import type { SparkGrammarRecord, SparkVocabularyRecord } from './types';

type SparkLearningResponse<T> = {
  ok: true;
  kind: 'vocabulary' | 'grammar';
  level: VocabLevel;
  items: T[];
};

async function getSparkLearning<T>(
  kind: 'vocabulary' | 'grammar',
  level: VocabLevel,
  limit = 120,
): Promise<T[]> {
  const params = new URLSearchParams({
    kind,
    level,
    limit: String(limit),
  });
  const response = await fetch(`/api/spark-learning?${params.toString()}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Spark learning request failed: ${response.status}`);
  }

  const body = (await response.json()) as Partial<SparkLearningResponse<T>>;
  if (
    body.ok !== true ||
    body.kind !== kind ||
    body.level !== level ||
    !Array.isArray(body.items)
  ) {
    throw new Error('Spark learning response was invalid.');
  }
  return body.items;
}

export function getSparkVocabulary(
  level: VocabLevel,
  limit?: number,
): Promise<SparkVocabularyRecord[]> {
  return getSparkLearning('vocabulary', level, limit);
}

export function getSparkGrammar(
  level: VocabLevel,
  limit?: number,
): Promise<SparkGrammarRecord[]> {
  return getSparkLearning('grammar', level, limit);
}
