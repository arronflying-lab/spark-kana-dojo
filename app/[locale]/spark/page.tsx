import type { Metadata } from 'next';
import { routing } from '@/core/i18n/routing';
import SparkLearningHub from '@/features/SparkIntegration/components/SparkLearningHub';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Spark Learning',
  robots: { index: false, follow: false },
};

export default function SparkLearningPage() {
  return <SparkLearningHub />;
}
