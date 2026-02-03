import webpush from 'web-push'
import { db } from '@/db'
import { pushSubscriptions, users, userGroups } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Configure VAPID keys lazily to avoid build-time errors
let vapidConfigured = false

function ensureVapidConfigured(): void {
  if (vapidConfigured) return
  
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.')
  }
  
  webpush.setVapidDetails(
    'mailto:notifications@groupvibes.nl',
    vapidPublicKey,
    vapidPrivateKey
  )
  
  vapidConfigured = true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
}

/**
 * Send a push notification to a single subscription
 */
export async function sendNotification(
  subscription: {
    endpoint: string
    p256dh: string
    auth: string
  },
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  ensureVapidConfigured()
  
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    )
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Push notification failed:', errorMessage)
    
    // Only delete subscription on permanent failures (not temporary errors like 400/500)
    if (error instanceof webpush.WebPushError) {
      console.error(`[Push] WebPushError - statusCode: ${error.statusCode}, endpoint: ${subscription.endpoint.substring(0, 60)}...`)
      
      // Delete subscription only on permanent failures
      // 410 Gone - subscription expired
      // 404 Not Found - subscription doesn't exist
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`[Push] Deleting invalid subscription (${error.statusCode})`);
        await db.delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      }
    }
    
    return { success: false, error: errorMessage }
  }
}

/**
 * Check if a user is currently in quiet hours based on their timezone
 */
export function isInQuietHours(
  quietHoursStart: number | null,
  quietHoursEnd: number | null,
  userTimezone: string
): boolean {
  if (quietHoursStart === null || quietHoursEnd === null) {
    return false
  }
  
  // Get current hour in user's timezone
  const now = new Date()
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
  const currentHour = userTime.getHours()
  
  // Handle quiet hours that span midnight (e.g., 23:00 to 07:00)
  if (quietHoursStart > quietHoursEnd) {
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd
  }
  
  // Normal range (e.g., 22:00 to 06:00 where start < end doesn't happen, but 09:00 to 17:00)
  return currentHour >= quietHoursStart && currentHour < quietHoursEnd
}

/**
 * Send push notifications to all members of a group
 * Respects individual user quiet hours based on their timezone
 */
export async function sendToGroup(
  groupId: string,
  payload: PushPayload,
  quietHoursStart: number | null,
  quietHoursEnd: number | null
): Promise<{ sent: number; failed: number; skippedQuietHours: number }> {
  // Get all users in the group via the userGroups junction table
  const groupMemberships = await db.query.userGroups.findMany({
    where: eq(userGroups.groupId, groupId),
    with: {
      user: {
        with: {
          pushSubscriptions: true,
        },
      },
    },
  })
  
  console.log(`[Push] Group ${groupId}: Found ${groupMemberships.length} members`)
  
  let sent = 0
  let failed = 0
  let skippedQuietHours = 0
  
  for (const membership of groupMemberships) {
    const user = membership.user
    const userTimezone = user.timezone || 'UTC'
    
    console.log(`[Push] User ${user.email}: ${user.pushSubscriptions.length} subscriptions, timezone=${userTimezone}`)
    
    // Check if user is in quiet hours
    if (isInQuietHours(quietHoursStart, quietHoursEnd, userTimezone)) {
      console.log(`[Push] User ${user.email}: Skipped (in quiet hours)`)
      skippedQuietHours++
      continue
    }
    
    // Send to all subscriptions for this user
    for (const subscription of user.pushSubscriptions) {
      console.log(`[Push] Sending to ${user.email} endpoint: ${subscription.endpoint.substring(0, 50)}...`)
      const result = await sendNotification(subscription, payload)
      if (result.success) {
        console.log(`[Push] Sent successfully to ${user.email}`)
        sent++
      } else {
        console.log(`[Push] Failed to send to ${user.email}: ${result.error}`)
        failed++
      }
    }
  }
  
  console.log(`[Push] Group ${groupId} complete: sent=${sent}, failed=${failed}, skipped=${skippedQuietHours}`)
  return { sent, failed, skippedQuietHours }
}

/**
 * Get minimum hours between notifications based on frequency setting
 * This prevents duplicate notifications within the minimum interval
 * 
 * Frequency options:
 * - 1 = Every day (24 hours between notifications, 8 hour safety cap)
 * - 2 = Every 2 days (48 hours between notifications)
 * - 3 = Every 3 days (72 hours between notifications)
 * - 7 = Once per week (168 hours between notifications)
 */
export function getMinHoursBetweenNotifications(frequency: number): number {
  const hoursMap: Record<number, number> = {
    1: 8,   // Daily - 8 hour safety cap (was getting duplicates with 24h)
    2: 48,  // Every 2 days
    3: 72,  // Every 3 days
    7: 168, // Weekly
  }
  return hoursMap[frequency] || 8 // Default to 8 hours if unknown
}

/**
 * Check if enough time has passed since last notification
 */
export function canSendNotification(lastNotifiedAt: Date | null, frequency: number): boolean {
  if (!lastNotifiedAt) return true
  
  const minHours = getMinHoursBetweenNotifications(frequency)
  const hoursSinceLastNotification = (Date.now() - lastNotifiedAt.getTime()) / (1000 * 60 * 60)
  
  return hoursSinceLastNotification >= minHours
}

/**
 * Get schedule days based on frequency setting
 * Used for fixed timing mode - the days are derived from frequency, not user-selected
 * 
 * Frequency mapping:
 * - 7 (every day): all days [0,1,2,3,4,5,6]
 * - 3 (every 2-3 days): Mon, Wed, Fri [1,3,5]
 * - 2 (every 3-4 days): Mon, Thu [1,4]
 * - 1 (once per week): Wed [3]
 */
