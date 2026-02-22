import { z } from 'zod'
import { eq, desc, and, gt, lt, isNull, or, sql, inArray } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { checkIns, userGroups, users } from '@/db/schema'

// 24 hours in milliseconds
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

export const checkInsRouter = createTRPCRouter({
  // Get check-ins (user's own or active group's members)
  list: protectedProcedure
    .input(z.object({
      scope: z.enum(['user', 'group']).default('user'),
      groupId: z.string().optional(), // Optional: specific group, otherwise uses activeGroupId
      cursor: z.string().optional(), // ISO timestamp
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const scope = input?.scope ?? 'user'

      if (scope === 'group') {
        // Get the group to query - either specified or active group
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.user.id),
        })

        const targetGroupId = input?.groupId ?? user?.activeGroupId

        if (!targetGroupId) {
          return { docs: [], totalDocs: 0 }
        }

        // Verify user is a member of this group
        const membership = await ctx.db.query.userGroups.findFirst({
          where: and(
            eq(userGroups.userId, ctx.user.id),
            eq(userGroups.groupId, targetGroupId)
          ),
        })

        if (!membership) {
          return { docs: [], totalDocs: 0 }
        }

        // Get all members of the group
        const groupMemberships = await ctx.db.query.userGroups.findMany({
          where: eq(userGroups.groupId, targetGroupId),
        })

        const memberIds = groupMemberships.map(m => m.userId)

        if (memberIds.length === 0) {
          return { docs: [], totalDocs: 0 }
        }

        // Get check-ins from all group members
        // Include check-ins that are either:
        // 1. Specifically for this group (groupId matches)
        // 2. Shared globally (groupId is null)
        const limit = input?.limit
        const cursorDate = input?.cursor ? new Date(input.cursor) : undefined

        const conditions = [inArray(checkIns.userId, memberIds)]
        conditions.push(
          or(
            eq(checkIns.groupId, targetGroupId),
            isNull(checkIns.groupId)
          ) as any
        )

        if (cursorDate) {
          conditions.push(lt(checkIns.createdAt, cursorDate))
        }

        const results = await ctx.db.query.checkIns.findMany({
          where: and(...conditions),
          orderBy: desc(checkIns.createdAt),
          limit: limit ? limit + 1 : undefined,
          with: {
            user: true,
          },
        })

        let nextCursor: string | undefined = undefined
        if (limit && results.length > limit) {
          const nextItem = results.pop()
          nextCursor = nextItem?.createdAt.toISOString()
        }

        return { docs: results, totalDocs: results.length, nextCursor }
      }

      const limit = input?.limit
      const cursorDate = input?.cursor ? new Date(input.cursor) : undefined

      const conditions = [eq(checkIns.userId, ctx.user.id)]
      if (cursorDate) {
        conditions.push(lt(checkIns.createdAt, cursorDate))
      }

      // Default: user's own check-ins
      const results = await ctx.db.query.checkIns.findMany({
        where: and(...conditions),
        orderBy: desc(checkIns.createdAt),
        limit: limit ? limit + 1 : undefined,
        with: {
          user: true,
        },
      })

      let nextCursor: string | undefined = undefined
      if (limit && results.length > limit) {
        const nextItem = results.pop()
        nextCursor = nextItem?.createdAt.toISOString()
      }

      return { docs: results, totalDocs: results.length, nextCursor }
    }),

  // Create a check-in (associated with active group unless sharing globally)
  create: protectedProcedure
    .input(z.object({
      vibeScore: z.number().min(1).max(10),
      tags: z.array(z.string()).optional(),
      customNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's sharing preference and active group
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      })

      // If shareCheckInsGlobally is true, groupId = null (visible to all groups)
      // Otherwise, associate with active group (per-group check-in)
      const groupId = user?.shareCheckInsGlobally ? null : (user?.activeGroupId ?? null)

      const [newCheckIn] = await ctx.db.insert(checkIns).values({
        userId: ctx.user.id,
        groupId,
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

  // Update a check-in (only own, within 24 hours)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      vibeScore: z.number().min(1).max(10),
      tags: z.array(z.string()).optional(),
      customNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const checkIn = await ctx.db.query.checkIns.findFirst({
        where: eq(checkIns.id, input.id),
      })

      if (!checkIn) {
        throw new Error('Check-in not found')
      }

      if (checkIn.userId !== ctx.user.id) {
        throw new Error('Unauthorized: You can only edit your own check-ins')
      }

      // Check if within 24-hour edit window
      const createdAt = new Date(checkIn.createdAt).getTime()
      const now = Date.now()
      if (now - createdAt > EDIT_WINDOW_MS) {
        throw new Error('Check-ins can only be edited within 24 hours of creation')
      }

      const [updatedCheckIn] = await ctx.db.update(checkIns)
        .set({
          vibeScore: input.vibeScore,
          tags: input.tags ?? [],
          customNote: input.customNote,
          updatedAt: new Date(),
        })
        .where(eq(checkIns.id, input.id))
        .returning()

      return updatedCheckIn
    }),
})
