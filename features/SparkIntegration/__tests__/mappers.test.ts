import { describe, expect, it } from 'vitest';
import {
  mapSparkGrammarRow,
  mapSparkVocabularyRow,
  normalizeSparkLevel,
  splitMeaning,
} from '../mappers';

describe('Spark learning mappers', () => {
  it('normalizes supported JLPT levels and rejects unknown levels', () => {
    expect(normalizeSparkLevel('N5')).toBe('n5');
    expect(normalizeSparkLevel('n1')).toBe('n1');
    expect(normalizeSparkLevel('beginner')).toBeNull();
  });

  it('splits Chinese meanings without creating empty options', () => {
    expect(splitMeaning('死亡；死, 亡')).toEqual(['死亡', '死', '亡']);
    expect(splitMeaning('')).toEqual([]);
  });

  it('rejects vocabulary rows that fail the publish gate', () => {
    expect(
      mapSparkVocabularyRow({
        slug: 'n5-death',
        headword: '死ぬ',
        reading: 'しぬ',
        meaning_zh: '',
        jlpt_level: 'N5',
      }),
    ).toBeNull();
  });

  it('maps a vocabulary row without mixing grammar fields', () => {
    expect(
      mapSparkVocabularyRow({
        slug: 'n5-death',
        headword: '死ぬ',
        reading: 'しぬ',
        meaning_zh: '死；死亡',
        pos: '动词',
        jlpt_level: 'N5',
        updated_at: '2026-08-11T00:00:00Z',
      }),
    ).toMatchObject({
      kind: 'vocabulary',
      meanings: ['死', '死亡'],
      jlptLevel: 'n5',
      exampleSentence: null,
    });
  });

  it('maps grammar examples and keeps grammar as a separate kind', () => {
    expect(
      mapSparkGrammarRow({
        slug: 'n5-example',
        syllabus_point_id: 'point-1',
        name_ja: '〜です',
        meaning_zh: '是……',
        level_code: 'N5',
        examples: [{ jp: 'これは本です。', zh: '这是书。' }],
        lecture_md: 'lecture',
        renkei_md: null,
        comparison_md: null,
      }),
    ).toMatchObject({
      kind: 'grammar',
      nameJa: '〜です',
      examples: [{ jp: 'これは本です。', zh: '这是书。' }],
      lectureMd: 'lecture',
    });
  });
});
