'use client';

import { useEffect, useState } from 'react';
import type { VocabLevel } from '@/entities/vocabulary';
import SparkGrammarStudy from './SparkGrammarStudy';
import SparkVocabularyGame from './SparkVocabularyGame';

type LearningMode = 'vocabulary' | 'grammar';

const LEVELS: VocabLevel[] = ['n5', 'n4', 'n3', 'n2', 'n1'];

function readHandoffFromHash(): string | null {
  const prefix = '#spark-handoff=';
  if (!window.location.hash.startsWith(prefix)) return null;
  const encoded = window.location.hash.slice(prefix.length);
  if (!encoded || encoded.length > 4096) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

export default function SparkLearningHub() {
  const [mode, setMode] = useState<LearningMode>('vocabulary');
  const [level, setLevel] = useState<VocabLevel>('n5');
  const [authState, setAuthState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const handoff = readHandoffFromHash();
    if (!handoff) {
      setAuthState('ready');
      return;
    }

    let cancelled = false;
    void fetch(
      `${process.env.NEXT_PUBLIC_KANA_DOJO_BASE_PATH ?? ''}/api/spark-session/handoff`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: handoff }),
      },
    )
      .then(response => {
        if (!response.ok) throw new Error('handoff failed');
        if (cancelled) return;
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}${window.location.search}`,
        );
        setAuthState('ready');
      })
      .catch(() => {
        if (!cancelled) setAuthState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === 'loading') {
    return (
      <div className='flex min-h-[60dvh] items-center justify-center text-(--secondary-color)'>
        <p>正在验证星火登录状态……</p>
      </div>
    );
  }

  if (authState === 'error') {
    return (
      <div className='flex min-h-[60dvh] items-center justify-center px-6 text-center text-(--secondary-color)'>
        <p>星火登录交接已失效，请从星火门户重新进入。</p>
      </div>
    );
  }

  return (
    <main className='mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8'>
      <header className='rounded-3xl border border-(--border-color) bg-(--card-color) p-6 shadow-sm'>
        <p className='text-sm font-semibold tracking-[0.18em] text-(--secondary-color) uppercase'>
          Spark Learning
        </p>
        <h1 className='mt-2 text-3xl font-bold text-(--text-color)'>
          单词与语法学习
        </h1>
        <p className='mt-2 text-(--secondary-color)'>
          学习内容来自星火数据库；单词游戏使用 KanaDojo 的成熟游戏框架，语法内容保持独立，不混入单词题。
        </p>
      </header>

      <nav
        className='flex flex-wrap gap-2 rounded-2xl border border-(--border-color) bg-(--card-color) p-2'
        aria-label='学习内容类型'
      >
        {(
          [
            ['vocabulary', '单词闯关'],
            ['grammar', '语法学习'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type='button'
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === value
                ? 'bg-(--main-color) text-white'
                : 'text-(--secondary-color) hover:bg-(--background-color)'
            }`}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className='flex flex-wrap items-center gap-2' aria-label='JLPT 等级'>
        <span className='mr-2 text-sm font-semibold text-(--secondary-color)'>等级</span>
        {LEVELS.map(item => (
          <button
            key={item}
            type='button'
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              level === item
                ? 'border-(--main-color) bg-(--main-color) text-white'
                : 'border-(--border-color) bg-(--card-color) text-(--secondary-color) hover:border-(--main-color)'
            }`}
            aria-pressed={level === item}
            onClick={() => setLevel(item)}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </section>

      {mode === 'vocabulary' ? (
        <SparkVocabularyGame key={`vocabulary-${level}`} level={level} limit={20} />
      ) : (
        <SparkGrammarStudy key={`grammar-${level}`} level={level} limit={20} />
      )}
    </main>
  );
}
