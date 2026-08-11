import type { IVocabObj, VocabLevel } from '@/entities/vocabulary';

export type SparkContentKind = 'vocabulary' | 'grammar';

export interface SparkVocabularyRecord {
  kind: 'vocabulary';
  slug: string;
  headword: string;
  reading: string;
  meanings: string[];
  pos: string | null;
  jlptLevel: VocabLevel | null;
  updatedAt: string | null;
  exampleSentence: { jp: string; zh: string } | null;
  collocations: Array<{ pattern: string; zh: string }>;
  homographTrap: {
    verdict: 'trap' | 'same' | 'unknown';
    zhMeaning: string | null;
    note: string | null;
  } | null;
}

export interface SparkGrammarRecord {
  kind: 'grammar';
  slug: string;
  syllabusPointId: string;
  nameJa: string;
  meaningZh: string;
  levelCode: VocabLevel | null;
  examples: Array<{ jp: string; zh: string }>;
  updatedAt: string | null;
  lectureMd: string | null;
  renkeiMd: string | null;
  comparisonMd: string | null;
}

export type SparkLearningRecord =
  | SparkVocabularyRecord
  | SparkGrammarRecord;

export interface SparkLearningDataProvider {
  listVocabulary(level?: VocabLevel): Promise<SparkVocabularyRecord[]>;
  listGrammar(level?: VocabLevel): Promise<SparkGrammarRecord[]>;
}

export function toKanaDojoVocabulary(
  record: SparkVocabularyRecord,
): IVocabObj {
  return {
    word: record.headword,
    reading: record.reading,
    meanings: record.meanings,
  };
}
