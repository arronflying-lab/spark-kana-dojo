'use client';

import { useEffect } from 'react';

const EMBED_ORIGIN = 'spark-kana-dojo';

export default function SparkEmbedBridge() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('embed') !== 'spark' || window.parent === window) return;

    const postHeight = () => {
      const body = document.body;
      const root = document.documentElement;
      const height = Math.max(
        root.scrollHeight,
        root.offsetHeight,
        body?.scrollHeight ?? 0,
        body?.offsetHeight ?? 0,
      );

      window.parent.postMessage(
        { source: EMBED_ORIGIN, type: 'spark-vocab-resize', height },
        window.location.origin,
      );
    };

    const observer = new ResizeObserver(postHeight);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
    window.addEventListener('resize', postHeight);
    postHeight();
    const initialTimer = window.setTimeout(postHeight, 150);

    return () => {
      window.clearTimeout(initialTimer);
      observer.disconnect();
      window.removeEventListener('resize', postHeight);
    };
  }, []);

  return null;
}
