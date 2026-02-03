import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { pushSubscriptions, users } from '@/db/schema'
import { sendNotification } from '@/lib/web-push'

/**
 * Check if a hostname ends with or equals a given domain
 * This is safe because it validates the actual hostname, not arbitrary URL parts
 */
function hostMatchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith('.' + domain)
}

/**
 * Extract device/browser info from push subscription endpoint
 * Uses proper URL parsing to avoid substring matching vulnerabilities
 */
function extractDeviceInfo(endpoint: string): { browser: string; platform: string } {
  let browser = 'Unknown'
  let platform = 'Unknown'
  
  try {
    const parsedUrl = new URL(endpoint)
    const hostname = parsedUrl.hostname.toLowerCase()
    
    // Detect browser from endpoint hostname using safe domain matching
    if (hostMatchesDomain(hostname, 'fcm.googleapis.com') || 
        hostMatchesDomain(hostname, 'firebase.google.com') ||
        hostMatchesDomain(hostname, 'firebaseinstallations.googleapis.com')) {
      browser = 'Chrome/Edge'
    } else if (hostMatchesDomain(hostname, 'push.services.mozilla.com') ||
               hostMatchesDomain(hostname, 'updates.push.services.mozilla.com')) {
      browser = 'Firefox'
    } else if (hostMatchesDomain(hostname, 'push.apple.com') ||
               hostMatchesDomain(hostname, 'web.push.apple.com')) {
      browser = 'Safari'
      platform = 'Apple'
    } else if (hostMatchesDomain(hostname, 'notify.windows.com') ||
               hostMatchesDomain(hostname, 'wns.windows.com')) {
      browser = 'Edge'
      platform = 'Windows'
    }
  } catch {
    // Invalid URL, return unknown
    return { browser: 'Unknown', platform: 'Unknown' }
  }
  
  // Default platform for web browsers
  if (platform === 'Unknown') {
    platform = 'Desktop/Web'
  }
  
  return { browser, platform }
}

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
        // Update existing subscription with current session ID
        await ctx.db.update(pushSubscriptions)
          .set({
            userId: ctx.user.id,
            sessionId: ctx.session.session.id,
            p256dh: input.p256dh,
            auth: input.auth,
            updatedAt: new Date(),
          })
          .where(eq(pushSubscriptions.endpoint, input.endpoint))
        return { success: true, message: 'Subscription updated' }
      }

      await ctx.db.insert(pushSubscriptions).values({
        userId: ctx.user.id,
        sessionId: ctx.session.session.id, // Link to current session for auto-cleanup on logout
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      })

      return { success: true }
    }),

  // Send a test notification to the current user
  sendTest: protectedProcedure.mutation(async ({ ctx }) => {
    // Get all subscriptions for this user
    const subs = await ctx.db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, ctx.user.id),
    })

    if (subs.length === 0) {
      return { success: false, error: 'No push subscriptions found. Enable notifications first.' }
    }

    let sent = 0
    let failed = 0
    let lastError: string | undefined

    for (const sub of subs) {
      const result = await sendNotification(sub, {
        title: 'Vibe Check! 🎯',
        body: 'How are you feeling right now?',
        url: '/check-in',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
      })

      if (result.success) {
        sent++
      } else {
        failed++
        lastError = result.error
      }
    }

    return { success: sent > 0, sent, failed, error: sent > 0 ? undefined : (lastError ?? 'All notifications failed') }
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

  // Delete all subscriptions for the current user (useful for cleanup/troubleshooting)
  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, ctx.user.id))

    return { success: true, message: 'All push subscriptions cleared. Re-enable push to create a fresh subscription.' }
  }),

  // Get detailed subscription status with device info
  getDetailedStatus: protectedProcedure.query(async ({ ctx }) => {
    const subs = await ctx.db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, ctx.user.id),
    })

    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    })

    return {
      subscriptionCount: subs.length,
      lastNotifiedAt: user?.lastNotifiedAt,
      notificationFrequency: user?.notificationFrequency || 1,
      subscriptions: subs.map(sub => {
        const deviceInfo = extractDeviceInfo(sub.endpoint)
        return {
          id: sub.id,
          browser: deviceInfo.browser,
          platform: deviceInfo.platform,
          createdAt: sub.createdAt,
          // Truncate endpoint for display (security)
          endpointPreview: sub.endpoint.substring(0, 60) + '...',
        }
      }),
    }
  }),

  // Delete a specific subscription by ID
  deleteById: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership before deleting
      const sub = await ctx.db.query.pushSubscriptions.findFirst({
        where: eq(pushSubscriptions.id, input.subscriptionId),
      })

      if (!sub || sub.userId !== ctx.user.id) {
        return { success: false, error: 'Subscription not found or unauthorized' }
      }

      await ctx.db.delete(pushSubscriptions)
        .where(eq(pushSubscriptions.id, input.subscriptionId))

      return { success: true }
    }),

  // Update user's notification frequency (for solo users)
  updateFrequency: protectedProcedure
    .input(z.object({
      frequency: z.number().refine(val => [1, 2, 3, 7].includes(val), {
        message: 'Frequency must be 1 (daily), 2 (every 2 days), 3 (every 3 days), or 7 (weekly)',
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users)
        .set({ notificationFrequency: input.frequency })
        .where(eq(users.id, ctx.user.id))

      return { success: true }
    }),
})
