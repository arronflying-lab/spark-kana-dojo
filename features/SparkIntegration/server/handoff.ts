import { createHmac, timingSafeEqual } from 'node:crypto';

const HANDOFF_AUDIENCE = 'spark-kana-dojo-handoff';
const SESSION_AUDIENCE = 'spark-kana-dojo-session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type SignedPayload = {
  sub?: unknown;
  exp?: unknown;
  aud?: unknown;
};

function requiredSecret(): string {
  const secret = process.env.SPARK_KANA_DOJO_HANDOFF_SECRET?.trim();
  if (!secret) throw new Error('KanaDojo handoff secret is not configured.');
  return secret;
}

function encodePayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', requiredSecret())
    .update(payload)
    .digest('base64url');
}

function verify(token: string, audience: string): string | null {
  const separator = token.indexOf('.');
  if (separator < 1) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = Buffer.from(sign(payload), 'base64url');
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as SignedPayload;
    if (
      typeof parsed.sub !== 'string' ||
      typeof parsed.exp !== 'number' ||
      parsed.aud !== audience ||
      Date.now() > parsed.exp
    ) {
      return null;
    }
    return parsed.sub;
  } catch {
    return null;
  }
}

export function verifySparkKanaDojoHandoff(token: string): string | null {
  return verify(token, HANDOFF_AUDIENCE);
}

export function createSparkKanaDojoSession(accountId: string): string {
  const payload = encodePayload({
    sub: accountId,
    exp: Date.now() + SESSION_TTL_MS,
    aud: SESSION_AUDIENCE,
  });
  return `${payload}.${sign(payload)}`;
}

export function verifySparkKanaDojoSession(token: string): string | null {
  return verify(token, SESSION_AUDIENCE);
}
