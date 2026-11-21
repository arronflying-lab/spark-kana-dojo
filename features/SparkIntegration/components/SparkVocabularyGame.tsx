'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { VocabLevel } from '@/entities/vocabulary';
import {
  abandonSparkQuestSession,
  answerSparkQuestSession,
  getSparkQuestPath,
  SparkQuestRequestError,
  startSparkQuestSession,
  type SparkQuestPath,
  type SparkQuestSession,
  type SparkQuestStage,
} from '../portalVocabQuest';
import SparkVocabularyChallenge from './SparkVocabularyChallenge';

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'path'; path: SparkQuestPath }
  | { kind: 'playing'; path: SparkQuestPath; session: SparkQuestSession }
  | { kind: 'error'; message: string };

type SparkVocabularyGameProps = {
  level: VocabLevel;
};

type SelectedStage = { unitId: string; stage: SparkQuestStage };

const STAGES: Array<{
  stage: SparkQuestStage;
  label: string;
  description: string;
}> = [
  { stage: 'recognize', label: '认识', description: '前 10 词 · 12 题' },
  { stage: 'reinforce', label: '巩固', description: '后 10 词 · 12 题' },
  { stage: 'challenge', label: '挑战', description: '20 词混合 · 15 题' },
];

function friendlyError(error: unknown) {
  if (error instanceof SparkQuestRequestError) {
    if (error.status === 401) return '请从星火学习门户登录后再进入单词闯关。';
    if (error.status === 403) return '当前账号尚未开通单词闯关试用。';
    if (error.status === 409) return '这一关尚未解锁，请先完成前一关。';
    return error.message;
  }
  return '单词闯关暂时无法连接，请稍后重试。';
}

function stageEnabled(
  path: SparkQuestPath,
  unitId: string,
  stage: SparkQuestStage,
) {
  return Boolean(
    path.units.find(unit => unit.id === unitId)?.stages[stage].unlocked,
  );
}

function isStage(value: unknown): value is SparkQuestStage {
  return (
    value === 'recognize' || value === 'reinforce' || value === 'challenge'
  );
}

function suggestedStage(
  unit: SparkQuestPath['units'][number],
): SparkQuestStage {
  return (
    STAGES.find(
      ({ stage }) => unit.stages[stage].unlocked && !unit.stages[stage].passed,
    )?.stage ?? 'challenge'
  );
}

function postToPortal(message: Record<string, unknown>) {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage(
    { source: 'spark-kana-dojo', ...message },
    window.location.origin,
  );
}

