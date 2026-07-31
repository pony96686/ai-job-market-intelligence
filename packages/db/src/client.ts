import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  globalForPrisma.prisma ??= new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  return globalForPrisma.prisma;
}

// Deferred behind a Proxy so importing this module has no side effects —
// `new PrismaClient()` reads DATABASE_URL from process.env and throws
// immediately if it's missing, which broke `next build`'s page-data
// collection step (it imports every route module, including this one,
// without a real runtime env). Construction now only happens on first
// property access, i.e. the first actual database call.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getPrismaClient(), prop);
  },
});

export * from '@prisma/client';
export * from './vectors';
export * from './company';
