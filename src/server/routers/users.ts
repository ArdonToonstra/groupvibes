import { z } from 'zod'
import { eq, and, gt, desc, count } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { users, groups, checkIns, pushSubscriptions } from '@/db/schema'
import { TRPCError } from '@trpc/server'

export const usersRouter = createTRPCRouter({
  // Get current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      with: {
        group: true,
      },
    })
    
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }
    
    return user
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users)
        .set(input)
        .where(eq(users.id, ctx.user.id))
      
      return { success: true }
    }),

  // Leave current group
  leaveGroup: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.update(users)
      .set({ groupId: null })
      .where(eq(users.id, ctx.user.id))
    
    return { success: true }
  }),

  // Delete account
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id
    
    // Delete all check-ins by this user
    await ctx.db.delete(checkIns).where(eq(checkIns.userId, userId))
    
    // Delete all push subscriptions
    await ctx.db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
    
    // Find and delete groups owned by this user
    const ownedGroups = await ctx.db.query.groups.findMany({
      where: eq(groups.ownerId, userId),
    })
    
    for (const group of ownedGroups) {
      // Remove all members from this group first
      await ctx.db.update(users)
        .set({ groupId: null })
        .where(eq(users.groupId, group.id))
      
      // Delete the group
      await ctx.db.delete(groups).where(eq(groups.id, group.id))
    }
    
    // Delete the user (Better Auth user table is unified)
    await ctx.db.delete(users).where(eq(users.id, userId))
    
    // Also clean up Better Auth sessions and accounts
    // Note: These are in the same database
    const { sql } = await import('drizzle-orm')
    await ctx.db.execute(sql`DELETE FROM "session" WHERE "userId" = ${userId}`)
    await ctx.db.execute(sql`DELETE FROM "account" WHERE "userId" = ${userId}`)
    
    return { success: true, message: 'Account deleted successfully' }
  }),
})
