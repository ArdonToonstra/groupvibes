import { z } from 'zod'
import { eq, desc, and, gt, isNull, sql } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { checkIns } from '@/db/schema'

export const checkInsRouter = createTRPCRouter({
  // Get check-ins (user's own or group's)
  list: protectedProcedure
    .input(z.object({
      scope: z.enum(['user', 'group']).default('user'),
    }).optional())
    .query(async ({ ctx, input }) => {
      const scope = input?.scope ?? 'user'
      
      if (scope === 'group') {
        if (!ctx.dbUser?.groupId) {
          return { docs: [], totalDocs: 0 }
        }
        
        const results = await ctx.db.query.checkIns.findMany({
          where: eq(checkIns.groupId, ctx.dbUser.groupId),
          orderBy: desc(checkIns.createdAt),
          with: {
            user: true,
          },
        })
        
        return { docs: results, totalDocs: results.length }
      }
      
      // Default: user's own check-ins
      const results = await ctx.db.query.checkIns.findMany({
        where: eq(checkIns.userId, ctx.user.id),
        orderBy: desc(checkIns.createdAt),
        with: {
          user: true,
        },
      })
      
      return { docs: results, totalDocs: results.length }
    }),

  // Create a check-in
  create: protectedProcedure
    .input(z.object({
      vibeScore: z.number().min(1).max(10),
      tags: z.array(z.string()).optional(),
      customNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [newCheckIn] = await ctx.db.insert(checkIns).values({
        userId: ctx.user.id,
        groupId: ctx.dbUser?.groupId ?? null,
        vibeScore: input.vibeScore,
        tags: input.tags ?? [],
        customNote: input.customNote,
      }).returning()
      
      return newCheckIn
    }),

  // Delete a check-in (only own)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const checkIn = await ctx.db.query.checkIns.findFirst({
        where: eq(checkIns.id, input.id),
      })
      
      if (!checkIn || checkIn.userId !== ctx.user.id) {
        throw new Error('Check-in not found or unauthorized')
      }
      
      await ctx.db.delete(checkIns).where(eq(checkIns.id, input.id))
      
      return { success: true }
    }),

  // Get user's latest check-in
  getLatest: protectedProcedure.query(async ({ ctx }) => {
    const latest = await ctx.db.query.checkIns.findFirst({
      where: eq(checkIns.userId, ctx.user.id),
      orderBy: desc(checkIns.createdAt),
    })
    
    return latest ?? null
  }),
})
