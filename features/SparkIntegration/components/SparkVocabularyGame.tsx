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

const STAGES: Array<{ stage: SparkQuestStage; label: string; description: string }> = [
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
  return Boolean(path.units.find(unit => unit.id === unitId)?.stages[stage].unlocked);
}

export default function SparkVocabularyGame({ level }: SparkVocabularyGameProps) {
  const [screen, setScreen] = useState<ScreenState>({ kind: 'loading' });
  const [isStarting, setIsStarting] = useState(false);

  const loadPath = useCallback(async () => {
    setScreen({ kind: 'loading' });
    try {
      const path = await getSparkQuestPath(level);
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
      if (screen.kind !== 'path' || isStarting || !stageEnabled(screen.path, unitId, stage)) return;
      setIsStarting(true);
      try {
        const session = await startSparkQuestSession(unitId, stage);
        setScreen({ kind: 'playing', path: screen.path, session });
      } catch (error) {
        setScreen({ kind: 'error', message: friendlyError(error) });
      } finally {
        setIsStarting(false);
      }
    },
    [isStarting, screen],
  );

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
              <p className='text-sm font-semibold text-(--secondary-color)'>第 {unit.unitOrder} 单元</p>
              <h3 className='mt-1 text-xl font-bold text-(--text-color)'>{unit.title}</h3>
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
                  className={`rounded-2xl border-b-4 px-4 py-4 text-left transition ${
                    enabled
                      ? 'border-(--main-color) bg-(--background-color) hover:-translate-y-0.5 hover:bg-(--card-color)'
                      : 'cursor-not-allowed border-(--border-color) bg-(--background-color) text-(--secondary-color)'
                  }`}
                  onClick={() => void start(unit.id, stage)}
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-bold text-(--text-color)'>{label}</span>
                    <span aria-label={`最佳 ${state.stars} 星`} className='text-amber-500'>
                      {'★'.repeat(state.stars)}{'☆'.repeat(Math.max(0, 3 - state.stars))}
                    </span>
                  </div>
                  <p className='mt-1 text-sm text-(--secondary-color)'>{description}</p>
                  <p className='mt-3 text-sm font-semibold text-(--main-color)'>
                    {state.passed ? '再次挑战' : enabled ? '开始' : '请先完成前一关'}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
