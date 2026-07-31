import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    onboardingCompleted: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      onboardingCompleted: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    onboardingCompleted: boolean;
  }
}

// `next-auth/jwt` re-exports the `JWT` interface from `@auth/core/jwt` without
// declaring it locally, so augmenting only the former does not merge into the
// type actually used by the `jwt`/`session` callback signatures.
declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    onboardingCompleted: boolean;
  }
}
