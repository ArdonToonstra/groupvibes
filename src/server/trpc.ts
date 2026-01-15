import { initTRPC, TRPCError } from '@trpc/server'
import { headers } from 'next/headers'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { auth } from '@/lib/better-auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Context passed to all tRPC procedures
 */
export const createTRPCContext = async () => {
  const headersList = await headers()
  
  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: headersList,
  })

  return {
    db,
    session,
    user: session?.user ?? null,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * Create a router
 */
export const createTRPCRouter = t.router

/**
 * Create a caller factory for server-side calls
 */
export const createCallerFactory = t.createCallerFactory

/**
 * Public procedure - no auth required
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
  }

  // Get full user data from database
  const dbUser = await ctx.db.query.users.findFirst({
    where: eq(users.id, ctx.user.id),
    with: {
      group: true,
    },
  })

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      dbUser,
    },
  })
})

/**
 * Group member procedure - requires user to be in a group
 */
export const groupMemberProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.dbUser?.groupId) {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'You must be in a group to perform this action' 
    })
  }

  return next({
    ctx: {
      ...ctx,
      groupId: ctx.dbUser.groupId,
    },
  })
})
