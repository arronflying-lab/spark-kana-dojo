'use client';

import { useEffect, useState } from 'react';
import type { VocabLevel } from '@/entities/vocabulary';
import { getSparkGrammar } from '../client';
import type { SparkGrammarRecord } from '../types';

type LoadState =
  | { status: 'loading'; requestKey: string }
  | { status: 'ready'; requestKey: string; records: SparkGrammarRecord[] }
  | { status: 'error'; requestKey: string; message: string };

type SparkGrammarStudyProps = {
  level: VocabLevel;
  limit?: number;
};

export default function SparkGrammarStudy({
  level,
  limit = 20,
}: SparkGrammarStudyProps) {
  const requestKey = `${level}:${limit}`;
  const [state, setState] = useState<LoadState>({
    status: 'loading',
    requestKey,
  });
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getSparkGrammar(level, limit)
      .then(records => {
        if (cancelled) return;
        setState(
          records.length > 0
            ? { status: 'ready', requestKey, records }
            : {
                status: 'error',
                requestKey,
                message:
                  'No publishable Spark grammar is available for this level.',
              },
        );
      })
      .catch(error => {
        if (cancelled) return;
        const message =
          error instanceof Error && /401/.test(error.message)
            ? 'Please log in to your Spark account to study grammar.'
            : 'Spark grammar is temporarily unavailable.';
        setState({ status: 'error', requestKey, message });
      });

    return () => {
      cancelled = true;
    };
  }, [level, limit, requestKey]);

  if (state.requestKey !== requestKey || state.status === 'loading') {
    return (
      <div className='flex min-h-[60dvh] items-center justify-center text-(--secondary-color)'>
        <p>Loading Spark grammar…</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className='flex min-h-[60dvh] items-center justify-center px-6 text-center text-(--secondary-color)'>
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <main className='mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6'>
      <header className='rounded-3xl border border-(--border-color) bg-(--card-color) p-6 shadow-sm'>
        <p className='text-sm font-semibold tracking-[0.18em] text-(--secondary-color) uppercase'>
          Spark Grammar · {level.toUpperCase()}
        </p>
        <h1 className='mt-2 text-3xl font-bold text-(--text-color)'>
          语法学习
        </h1>
        <p className='mt-2 text-(--secondary-color)'>
          语法单独读取星火数据库内容，不会混入单词题。
        </p>
      </header>

      <section
        className='grid gap-4 md:grid-cols-2'
        aria-label='Spark grammar points'
      >
        {state.records.map(record => {
          const expanded = record.slug === expandedSlug;
          return (
            <article
              key={record.syllabusPointId}
              className='rounded-2xl border border-(--border-color) bg-(--card-color) p-5 shadow-sm'
            >
              <button
                type='button'
                className='flex w-full items-start justify-between gap-4 text-left'
                aria-expanded={expanded}
                onClick={() => setExpandedSlug(expanded ? null : record.slug)}
              >
                <span>
                  <span className='block text-xl font-bold text-(--text-color)'>
                    {record.nameJa}
                  </span>
                  <span className='mt-1 block text-(--secondary-color)'>
                    {record.meaningZh}
                  </span>
                </span>
                <span className='shrink-0 text-sm font-semibold text-(--main-color)'>
                  {expanded ? '收起' : '查看'}
                </span>
              </button>

              {expanded && (
                <div className='mt-5 border-t border-(--border-color) pt-4'>
                  {record.examples.length > 0 ? (
                    <div className='space-y-3'>
                      {record.examples.slice(0, 3).map((example, index) => (
                        <div key={`${record.slug}-example-${index}`}>
                          <p className='text-lg text-(--text-color)'>
                            {example.jp}
                          </p>
                          {example.zh && (
                            <p className='mt-1 text-sm text-(--secondary-color)'>
                              {example.zh}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-(--secondary-color)'>
                      暂无例句。
                    </p>
                  )}

                  {record.lectureMd && (
                    <details className='mt-4 rounded-xl bg-(--background-color) p-3'>
                      <summary className='cursor-pointer font-semibold text-(--text-color)'>
                        查看已有讲解
                      </summary>
                      <div className='mt-3 text-sm leading-6 whitespace-pre-wrap text-(--secondary-color)'>
                        {record.lectureMd}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
