import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { pushSubscriptions } from '@/db/schema'

export const pushRouter = createTRPCRouter({
  // Subscribe to push notifications
  subscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string(),
      p256dh: z.string(),
      auth: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if subscription already exists
      const existing = await ctx.db.query.pushSubscriptions.findFirst({
        where: eq(pushSubscriptions.endpoint, input.endpoint),
      })
      
      if (existing) {
        return { success: true, message: 'Already subscribed' }
      }
      
      await ctx.db.insert(pushSubscriptions).values({
        userId: ctx.user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      })
      
      return { success: true }
    }),

  // Unsubscribe from push notifications
  unsubscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, input.endpoint))
      
      return { success: true }
    }),

  // Get user's subscriptions
  list: protectedProcedure.query(async ({ ctx }) => {
    const subs = await ctx.db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, ctx.user.id),
    })
    
    return subs
  }),
})
