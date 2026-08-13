'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { toHiragana } from 'wanakana';
import { useShallow } from 'zustand/react/shallow';
import type { IVocabObj } from '@/entities/vocabulary';
import { useCorrect, useError } from '@/shared/hooks/generic/useAudio';
import { useCrazyModeTrigger } from '@/features/CrazyMode/hooks/useCrazyModeTrigger';
import { useStatsStore } from '@/features/Progress';
import Stars from '@/shared/ui-composite/Game/Stars';
import { GameBottomBar } from '@/shared/ui-composite/Game/GameBottomBar';
import TilesModeGrid from '@/shared/ui-composite/Game/TilesModeGrid';
import FuriganaText from '@/shared/ui-composite/text/FuriganaText';
import { buttonBorderStyles } from '@/shared/utils/styles';
import { getAnswerRowClassName } from '@/shared/ui-composite/Game/TilesModeShared';

type QuestionKind =
  | 'word_to_meaning'
  | 'meaning_to_word'
  | 'kanji_to_kana'
  | 'kana_to_kanji';

type Tile = { id: number; value: string };

type SparkQuestion = {
  kind: QuestionKind;
  vocab: IVocabObj;
  prompt: string;
  answer: string;
  options?: string[];
  tiles?: Tile[];
};

type Feedback = { correct: boolean; selected: string };

const KANJI_PATTERN = /[\u4e00-\u9faf]/;

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [
      result[swapIndex],
      result[index],
    ];
  }
  return result;
};

const hasKanji = (word: string): boolean => KANJI_PATTERN.test(word);

const firstMeaning = (vocab: IVocabObj): string =>
  vocab.meanings.find(meaning => meaning.trim().length > 0)?.trim() ?? '';

const normalizedReading = (reading: string): string =>
  toHiragana(reading.normalize('NFKC')).replace(/\s+/g, '').trim();

const playableVocabulary = (vocabulary: IVocabObj[]): IVocabObj[] =>
  vocabulary.filter(
    vocab =>
      vocab.word.trim().length > 0 &&
      normalizedReading(vocab.reading).length > 0 &&
      firstMeaning(vocab).length > 0,
  );

const pickVocabulary = (
  vocabulary: IVocabObj[],
  previousWord?: string,
): IVocabObj => {
  const alternatives = vocabulary.filter(vocab => vocab.word !== previousWord);
  const source = alternatives.length > 0 ? alternatives : vocabulary;
  return source[Math.floor(Math.random() * source.length)];
};

const distinctOptions = (
  vocabulary: IVocabObj[],
  answer: string,
  getValue: (vocab: IVocabObj) => string,
): string[] => {
  const distractors = shuffle(
    Array.from(
      new Set(
        vocabulary
          .map(getValue)
          .map(value => value.trim())
          .filter(value => value.length > 0 && value !== answer),
      ),
    ),
  ).slice(0, 3);
  return shuffle([answer, ...distractors]);
};

const createReadingTiles = (
  answer: string,
  vocabulary: IVocabObj[],
): Tile[] => {
  const answerChars = Array.from(answer);
  const distractorPool = Array.from(
    new Set(
      vocabulary.flatMap(vocab => Array.from(normalizedReading(vocab.reading))),
    ),
  ).filter(char => !answerChars.includes(char));
  const distractorCount = Math.min(4, distractorPool.length);
  return shuffle([
    ...answerChars,
    ...shuffle(distractorPool).slice(0, distractorCount),
  ]).map((value, id) => ({ id, value }));
};

const createQuestion = (
  source: IVocabObj[],
  sequence: number,
  previousWord?: string,
): SparkQuestion | null => {
  const vocabulary = playableVocabulary(source);
  if (vocabulary.length < 2) return null;

  const kanjiVocabulary = vocabulary.filter(vocab => hasKanji(vocab.word));
  const kinds: QuestionKind[] = ['word_to_meaning', 'meaning_to_word'];
  if (kanjiVocabulary.length >= 2) {
    kinds.push('kanji_to_kana', 'kana_to_kanji');
  }

  const kind = kinds[sequence % kinds.length];
  const candidates =
    kind === 'kanji_to_kana' || kind === 'kana_to_kanji'
      ? kanjiVocabulary
      : vocabulary;
  const vocab = pickVocabulary(candidates, previousWord);
  const reading = normalizedReading(vocab.reading);
  const meaning = firstMeaning(vocab);

  if (kind === 'word_to_meaning') {
    return {
      kind,
      vocab,
      prompt: `${vocab.word} 中文？`,
      answer: meaning,
      options: distinctOptions(vocabulary, meaning, firstMeaning),
    };
  }

  if (kind === 'meaning_to_word') {
    return {
      kind,
      vocab,
      prompt: `${meaning} 日语？`,
      answer: vocab.word,
      options: distinctOptions(vocabulary, vocab.word, item => item.word),
    };
  }

  if (kind === 'kanji_to_kana') {
    return {
      kind,
      vocab,
      prompt: `${vocab.word} 读音？`,
      answer: reading,
      tiles: createReadingTiles(reading, vocabulary),
    };
  }

  return {
    kind,
    vocab,
    prompt: `${reading} 汉字？`,
    answer: vocab.word,
    options: distinctOptions(kanjiVocabulary, vocab.word, item => item.word),
  };
};

