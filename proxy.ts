import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './core/i18n/routing';
import {
  hasLocalePrefix,
  isTranslatorPath,
} from './shared/utils/translator-routing';

// Create intl middleware once at module level (more efficient)
const intlMiddleware = createMiddleware(routing);
const translatorMiddleware = createMiddleware({
  ...routing,
  localeDetection: false,
  alternateLinks: false,
});

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const routePathname = pathname.replace(/^\/kanadojo(?=\/|$)/, '') || '/';

  // Fast path - skip for paths that don't need locale handling
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_vercel') ||
    pathname.startsWith('/monitoring') ||
    pathname.startsWith('/healthcheck') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // next-intl internally rewrites localePrefix: never routes to /kanadojo/en/*
  // (or /kanadojo/es/*). Let that internal route reach the App Router instead
  // of running locale negotiation a second time and creating a redirect loop.
  if (hasLocalePrefix(routePathname)) {
    return NextResponse.next();
  }

  if (isTranslatorPath(pathname)) {
    const response = translatorMiddleware(request);
    response.headers.set('x-locale', 'en');
    return response;
  }

  // Locale prefix is disabled; derive locale from cookie, then Accept-Language.
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const acceptLanguage = request.headers.get('accept-language') ?? '';
  const preferredLocale = acceptLanguage.toLowerCase().startsWith('es')
    ? 'es'
    : 'en';
  const locale = cookieLocale === 'es' || cookieLocale === 'en'
    ? cookieLocale
    : preferredLocale;

  // Use next-intl middleware for locale handling
  const response = intlMiddleware(request);
  response.headers.set('x-locale', locale);

  return response;
}

export const config = {
  // More restrictive matcher - only match actual page routes
  // Excludes: api, _next, _vercel, static files, and common bot endpoints
  matcher: ['/((?!api|_next|_vercel|monitoring|healthcheck|.*\\..*).*)'],
};
