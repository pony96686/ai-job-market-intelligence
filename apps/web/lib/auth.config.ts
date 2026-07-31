import type { NextAuthConfig } from 'next-auth';

// Edge-safe subset: no PrismaAdapter / providers, used by middleware.ts to
// build its own auth() instance that does not depend on Prisma. Middleware
// runs in the Edge Runtime by default, and @ai-job-market-intelligence/db's Prisma Client cannot
// run there (the native query engine depends on Node.js APIs) — importing the
// full lib/auth.ts directly from middleware would fail after a Vercel deploy.
// Full config (with adapter/providers) lives in lib/auth.ts.
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/login?sent=true',
    error: '/login?error=true',
  },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.id = user.id;
        token.onboardingCompleted = user.onboardingCompleted;
      }
      // Triggered by the client calling useSession().update(...), used to
      // refresh fields in the JWT after a server-side data change (e.g.
      // completing onboarding) — a JWT session does not automatically pick up
      // database changes, so without this middleware would keep reading the
      // stale value and loop the redirect.
      if (trigger === 'update' && session?.onboardingCompleted !== undefined) {
        token.onboardingCompleted = session.onboardingCompleted;
      }
      return token;
    },
    async session({ session, token }) {
      // next-auth@5 beta's session callback derives the token parameter type
      // via internal intersection typing that does not pick up the
      // next-auth/jwt module augmentation, so we assert based on the fields
      // we know the jwt callback writes.
      session.user.id = token.id as string;
      session.user.onboardingCompleted = token.onboardingCompleted as boolean;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Post-Magic-Link-verification redirect is handled by middleware
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
} satisfies NextAuthConfig;
