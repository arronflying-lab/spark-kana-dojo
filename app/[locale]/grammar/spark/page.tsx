import type { Metadata } from 'next';
import { routing } from '@/core/i18n/routing';
import SparkGrammarStudy from '@/features/SparkIntegration/components/SparkGrammarStudy';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Spark Grammar Study',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SparkGrammarPage() {
  return <SparkGrammarStudy level='n5' limit={20} />;
}