export default function SparkVocabularyGame({
  level,
}: SparkVocabularyGameProps) {
  const [screen, setScreen] = useState<ScreenState>({ kind: 'loading' });
  const [isStarting, setIsStarting] = useState(false);
  const [selected, setSelected] = useState<SelectedStage | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // The query string is browser-only state; defer it until after hydration.
    setIsEmbedded(
      new URLSearchParams(window.location.search).get('embed') === 'spark',
    );
  }, []);

  const loadPath = useCallback(async () => {
    setScreen({ kind: 'loading' });
    try {
      const path = await getSparkQuestPath(level);
      const firstUnit = path.units.find(unit => unit.unlocked);
      setSelected(
        firstUnit
          ? { unitId: firstUnit.id, stage: suggestedStage(firstUnit) }
          : null,
      );
      setStartError(null);
      setScreen({ kind: 'path', path });
    } catch (error) {
      setScreen({ kind: 'error', message: friendlyError(error) });
    }
  }, [level]);

  useEffect(() => {
    void loadPath();
  }, [loadPath]);

  const start = useCallback(
    async (unitId: string, stage: SparkQuestStage) => {
      if (
        screen.kind !== 'path' ||
        isStarting ||
        !stageEnabled(screen.path, unitId, stage)
      )
        return;
      setIsStarting(true);
      try {
        const session = await startSparkQuestSession(unitId, stage);
        setScreen({ kind: 'playing', path: screen.path, session });
      } catch (error) {
        setStartError(friendlyError(error));
      } finally {
        setIsStarting(false);
      }
    },
    [isStarting, screen],
  );

  useEffect(() => {
    if (!isEmbedded) return;
    const handleMessage = (
      event: MessageEvent<{
        source?: unknown;
        type?: unknown;
        unitId?: unknown;
        stage?: unknown;
      }>,
    ) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent
      )
        return;
      if (
        event.data?.source !== 'spark-portal' ||
        event.data.type !== 'spark-vocab-start'
      )
        return;
      if (typeof event.data.unitId !== 'string' || !isStage(event.data.stage))
        return;
      void start(event.data.unitId, event.data.stage);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isEmbedded, start]);

  useEffect(() => {
    if (!isEmbedded) return;
    if (screen.kind === 'playing') {
      postToPortal({ type: 'spark-vocab-start-state', state: 'playing' });
      return;
    }
    if (screen.kind !== 'path' || !selected) return;
    const unit = screen.path.units.find(item => item.id === selected.unitId);
    if (!unit) return;
    const stageInfo = STAGES.find(item => item.stage === selected.stage);
    postToPortal({
      type: 'spark-vocab-selection',
      selection: {
        unitId: unit.id,
        stage: selected.stage,
        label: `${unit.level} · 第${unit.unitOrder}单元 · ${stageInfo?.label ?? selected.stage}`,
        description: `${unit.itemCount} 个词 · ${stageInfo?.description ?? ''}`,
        canStart:
          stageEnabled(screen.path, unit.id, selected.stage) && !isStarting,
      },
    });
    if (startError) {
      postToPortal({
        type: 'spark-vocab-start-state',
        state: 'error',
        error: startError,
      });
    }
  }, [isEmbedded, isStarting, screen, selected, startError]);

  if (screen.kind === 'loading') {
    return (
      <div className='flex min-h-[60dvh] items-center justify-center text-(--secondary-color)'>
        <p>正在读取你的单词路径…</p>
      </div>
    );
  }

  if (screen.kind === 'error') {
    return (
      <div className='flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center text-(--secondary-color)'>
        <p>{screen.message}</p>
        <button
          type='button'
          className='rounded-xl bg-(--main-color) px-5 py-3 font-semibold text-white'
          onClick={() => void loadPath()}
        >
          重新加载
        </button>
      </div>
    );
  }

  if (screen.kind === 'playing') {
    return (
      <SparkVocabularyChallenge
        session={screen.session}
        onAnswer={async (answer, elapsedMs, requestId) => {
          const result = await answerSparkQuestSession(
            screen.session.sessionId,
            answer,
            elapsedMs,
            requestId,
          );
          return result;
        }}
        onSessionUpdate={session => {
          setScreen(current =>
            current.kind === 'playing' ? { ...current, session } : current,
          );
        }}
        onAbandon={async () => {
          try {
            await abandonSparkQuestSession(screen.session.sessionId);
          } finally {
            await loadPath();
          }
        }}
        onExit={() => void loadPath()}
      />
    );
  }

  return (
    <div className='flex min-h-[68dvh] flex-col gap-5 pb-12'>
      <div className='flex items-end justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-bold text-(--text-color)'>单词路径</h2>
          <p className='mt-1 text-sm text-(--secondary-color)'>
            {level.toUpperCase()} · 题目与计分由星火课程服务提供
          </p>
        </div>
        <button
          type='button'
          className='text-sm font-semibold text-(--main-color) underline underline-offset-4'
          onClick={() => void loadPath()}
        >
          刷新进度
        </button>
      </div>

      {screen.path.units.map((unit, index) => (
        <motion.section
          key={unit.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.015, 0.2) }}
          className={`rounded-3xl border p-5 shadow-sm ${
            unit.unlocked
              ? 'border-(--border-color) bg-(--card-color)'
              : 'border-(--border-color) bg-(--background-color) opacity-70'
          }`}
        >
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <p className='text-sm font-semibold text-(--secondary-color)'>
                第 {unit.unitOrder} 单元
              </p>
              <h3 className='mt-1 text-xl font-bold text-(--text-color)'>
                {unit.title}
              </h3>
              <p className='mt-1 text-sm text-(--secondary-color)'>
                {unit.itemCount} 个词{unit.titleJa ? ` · ${unit.titleJa}` : ''}
              </p>
            </div>
            <span className='rounded-full border border-(--border-color) px-3 py-1 text-xs font-semibold text-(--secondary-color)'>
              {unit.unlocked ? '已解锁' : '待解锁'}
            </span>
          </div>

          <div className='mt-4 grid gap-3 md:grid-cols-3'>
            {STAGES.map(({ stage, label, description }) => {
              const state = unit.stages[stage];
              const enabled = state.unlocked;
              return (
                <button
                  key={stage}
                  type='button'
                  disabled={!enabled || isStarting}
                  aria-pressed={
                    selected?.unitId === unit.id && selected.stage === stage
                  }
                  className={`rounded-2xl border-b-4 px-4 py-4 text-left transition ${
                    enabled
                      ? selected?.unitId === unit.id && selected.stage === stage
                        ? 'border-(--main-color) bg-(--main-color)/10 ring-2 ring-(--main-color)/20'
                        : 'border-(--main-color) bg-(--background-color) hover:-translate-y-0.5 hover:bg-(--card-color)'
                      : 'cursor-not-allowed border-(--border-color) bg-(--background-color) text-(--secondary-color)'
                  }`}
                  onClick={() => {
                    if (!enabled) return;
                    setSelected({ unitId: unit.id, stage });
                    setStartError(null);
                  }}
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-bold text-(--text-color)'>
                      {label}
                    </span>
                    <span
                      aria-label={`最佳 ${state.stars} 星`}
                      className='text-amber-500'
                    >
                      {'★'.repeat(state.stars)}
                      {'☆'.repeat(Math.max(0, 3 - state.stars))}
                    </span>
                  </div>
                  <p className='mt-1 text-sm text-(--secondary-color)'>
                    {description}
                  </p>
                  <p className='mt-3 text-sm font-semibold text-(--main-color)'>
                    {state.passed
                      ? '再次挑战'
                      : enabled
                        ? '选择此关'
                        : '请先完成前一关'}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.section>
      ))}

      {startError && (
        <p
          className='text-center text-sm font-semibold text-rose-600'
          role='alert'
        >
          {startError} 请重试。
        </p>
      )}

      {!isEmbedded && selected && (
        <div className='sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-2xl border border-(--main-color)/20 bg-(--card-color)/95 p-4 shadow-lg backdrop-blur'>
          <div className='min-w-0'>
            <p className='truncate font-semibold text-(--text-color)'>
              已选择第{' '}
              {
                screen.path.units.find(unit => unit.id === selected.unitId)
                  ?.unitOrder
              }{' '}
              单元
            </p>
            <p className='text-sm text-(--secondary-color)'>
              {STAGES.find(item => item.stage === selected.stage)?.label}
            </p>
          </div>
          <button
            type='button'
            className='shrink-0 rounded-xl bg-(--main-color) px-5 py-3 font-bold text-white disabled:opacity-50'
            disabled={
              isStarting ||
              !stageEnabled(screen.path, selected.unitId, selected.stage)
            }
            onClick={() => void start(selected.unitId, selected.stage)}
          >
            {isStarting ? '正在准备…' : '开始练习'}
          </button>
        </div>
      )}
    </div>
  );
}
