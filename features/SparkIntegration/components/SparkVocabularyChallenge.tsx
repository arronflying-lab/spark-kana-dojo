'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GameBottomBar } from '@/shared/ui-composite/Game/GameBottomBar';
import TilesModeGrid from '@/shared/ui-composite/Game/TilesModeGrid';
import { getAnswerRowClassName } from '@/shared/ui-composite/Game/TilesModeShared';
import {
  type SparkQuestAnswer,
  type SparkQuestAnswerResult,
  type SparkQuestQuestion,
  type SparkQuestSession,
} from '../portalVocabQuest';

type FeedbackState = {
  askedQuestion: SparkQuestQuestion;
  result: SparkQuestAnswerResult;
  nextSession: SparkQuestSession;
};

function freshRequestId() {
  return typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12)}`;
}

function optionText(question: SparkQuestQuestion, label: string) {
  if (question.type === 'meaning_choice' || question.type === 'context_choice')
    return label;
  return <span lang='ja'>{label}</span>;
}

function feedbackContent(result: SparkQuestAnswerResult) {
  const { correctHeadword, correctReading, meaningZh } = result.feedback;
  return (
    <span>
      <span lang='ja' className='font-semibold'>
        {correctHeadword}
        {correctReading ? `（${correctReading}）` : ''}
      </span>
      {meaningZh ? ` · ${meaningZh}` : ''}
    </span>
  );
}

export default function SparkVocabularyChallenge({
  session,
  onAnswer,
  onSessionUpdate,
  onAbandon,
  onExit,
}: {
  session: SparkQuestSession;
  onAnswer: (
    answer: SparkQuestAnswer,
    elapsedMs: number,
    requestId: string,
  ) => Promise<SparkQuestAnswerResult>;
  onSessionUpdate: (session: SparkQuestSession) => void;
  onAbandon: () => Promise<void>;
  onExit: () => void;
}) {
  const [activeSession, setActiveSession] = useState(session);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedTileIndexes, setSelectedTileIndexes] = useState<number[]>([]);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startedAt = useRef(Date.now());
  const requestIds = useRef(new Map<number, string>());

  useEffect(() => {
    setActiveSession(session);
    setFeedback(null);
    setSelectedOptionId(null);
    setSelectedTileIndexes([]);
    setSelectedPairId(null);
    setMapping({});
    setRequestError(null);
    startedAt.current = Date.now();
  }, [session]);

  const question = activeSession.currentQuestion;
  const tileMap = useMemo(
    () =>
      new Map(
        (question?.type === 'reading_tiles' ? question.tiles : []).map(
          (tile, index) => [index, tile.label],
        ),
      ),
    [question],
  );

  const submit = async (answer: SparkQuestAnswer) => {
    if (!question || feedback || isSubmitting) return;
    setRequestError(null);
    setIsSubmitting(true);
    const requestId =
      requestIds.current.get(question.index) ?? freshRequestId();
    requestIds.current.set(question.index, requestId);
    try {
      const result = await onAnswer(
        answer,
        Math.min(
          600000,
          Math.max(0, Math.round(Date.now() - startedAt.current)),
        ),
        requestId,
      );
      const nextSession: SparkQuestSession = {
        ...result.summary,
        currentQuestion: result.currentQuestion,
      };
      setFeedback({ askedQuestion: question, result, nextSession });
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : '答案没有保存，请重试。',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueAfterFeedback = () => {
    if (!feedback) return;
    const { nextSession } = feedback;
    if (nextSession.status !== 'active' || !nextSession.currentQuestion) {
      return;
    }
    onSessionUpdate(nextSession);
    setActiveSession(nextSession);
    setFeedback(null);
    setSelectedOptionId(null);
    setSelectedTileIndexes([]);
    setSelectedPairId(null);
    setMapping({});
    setRequestError(null);
    startedAt.current = Date.now();
  };

  if (feedback && feedback.nextSession.status !== 'active') {
    const { nextSession, result } = feedback;
    const passed = nextSession.status === 'passed';
    return (
      <div className='mx-auto flex min-h-[58dvh] w-full max-w-2xl flex-col items-center justify-center gap-5 px-4 text-center'>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className='flex flex-col items-center gap-3'
        >
          <p className='text-5xl' aria-hidden='true'>
            {passed ? '🎉' : '💪'}
          </p>
          <h2 className='text-3xl font-bold text-(--text-color)'>
            {passed ? '本关通过！' : '这次差一点，再来一次。'}
          </h2>
          <p className='text-(--secondary-color)'>
            答对 {nextSession.correctCount} / {nextSession.questionCount} 题 ·
            获得 {nextSession.xpAwarded} XP
          </p>
          {passed && (
            <p
              className='text-amber-500'
              aria-label={`${nextSession.stars ?? 0} 星`}
            >
              {'★'.repeat(nextSession.stars ?? 0)}
              {'☆'.repeat(Math.max(0, 3 - (nextSession.stars ?? 0)))}
            </p>
          )}
        </motion.div>

        {!passed && result.failureReview.length > 0 && (
          <div className='w-full rounded-2xl border border-(--border-color) bg-(--card-color) p-4 text-left'>
            <p className='font-semibold text-(--text-color)'>本次需要复习</p>
            <ul className='mt-2 grid gap-2 text-sm text-(--secondary-color)'>
              {result.failureReview.slice(0, 8).map(item => (
                <li key={item.slug}>
                  <span lang='ja' className='font-semibold text-(--text-color)'>
                    {item.headword}（{item.reading}）
                  </span>
                  {' · '}
                  {item.meaningZh}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type='button'
          className='rounded-2xl bg-(--main-color) px-7 py-4 text-lg font-bold text-white shadow-sm transition hover:-translate-y-0.5'
          onClick={onExit}
        >
          返回单词路径
        </button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className='flex min-h-[58dvh] flex-col items-center justify-center gap-4 text-center text-(--secondary-color)'>
        <p>这次会话没有可继续的题目。</p>
        <button
          type='button'
          className='font-semibold text-(--main-color) underline'
          onClick={onExit}
        >
          返回单词路径
        </button>
      </div>
    );
  }

  if (question.type === 'reading_input') {
    return (
      <div className='flex min-h-[58dvh] flex-col items-center justify-center gap-4 px-5 text-center text-(--secondary-color)'>
        <h2 className='text-2xl font-bold text-(--text-color)'>
          旧版输入题已停用
        </h2>
        <p>为保证练习方式一致，请结束这个旧会话后从单词路径重新开始。</p>
        <button
          type='button'
          className='rounded-2xl bg-(--main-color) px-6 py-3 font-bold text-white'
          onClick={() => void onAbandon()}
        >
          结束旧会话
        </button>
      </div>
    );
  }

  const isAnswered = feedback !== null;
  const displaySession = feedback?.nextSession ?? activeSession;
  const isTileQuestion = question.type === 'reading_tiles';
  const isMatchingQuestion = question.type === 'matching';
  const selectedTileIds = selectedTileIndexes.map(index =>
    question.type === 'reading_tiles' ? (question.tiles[index]?.id ?? '') : '',
  );
  const canCheck = isTileQuestion
    ? selectedTileIds.length === question.answerLength
    : isMatchingQuestion
      ? Object.keys(mapping).length === question.pairs.length
      : selectedOptionId !== null;

  const selectOption = (optionId: string) => {
    if (isAnswered || isSubmitting) return;
    setSelectedOptionId(optionId);
    void submit({ optionId });
  };

  const selectTile = (tileIndex: number) => {
    if (isAnswered || isSubmitting) return;
    setSelectedTileIndexes(current =>
      current.includes(tileIndex)
        ? current.filter(index => index !== tileIndex)
        : [...current, tileIndex],
    );
  };

  const selectMatchingOption = (optionId: string) => {
    if (!selectedPairId || isAnswered || isSubmitting) return;
    setMapping(current => {
      const withoutDuplicate = Object.fromEntries(
        Object.entries(current).filter(
          ([pairId, mappedOption]) =>
            pairId === selectedPairId || mappedOption !== optionId,
        ),
      );
      return { ...withoutDuplicate, [selectedPairId]: optionId };
    });
  };

  return (
    <div className='relative mx-auto flex min-h-[68dvh] w-full max-w-4xl flex-col gap-7 pb-36'>
      <header className='flex items-center justify-between gap-4 pt-2'>
        <p className='text-xl font-bold text-(--text-color) sm:text-2xl'>
          第 {question.index + 1} / {displaySession.questionCount} 题
        </p>
        <p
          className='text-2xl tracking-wide text-rose-500'
          aria-label={`剩余 ${displaySession.hearts} 颗心`}
        >
          {'♥'.repeat(displaySession.hearts)}
          {'♡'.repeat(
            Math.max(0, displaySession.maxHearts - displaySession.hearts),
          )}
        </p>
      </header>

      <div className='h-3 overflow-hidden rounded-full bg-(--border-color)'>
        <motion.div
          className='h-full rounded-full bg-(--main-color)'
          animate={{ width: `${Math.max(5, displaySession.progress * 100)}%` }}
        />
      </div>

      <motion.div
        key={`${activeSession.sessionId}-${question.index}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-col gap-5'
      >
        <p
          className='text-center text-3xl leading-relaxed font-semibold text-(--text-color) sm:text-5xl'
          lang={question.type === 'context_choice' ? 'ja' : undefined}
        >
          {question.prompt}
        </p>

        {isTileQuestion ? (
          <TilesModeGrid
            allTiles={tileMap}
            placedTileIds={selectedTileIndexes}
            onTileClick={tileId => selectTile(tileId)}
            isTileDisabled={isAnswered || isSubmitting}
            isCelebrating={feedback?.result.isCorrect ?? false}
            celebrationMode='bounce'
            tilesPerRow={Math.max(4, Math.ceil(tileMap.size / 2))}
            tileSizeClassName='text-2xl sm:text-3xl'
            tileLang='ja'
            answerRowClassName={getAnswerRowClassName('5rem')}
            tilesWrapperKey={`${activeSession.sessionId}-${question.index}`}
          />
        ) : isMatchingQuestion ? (
          <div className='grid gap-5 md:grid-cols-2'>
            <div className='grid gap-2'>
              {question.pairs.map(pair => {
                const isSelected = selectedPairId === pair.id;
                const optionId = mapping[pair.id];
                const mappedLabel = question.options.find(
                  option => option.id === optionId,
                )?.label;
                return (
                  <button
                    key={pair.id}
                    type='button'
                    disabled={isAnswered || isSubmitting}
                    className={`rounded-2xl border-b-4 px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-(--main-color) bg-(--main-color)/10'
                        : 'border-(--border-color) bg-(--card-color) hover:border-(--main-color)'
                    }`}
                    onClick={() => setSelectedPairId(pair.id)}
                  >
                    <span lang='ja' className='font-bold text-(--text-color)'>
                      {pair.label}
                    </span>
                    <span className='mt-1 block text-sm text-(--secondary-color)'>
                      {mappedLabel ?? '选择右侧释义'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className='grid gap-2'>
              {question.options.map(option => (
                <button
                  key={option.id}
                  type='button'
                  disabled={!selectedPairId || isAnswered || isSubmitting}
                  className='rounded-2xl border-b-4 border-(--border-color) bg-(--card-color) px-4 py-3 text-left text-(--text-color) transition hover:border-(--main-color) disabled:cursor-not-allowed disabled:opacity-50'
                  onClick={() => selectMatchingOption(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4'>
            {question.options.map(option => {
              const selected = selectedOptionId === option.id;
              return (
                <motion.button
                  key={option.id}
                  type='button'
                  disabled={isAnswered || isSubmitting}
                  whileTap={
                    !isAnswered && !isSubmitting ? { scale: 0.97 } : undefined
                  }
                  className={`min-h-24 rounded-2xl border-b-4 px-5 py-4 text-left text-2xl transition sm:text-3xl ${
                    selected
                      ? 'border-(--main-color) bg-(--main-color)/10 text-(--text-color)'
                      : 'border-(--border-color) bg-(--card-color) text-(--secondary-color) hover:border-(--main-color)'
                  }`}
                  onClick={() => selectOption(option.id)}
                >
                  {optionText(question, option.label)}
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {requestError && (
        <p className='text-center text-sm font-semibold text-rose-600'>
          {requestError}
        </p>
      )}

      {!isAnswered && (isTileQuestion || isMatchingQuestion) && (
        <GameBottomBar
          state='check'
          onAction={() => {
            if (!canCheck) return;
            if (isTileQuestion) void submit({ tileIds: selectedTileIds });
            if (isMatchingQuestion) void submit({ mapping });
          }}
          canCheck={canCheck && !isSubmitting}
          feedbackContent=''
          actionLabel={isSubmitting ? '提交中…' : '确认答案'}
        />
      )}

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          role='status'
          className={`flex items-center justify-between gap-3 border-l-4 px-2 py-2 ${
            feedback.result.isCorrect
              ? 'border-emerald-500 text-emerald-700'
              : 'border-rose-500 text-rose-700'
          }`}
        >
          <p className='min-w-0 text-base font-semibold sm:text-lg'>
            <span className='mr-2 text-xl' aria-hidden='true'>
              {feedback.result.isCorrect ? '✓' : '！'}
            </span>
            {feedback.result.isCorrect ? '答对了' : '正确答案：'}{' '}
            {feedbackContent(feedback.result)}
          </p>
          <button
            type='button'
            className='shrink-0 rounded-xl px-4 py-2 font-bold text-(--main-color) transition hover:bg-(--main-color)/10'
            onClick={continueAfterFeedback}
          >
            继续
          </button>
        </motion.div>
      )}
    </div>
  );
}
