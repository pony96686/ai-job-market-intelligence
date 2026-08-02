import NextAuth from 'next-auth';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';
import { routing } from '@/i18n/routing';

// Edge-safe subset: no PrismaAdapter / providers, used to build a standalone
// auth() instance that does not depend on Prisma. Middleware runs in the Edge
// Runtime by default, and @ai-job-market-intelligence/db's Prisma Client cannot run there (the
// native query engine depends on Node.js APIs) — importing the full
// lib/auth.ts directly from middleware would fail after a Vercel deploy.
const { auth } = NextAuth(authConfig);
const handleI18nRouting = createIntlMiddleware(routing);

const PUBLIC_PAGE_ROUTES = ['/login', '/pricing', '/market'];
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/v1/auth',
  '/api/v1/health',
  '/api/v1/webhooks',
  '/api/test',
  '/api/v1/skills',
];
const ONBOARDING_ROUTE = '/onboarding';

const LOCALE_PREFIX_PATTERN = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`);

function stripLocale(pathname: string): { locale: string; path: string } {
  const match = pathname.match(LOCALE_PREFIX_PATTERN);
  if (!match) return { locale: routing.defaultLocale, path: pathname };
  const rest = pathname.slice(match[0].length);
  return { locale: match[1], path: rest === '' ? '/' : rest };
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // API routes live outside the [locale] segment and return JSON, not
  // locale-prefixed redirects, so they bypass next-intl routing entirely.
  if (pathname.startsWith('/api/')) {
    const isPublicApi = PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r));

    if (!session) {
      if (isPublicApi) return NextResponse.next();
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    if (!session.user.onboardingCompleted) {
      // /api/auth must stay open: useSession().update() POSTs to
      // /api/auth/session to write the completed-onboarding flag back into
      // the JWT. Blocking it here would deadlock the only request that can
      // ever clear onboardingCompleted=false.
      if (
        pathname.startsWith('/api/v1/users/me/profile') ||
        pathname.startsWith('/api/v1/users/me/resume') ||
        pathname.startsWith('/api/v1/users/me/github') ||
        pathname.startsWith('/api/auth')
      ) {
        return NextResponse.next();
      }
      if (!isPublicApi) {
        return NextResponse.json(
          { error: { code: 'PROFILE_INCOMPLETE', message: 'Complete onboarding first' } },
          { status: 400 },
        );
      }
    }

    return NextResponse.next();
  }

  // Let next-intl resolve the locale prefix first. Paths without one (fresh
  // visits, old bookmarks) get redirected to add it based on the user's
  // cookie / Accept-Language — defer to that redirect and re-apply the auth
  // rules below once the follow-up request already carries a locale prefix.
  const intlResponse = handleI18nRouting(req);
  if (intlResponse.headers.get('location')) {
    return intlResponse;
  }

  const { locale, path } = stripLocale(pathname);
  const isPublicPage = PUBLIC_PAGE_ROUTES.some((r) => path.startsWith(r));

  function redirectTo(target: string) {
    const response = NextResponse.redirect(new URL(`/${locale}${target}`, req.url));
    const setCookie = intlResponse.headers.get('set-cookie');
    if (setCookie) response.headers.set('set-cookie', setCookie);
    return response;
  }

  if (!session) {
    if (isPublicPage) return intlResponse;
    return redirectTo('/login');
  }

  if (!session.user.onboardingCompleted && path !== ONBOARDING_ROUTE) {
    return redirectTo(ONBOARDING_ROUTE);
  }

  if (session.user.onboardingCompleted && path === ONBOARDING_ROUTE) {
    return redirectTo('/dashboard');
  }

  if (path === '/login') {
    return redirectTo('/dashboard');
  }

  return intlResponse;
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