export function getScheduleDaysFromFrequency(frequency: number): number[] {
  switch (frequency) {
    case 7:
      return [0, 1, 2, 3, 4, 5, 6] // Every day
    case 3:
      return [1, 3, 5] // Mon, Wed, Fri
    case 2:
      return [1, 4] // Mon, Thu
    case 1:
    default:
      return [3] // Wed only
  }
}

/**
 * Find the next scheduled time based on specific days and hours
 * Used for fixed schedule mode when scheduleDays and scheduleTimes are set
 */
export function findNextScheduledTime(
  now: Date,
  scheduleDays: number[], // 0-6 (Sun-Sat)
  scheduleTimes: number[], // 0-23
  ownerTimezone: string = 'UTC'
): Date {
  if (!scheduleDays.length || !scheduleTimes.length) {
    // Fallback: next hour
    return new Date(now.getTime() + 60 * 60 * 1000)
  }
  
  // Sort times ascending
  const sortedTimes = [...scheduleTimes].sort((a, b) => a - b)
  const sortedDays = [...scheduleDays].sort((a, b) => a - b)
  
  // Get current time in owner's timezone
  const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: ownerTimezone }))
  const currentDayOfWeek = nowInTz.getDay()
  const currentHour = nowInTz.getHours()
  const currentMinute = nowInTz.getMinutes()
  
  // Check each day starting from today, up to 8 days ahead (to ensure we find next week)
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const checkDayOfWeek = (currentDayOfWeek + dayOffset) % 7
    
    if (!sortedDays.includes(checkDayOfWeek)) continue
    
    for (const hour of sortedTimes) {
      // Skip times that have already passed today
      if (dayOffset === 0) {
        if (hour < currentHour || (hour === currentHour && currentMinute >= 30)) {
          continue
        }
      }
      
      // Calculate the target date
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + dayOffset)
      
      // Set the target time in the owner's timezone
      // We need to construct the date string in the target timezone
      const year = targetDate.getFullYear()
      const month = targetDate.getMonth()
      const day = targetDate.getDate()
      
      // Create a date at the target hour in owner's timezone
      const targetInTz = new Date(
        new Date(year, month, day, hour, 0, 0, 0)
          .toLocaleString('en-US', { timeZone: ownerTimezone })
      )
      
      // Convert back to UTC for storage
      const tzOffset = targetInTz.getTimezoneOffset() - new Date().getTimezoneOffset()
      const resultDate = new Date(year, month, day, hour, 0, 0, 0)
      resultDate.setMinutes(resultDate.getMinutes() - tzOffset)
      
      if (resultDate > now) {
        return resultDate
      }
    }
  }
  
  // Fallback: next hour (shouldn't happen with valid input)
  return new Date(now.getTime() + 60 * 60 * 1000)
}

/**
 * Calculate the next ping time using Poisson-like distribution
 * This creates more natural, random-feeling intervals
 * 
 * @param frequency - Number of pings per week (for random mode) or notification frequency setting
 * @param intervalMode - 'random' for Poisson distribution, 'fixed' for scheduled times
 * @param scheduleDays - Days of week for fixed schedule (0-6) - if not provided, derived from frequency
 * @param scheduleTimes - Hours for fixed schedule (0-23)
 * @param ownerTimezone - Timezone for fixed schedule
 * @returns Next ping time as Date
 */
export function calculateNextPingTime(
  frequency: number, 
  intervalMode: 'random' | 'fixed',
  scheduleDays?: number[] | null,
  scheduleTimes?: number[] | null,
  ownerTimezone?: string | null
): Date {
  const now = new Date()
  
  // Fixed schedule mode - derive days from frequency if not explicitly set
  if (intervalMode === 'fixed') {
    const days = scheduleDays?.length ? scheduleDays : getScheduleDaysFromFrequency(frequency)
    const times = scheduleTimes?.length ? scheduleTimes : [9] // Default to 9am if no time set
    return findNextScheduledTime(now, days, times, ownerTimezone || 'UTC')
  }
  
  // For random mode, use exponential distribution (Poisson process)
  // The expected time between events is (7 * 24) / frequency hours
  const expectedHoursPerPing = (7 * 24) / frequency
  
  // Generate exponentially distributed random interval
  // Using inverse transform sampling: -ln(U) * mean
  const u = Math.random()
  // Avoid log(0) and ensure minimum interval of 1 hour
  const randomHours = Math.max(1, -Math.log(1 - u) * expectedHoursPerPing)
  
  // Cap at 1.25x the expected interval to avoid extremely long waits
  // Also cap at maximum 3 days (72 hours) regardless of frequency
  const cappedHours = Math.min(randomHours, expectedHoursPerPing * 1.25, 72)
  
  const nextPing = new Date(now.getTime() + cappedHours * 60 * 60 * 1000)
  return nextPing
}

/**
 * Initialize next ping time for a group if not set
 */
export function initializeNextPingTime(
  frequency: number, 
  intervalMode: 'random' | 'fixed',
  scheduleDays?: number[] | null,
  scheduleTimes?: number[] | null,
  ownerTimezone?: string | null
): Date {
  // If fixed mode, use scheduled time (derive days from frequency if not set)
  if (intervalMode === 'fixed') {
    const days = scheduleDays?.length ? scheduleDays : getScheduleDaysFromFrequency(frequency)
    const times = scheduleTimes?.length ? scheduleTimes : [9] // Default to 9am
    return findNextScheduledTime(new Date(), days, times, ownerTimezone || 'UTC')
  }
  
  // For new groups with random mode, schedule first ping within the next few hours
  const now = new Date()
  const hoursUntilFirst = Math.random() * 4 + 1 // 1-5 hours for random
  
  return new Date(now.getTime() + hoursUntilFirst * 60 * 60 * 1000)
}
