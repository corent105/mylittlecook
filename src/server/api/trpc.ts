import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { getServerSession } from 'next-auth/next';
import { cookies } from 'next/headers';

import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;
  const session = req && res ? await getServerSession(req, res, authOptions) : null;
  
  return {
    db,
    session,
    req,
    res,
  };
};

// Version for App Router with fetch handler
export const createTRPCContextForFetch = async () => {
  // In App Router, we need to use cookies() to get session
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('next-auth.session-token')?.value || 
                      cookieStore.get('__Secure-next-auth.session-token')?.value;
  
  let session = null;
  if (sessionToken) {
    // Find user session from database
    const dbSession = await db.session.findUnique({
      where: { sessionToken },
      include: { user: true }
    });
    
    if (dbSession && dbSession.expires > new Date()) {
      session = {
        user: {
          id: dbSession.user.id,
          email: dbSession.user.email,
          name: dbSession.user.name,
          image: dbSession.user.image,
        },
        expires: dbSession.expires.toISOString(),
      };
    }
  }
  
  return {
    db,
    session,
  };
};

const t = initTRPC.context<typeof createTRPCContextForFetch>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Middleware to check if user is authenticated
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);