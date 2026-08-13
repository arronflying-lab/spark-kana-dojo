import type { VocabLevel } from '@/entities/vocabulary';

export type SparkQuestLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
export type SparkQuestStage = 'recognize' | 'reinforce' | 'challenge';

export type SparkQuestOption = {
  id: string;
  label: string;
};

export type SparkQuestQuestion =
  | {
      index: number;
      type:
        | 'meaning_choice'
        | 'headword_choice'
        | 'kana_to_kanji_choice'
        | 'kanji_to_kana_choice'
        | 'context_choice';
      prompt: string;
      options: SparkQuestOption[];
      vocabSlug: string;
      exampleSentence?: { jp?: string | null; zh?: string | null } | null;
    }
  | {
      index: number;
      type: 'reading_tiles';
      prompt: string;
      tiles: SparkQuestOption[];
      answerLength: number;
      vocabSlug: string;
    }
  | {
      // Old sessions may still contain this type. New sessions never generate it.
      index: number;
      type: 'reading_input';
      prompt: string;
      placeholder: string;
      vocabSlug: string;
    }
  | {
      index: number;
      type: 'matching';
      prompt: string;
      pairs: Array<{ id: string; label: string }>;
      options: SparkQuestOption[];
    };

export type SparkQuestSummary = {
  sessionId: string;
  status: 'active' | 'passed' | 'failed' | 'abandoned' | 'expired';
  hearts: number;
  maxHearts: number;
  progress: number;
  questionIndex: number;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  stars: number | null;
  xpAwarded: number;
};

export type SparkQuestSession = SparkQuestSummary & {
  currentQuestion: SparkQuestQuestion | null;
};

export type SparkQuestPathUnit = {
  id: string;
  level: SparkQuestLevel;
  unitOrder: number;
  title: string;
  titleJa: string | null;
  itemCount: number;
  unlocked: boolean;
  stages: Record<
    SparkQuestStage,
    { unlocked: boolean; passed: boolean; stars: number; directChallengeUnlocked?: boolean }
  >;
};

export type SparkQuestPath = {
  available: boolean;
  enabled: boolean;
  level: SparkQuestLevel;
  units: SparkQuestPathUnit[];
};

export type SparkQuestAnswer =
  | { optionId: string }
  | { mapping: Record<string, string> }
  | { tileIds: string[] };

export type SparkQuestAnswerResult = {
  alreadyProcessed: boolean;
  isCorrect: boolean;
  feedback: {
    correctHeadword: string;
    correctReading: string;
    meaningZh: string;
    exampleSentence: { jp?: string | null; zh?: string | null } | null;
  };
  summary: SparkQuestSummary;
  currentQuestion: SparkQuestQuestion | null;
  failureReview: Array<{
    slug: string;
    headword: string;
    reading: string;
    meaningZh: string;
    exampleSentence: { jp?: string | null; zh?: string | null } | null;
  }>;
};

export class SparkQuestRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SparkQuestRequestError';
  }
}

export function toSparkQuestLevel(level: VocabLevel): SparkQuestLevel {
  return level.toUpperCase() as SparkQuestLevel;
}

function portalUrl(path: string) {
  const configured = process.env.NEXT_PUBLIC_SPARK_PORTAL_BASE_PATH?.trim() ?? '';
  const basePath = configured === '/' ? '' : configured.replace(/\/$/, '');
  return `${basePath}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(portalUrl(path), {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: unknown })
    | { error?: unknown }
    | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && typeof payload.error === 'string'
        ? payload.error
        : '单词闯关服务暂时不可用。';
    throw new SparkQuestRequestError(message, response.status);
  }
  return payload as T;
}

export async function getSparkQuestPath(level: VocabLevel): Promise<SparkQuestPath> {
  return request<SparkQuestPath>(
    `/api/portal/vocab-quest/path?level=${encodeURIComponent(toSparkQuestLevel(level))}`,
  );
}

export async function startSparkQuestSession(
  unitId: string,
  stage: SparkQuestStage,
): Promise<SparkQuestSession> {
  const payload = await request<{
    sessionId: string;
    currentQuestion: SparkQuestQuestion | null;
    hearts: number;
    progress: number;
    summary: SparkQuestSession;
  }>('/api/portal/vocab-quest/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unitId, stage }),
  });
  return {
    ...payload.summary,
    sessionId: payload.sessionId,
    hearts: payload.hearts,
    progress: payload.progress,
    currentQuestion: payload.currentQuestion,
  };
}

export async function answerSparkQuestSession(
  sessionId: string,
  response: SparkQuestAnswer,
  elapsedMs: number,
  requestId: string,
): Promise<SparkQuestAnswerResult> {
  return request<SparkQuestAnswerResult>(
    `/api/portal/vocab-quest/sessions/${encodeURIComponent(sessionId)}/answer`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response, elapsedMs, requestId }),
    },
  );
}

export async function abandonSparkQuestSession(sessionId: string): Promise<void> {
  await request<{ ok: true }>(
    `/api/portal/vocab-quest/sessions/${encodeURIComponent(sessionId)}/abandon`,
    { method: 'POST' },
  );
}
