import type { VocabLevel } from '@/entities/vocabulary';
import type { SparkGrammarRecord, SparkVocabularyRecord } from './types';

export type SparkRow = Record<string, unknown>;

const LEVELS = new Set<VocabLevel>(['n1', 'n2', 'n3', 'n4', 'n5']);

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeSparkLevel(value: unknown): VocabLevel | null {
  const normalized = nonEmptyString(value)?.toLowerCase();
  return normalized && LEVELS.has(normalized as VocabLevel)
    ? (normalized as VocabLevel)
    : null;
}

export function splitMeaning(value: unknown): string[] {
  const meaning = nonEmptyString(value);
  if (!meaning) return [];

  return meaning
    .split(/[;,，；、]/u)
    .map(item => item.trim())
    .filter(Boolean);
}

function parseExamples(value: unknown): Array<{ jp: string; zh: string }> {
  if (!Array.isArray(value)) return [];

  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const jp = nonEmptyString(row.jp ?? row.ja ?? row.sentence);
    if (!jp) return [];
    return [
      {
        jp,
        zh: nonEmptyString(row.zh ?? row.cn ?? row.translation) ?? '',
      },
    ];
  });
}

export function mapSparkVocabularyRow(
  row: SparkRow,
): SparkVocabularyRecord | null {
  const slug = nonEmptyString(row.slug);
  const headword = nonEmptyString(row.headword);
  const reading = nonEmptyString(row.reading);
  const meanings = splitMeaning(row.meaning_zh);

  // This is a publish gate, not a best-effort mapper. Invalid rows must be
  // visible to the caller as missing content rather than silently becoming a
  // malformed quiz item.
  if (!slug || !headword || !reading || meanings.length === 0) return null;

  return {
    kind: 'vocabulary',
    slug,
    headword,
    reading,
    meanings,
    pos: nonEmptyString(row.pos),
    jlptLevel: normalizeSparkLevel(row.jlpt_level),
    updatedAt: nonEmptyString(row.updated_at),
    exampleSentence: null,
    collocations: [],
    homographTrap: null,
  };
}

export function mapSparkGrammarRow(row: SparkRow): SparkGrammarRecord | null {
  const slug = nonEmptyString(row.slug);
  const syllabusPointId = nonEmptyString(row.syllabus_point_id);
  const nameJa = nonEmptyString(row.name_ja);
  const meaningZh = nonEmptyString(row.meaning_zh);

  if (!slug || !syllabusPointId || !nameJa || !meaningZh) return null;

  return {
    kind: 'grammar',
    slug,
    syllabusPointId,
    nameJa,
    meaningZh,
    levelCode: normalizeSparkLevel(row.level_code),
    examples: parseExamples(row.examples),
    updatedAt: nonEmptyString(row.updated_at),
    lectureMd: nonEmptyString(row.lecture_md),
    renkeiMd: nonEmptyString(row.renkei_md),
    comparisonMd: nonEmptyString(row.comparison_md),
  };
}