const answerLabel = (question: SparkQuestion): string => {
  if (question.kind === 'word_to_meaning') return question.answer;
  if (question.kind === 'kanji_to_kana') return question.answer;
  if (question.kind === 'kana_to_kanji') return question.answer;
  const reading = normalizedReading(question.vocab.reading);
  return reading ? `${question.answer}（${reading}）` : question.answer;
};

const questionDisplay = (question: SparkQuestion) => {
  if (question.kind === 'meaning_to_word') {
    return <p className='text-center text-4xl sm:text-6xl'>{firstMeaning(question.vocab)}</p>;
  }

  if (question.kind === 'kana_to_kanji') {
    return (
      <p className='text-center text-5xl sm:text-7xl' lang='ja'>
        {normalizedReading(question.vocab.reading)}
      </p>
    );
  }

  return (
    <FuriganaText
      text={question.vocab.word}
      reading={question.kind === 'word_to_meaning' ? question.vocab.reading : undefined}
      className='text-center text-5xl sm:text-7xl'
      lang='ja'
    />
  );
};

export default function SparkVocabularyChallenge({
  vocabulary,
}: {
  vocabulary: IVocabObj[];
}) {
  const [sequence, setSequence] = useState(0);
  const [question, setQuestion] = useState<SparkQuestion | null>(() =>
    createQuestion(vocabulary, 0),
  );
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedTileIds, setSelectedTileIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const { playCorrect } = useCorrect();
  const { playErrorTwice } = useError();
  const { trigger: triggerCrazyMode } = useCrazyModeTrigger();
  const {
    score,
    setScore,
    incrementVocabularyCorrect,
    incrementWrongStreak,
    resetWrongStreak,
    incrementCorrectAnswers,
    incrementWrongAnswers,
    addCharacterToHistory,
    incrementCharacterScore,
  } = useStatsStore(
    useShallow(state => ({
      score: state.score,
      setScore: state.setScore,
      incrementVocabularyCorrect: state.incrementVocabularyCorrect,
      incrementWrongStreak: state.incrementWrongStreak,
      resetWrongStreak: state.resetWrongStreak,
      incrementCorrectAnswers: state.incrementCorrectAnswers,
      incrementWrongAnswers: state.incrementWrongAnswers,
      addCharacterToHistory: state.addCharacterToHistory,
      incrementCharacterScore: state.incrementCharacterScore,
    })),
  );

  const recordAnswer = useCallback(
    (isCorrect: boolean, selected: string) => {
      if (!question || feedback) return;

      setSelectedOption(selected);
      setFeedback({ correct: isCorrect, selected });
      setIsCelebrating(isCorrect);
      triggerCrazyMode();

      if (isCorrect) {
        playCorrect();
        addCharacterToHistory(question.vocab.word);
        incrementCharacterScore(question.vocab.word, 'correct');
        incrementVocabularyCorrect();
        incrementCorrectAnswers();
        resetWrongStreak();
        setScore(score + 1);
        return;
      }

      playErrorTwice();
      incrementCharacterScore(question.vocab.word, 'wrong');
      incrementWrongAnswers();
      incrementWrongStreak();
      setScore(Math.max(0, score - 1));
    },
    [
      addCharacterToHistory,
      feedback,
      incrementCharacterScore,
      incrementCorrectAnswers,
      incrementVocabularyCorrect,
      incrementWrongAnswers,
      incrementWrongStreak,
      playCorrect,
      playErrorTwice,
      question,
      resetWrongStreak,
      score,
      setScore,
      triggerCrazyMode,
    ],
  );

  const handleOption = (option: string) => {
    if (!question || feedback) return;
    recordAnswer(option === question.answer, option);
  };

  const handleTile = (tileId: number) => {
    if (feedback) return;
    setSelectedTileIds(current =>
      current.includes(tileId)
        ? current.filter(id => id !== tileId)
        : [...current, tileId],
    );
  };

  const checkTiles = () => {
    if (!question?.tiles || feedback) return;
    const selected = selectedTileIds
      .map(id => question.tiles?.find(tile => tile.id === id)?.value ?? '')
      .join('');
    if (selected.length !== Array.from(question.answer).length) return;
    recordAnswer(selected === question.answer, selected);
  };

  const nextQuestion = () => {
    if (!question) return;
    const nextSequence = sequence + 1;
    setSequence(nextSequence);
    setQuestion(createQuestion(vocabulary, nextSequence, question.vocab.word));
    setSelectedOption(null);
    setSelectedTileIds([]);
    setFeedback(null);
    setIsCelebrating(false);
  };

  if (!question) {
    return (
      <p className='py-20 text-center text-(--secondary-color)'>
        当前等级没有可用于单词闯关的词汇。
      </p>
    );
  }

  const tiles = question.tiles;
  const tileMap = new Map(tiles?.map(tile => [tile.id, tile.value]) ?? []);
  const selectedTileText = selectedTileIds
    .map(id => tileMap.get(id) ?? '')
    .join('');
  const isTileQuestion = question.kind === 'kanji_to_kana';
  const isAnswered = feedback !== null;

  return (
    <div className='relative flex min-h-[68dvh] w-full flex-col items-center gap-8 pb-36 sm:gap-10'>
      <div className='flex w-full flex-col items-center gap-4 pt-4'>
        <p className='text-center text-lg font-semibold text-(--secondary-color) sm:text-xl'>
          {question.prompt}
        </p>
        <motion.div
          key={`${sequence}-${question.kind}-${question.vocab.word}`}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className='flex min-h-28 items-center justify-center'
        >
          {questionDisplay(question)}
        </motion.div>
      </div>

      {isTileQuestion && tiles ? (
        <TilesModeGrid
          allTiles={tileMap}
          placedTileIds={selectedTileIds}
          onTileClick={tileId => handleTile(tileId)}
          isTileDisabled={isAnswered}
          isCelebrating={isCelebrating}
          celebrationMode='bounce'
          tilesPerRow={Math.ceil(tiles.length / 2)}
          tileSizeClassName='text-2xl sm:text-3xl'
          tileLang='ja'
          answerRowClassName={getAnswerRowClassName('5rem')}
          tilesWrapperKey={`${sequence}-${question.vocab.word}`}
        />
      ) : (
        <div className='grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4'>
          {question.options?.map(option => {
            const isCorrectOption = option === question.answer;
            const isSelected = option === selectedOption;
            return (
              <motion.button
                key={option}
                type='button'
                disabled={isAnswered}
                whileTap={!isAnswered ? { scale: 0.97 } : undefined}
                animate={
                  isAnswered && (isCorrectOption || isSelected)
                    ? { scale: [1, 1.035, 1] }
                    : undefined
                }
                className={`min-h-24 rounded-2xl border-b-4 px-5 py-4 text-left text-2xl text-(--secondary-color) transition sm:text-3xl ${buttonBorderStyles} ${
                  isAnswered && isCorrectOption
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : isAnswered && isSelected
                      ? 'border-rose-500 bg-rose-500/10'
                      : 'border-(--secondary-color)/50 hover:border-(--main-color) hover:bg-(--card-color)'
                }`}
                lang={
                  question.kind === 'word_to_meaning' ||
                  question.kind === 'meaning_to_word'
                    ? undefined
                    : 'ja'
                }
                onClick={() => handleOption(option)}
              >
                {question.kind === 'meaning_to_word' ||
                question.kind === 'kana_to_kanji' ? (
                  <FuriganaText
                    text={option}
                    reading={
                      question.kind === 'meaning_to_word'
                        ? vocabulary.find(item => item.word === option)?.reading
                        : undefined
                    }
                  />
                ) : (
                  option
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      <Stars />

      {isTileQuestion && !isAnswered && (
        <GameBottomBar
          state='check'
          onAction={checkTiles}
          canCheck={selectedTileText.length === Array.from(question.answer).length}
          actionLabel='检查'
          feedbackContent=''
        />
      )}

      {feedback && (
        <GameBottomBar
          state={feedback.correct ? 'correct' : 'wrong'}
          onAction={nextQuestion}
          canCheck={false}
          hideRetry
          actionLabel='继续'
          feedbackTitle={feedback.correct ? '正确' : '正确答案'}
          feedbackContent={answerLabel(question)}
        />
      )}
    </div>
  );
}
