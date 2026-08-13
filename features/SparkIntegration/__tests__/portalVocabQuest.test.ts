import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  answerSparkQuestSession,
  getSparkQuestPath,
  startSparkQuestSession,
  toSparkQuestLevel,
} from '../portalVocabQuest';

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Spark portal vocabulary quest adapter', () => {
  it('maps KanaDojo level selectors to the portal course level contract', () => {
    expect(toSparkQuestLevel('n5')).toBe('N5');
    expect(toSparkQuestLevel('n1')).toBe('N1');
  });

  it('uses the existing portal API for path, session start, and atomic answers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ available: true, enabled: true, level: 'N5', units: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          sessionId: '11111111-1111-4111-8111-111111111111',
          hearts: 3,
          progress: 0,
          currentQuestion: null,
          summary: {
            sessionId: '11111111-1111-4111-8111-111111111111',
            status: 'active',
            hearts: 3,
            maxHearts: 3,
            progress: 0,
            questionIndex: 0,
            questionCount: 12,
            correctCount: 0,
            wrongCount: 0,
            stars: null,
            xpAwarded: 0,
            currentQuestion: null,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          alreadyProcessed: false,
          isCorrect: true,
          feedback: { correctHeadword: '学校', correctReading: 'がっこう', meaningZh: '学校', exampleSentence: null },
          summary: {
            sessionId: '11111111-1111-4111-8111-111111111111',
            status: 'active',
            hearts: 3,
            maxHearts: 3,
            progress: 0.1,
            questionIndex: 1,
            questionCount: 12,
            correctCount: 1,
            wrongCount: 0,
            stars: null,
            xpAwarded: 10,
          },
          currentQuestion: null,
          failureReview: [],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await getSparkQuestPath('n5');
    await startSparkQuestSession('22222222-2222-4222-8222-222222222222', 'recognize');
    await answerSparkQuestSession(
      '11111111-1111-4111-8111-111111111111',
      { optionId: 'q0-o1' },
      420,
      '33333333-3333-4333-8333-333333333333',
    );

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/portal/vocab-quest/path?level=N5');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/portal/vocab-quest/sessions');
    expect(JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))).toEqual({
      unitId: '22222222-2222-4222-8222-222222222222',
      stage: 'recognize',
    });
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      '/api/portal/vocab-quest/sessions/11111111-1111-4111-8111-111111111111/answer',
    );
    expect(JSON.parse(String((fetchMock.mock.calls[2]?.[1] as RequestInit).body))).toEqual({
      response: { optionId: 'q0-o1' },
      elapsedMs: 420,
      requestId: '33333333-3333-4333-8333-333333333333',
    });
  });
});
