import type { Metadata } from 'next';
import { routing } from '@/core/i18n/routing';
import SparkVocabularyGame from '@/features/SparkIntegration/components/SparkVocabularyGame';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Spark Vocabulary Practice',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SparkVocabularyPage() {
  return <SparkVocabularyGame level='n5' />;
}
