'use client';

import { useEffect, useState } from 'react';
import { VocabularyGame, useVocabSelection } from '@/features/Vocabulary';
import type { VocabLevel } from '@/entities/vocabulary';
import { getSparkVocabulary } from '../client';
import { toKanaDojoVocabulary } from '../types';

type LoadState =
  | { status: 'loading'; requestKey: string }
  | { status: 'ready'; requestKey: string }
  | { status: 'error'; requestKey: string; message: string };

type SparkVocabularyGameProps = {
  level: VocabLevel;
  limit?: number;
};

export default function SparkVocabularyGame({
  level,
  limit = 20,
}: SparkVocabularyGameProps) {
  const requestKey = `${level}:${limit}`;
  const { replaceVocab, clearVocab, setCollection, setSets, setGameMode } =
    useVocabSelection();
  const [state, setState] = useState<LoadState>({
    status: 'loading',
    requestKey,
  });

  useEffect(() => {
    let cancelled = false;
    replaceVocab([]);

    void getSparkVocabulary(level, limit)
      .then(records => {
        if (cancelled) return;
        if (records.length === 0) {
          setState({
            status: 'error',
            requestKey,
            message:
              'No publishable Spark vocabulary is available for this level.',
          });
          return;
        }

        replaceVocab(records.map(toKanaDojoVocabulary));
        setCollection(level);
        setSets([`Spark ${level.toUpperCase()}`]);
        setGameMode('Pick');
        setState({ status: 'ready', requestKey });
      })
      .catch(error => {
        if (cancelled) return;
        const message =
          error instanceof Error && /401/.test(error.message)
            ? 'Please log in to your Spark account to start.'
            : 'Spark vocabulary is temporarily unavailable.';
        setState({ status: 'error', requestKey, message });
      });

    return () => {
      cancelled = true;
      clearVocab();
    };
  }, [
    clearVocab,
    limit,
    level,
    replaceVocab,
    requestKey,
    setCollection,
    setGameMode,
    setSets,
  ]);

  if (state.requestKey !== requestKey) {
    return (
      <div className='flex min-h-[60dvh] items-center justify-center text-(--secondary-color)'>
        <p>Loading Spark vocabulary…</p>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className='flex min-h-[60dvh] items-center justify-center text-(--secondary-color)'>
        <p>Loading Spark vocabulary…</p>
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

  return <VocabularyGame />;
}
