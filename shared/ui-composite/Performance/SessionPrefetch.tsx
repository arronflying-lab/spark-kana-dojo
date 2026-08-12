'use client';

import { useEffect } from 'react';

const PREFETCH_KEY = 'kanadojo_prefetch_v1';

const basePath = process.env.NEXT_PUBLIC_KANA_DOJO_BASE_PATH ?? '';
const PREFETCH_URLS = [
  `${basePath}/data-kanji/decorations.json`,
  `${basePath}/data-kanji/N5.json`,
  `${basePath}/data-vocab/n5.json`,
  `${basePath}/api/facts`,
];

export default function SessionPrefetch() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem(PREFETCH_KEY)) return;
      sessionStorage.setItem(PREFETCH_KEY, '1');

      PREFETCH_URLS.forEach(url => {
        fetch(url).catch(() => {
          // Best-effort prefetch. Ignore failures.
        });
      });
    } catch {
      // sessionStorage may be unavailable (privacy modes). Ignore and skip.
    }
  }, []);

  return null;
}
