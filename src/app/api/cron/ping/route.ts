import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { groups, users, userGroups } from '@/db/schema'
import { lte, isNotNull, isNull, eq } from 'drizzle-orm'
import { 
  sendNotification,
  calculateNextPingTime, 
  initializeNextPingTime,
  isInQuietHours,
  canSendNotification,
  type PushPayload 
} from '@/lib/web-push'

// Verify cron secret to prevent unauthorized access
// Vercel cron jobs automatically include CRON_SECRET in the Authorization header
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return false
  }
  
  // Vercel cron sends the secret in the Authorization header as "Bearer {CRON_SECRET}"
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  
  // Also check for vercel's cron signature header (for older setups)
  const vercelCronHeader = request.headers.get('x-vercel-cron-auth-token')
  if (vercelCronHeader === cronSecret) {
    return true
  }
  
  console.error('Cron authorization failed - no valid auth header found')
  return false
}

// Retry helper for database operations
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | undefined
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const isConnectionError = 
        error instanceof Error && 
        (error.message.includes('CONNECT_TIMEOUT') || 
         error.message.includes('ECONNREFUSED') ||
         error.message.includes('Connection terminated'))
      
      if (isConnectionError && attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        console.log(`[Cron Ping] Connection error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
  
  throw lastError!
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const now = new Date()
  console.log(`[Cron Ping] Starting at ${now.toISOString()}`)
  
  const results: Array<{
    groupId: string
    groupName: string
    usersEligible: number
    usersNotified: number
    usersSkippedRecentNotification: number
    usersSkippedQuietHours: number
    nextPingTime: Date
  }> = []
  
  // Track which users we've already notified in this cron run (for consolidation)
  const notifiedUserIds = new Set<string>()
  
  try {
    // Find all groups where nextPingTime <= now (with retry logic)
    const eligibleGroups = await retryWithBackoff(() => 
      db.query.groups.findMany({
        where: lte(groups.nextPingTime, now),
      })
    )
    
    console.log(`[Cron Ping] Found ${eligibleGroups.length} eligible groups with nextPingTime <= now`)
    
    // Also find groups that have never been pinged (nextPingTime is null)
    const uninitializedGroups = await retryWithBackoff(() =>
      db.query.groups.findMany({
        where: isNotNull(groups.ownerId), // All groups with owners
      })
    )
    
    // Filter to only those without nextPingTime set
    const needsInit = uninitializedGroups.filter(g => g.nextPingTime === null)
    
    console.log(`[Cron Ping] Total groups: ${uninitializedGroups.length}, needs init: ${needsInit.length}`)
    
    // Log all groups with their next ping times for debugging
    for (const group of uninitializedGroups) {
      console.log(`[Cron Ping] Group "${group.name}": nextPingTime=${group.nextPingTime?.toISOString() || 'null'}, frequency=${group.frequency}`)
    }
    
    // Initialize nextPingTime for groups that don't have it
    for (const group of needsInit) {
      const nextPing = initializeNextPingTime(
        group.frequency, 
        group.intervalMode,
        group.scheduleDays,
        group.scheduleTimes,
        group.ownerTimezone
      )
      await db.update(groups)
        .set({ nextPingTime: nextPing })
        .where(eq(groups.id, group.id))
      
      console.log(`[Cron Ping] Initialized nextPingTime for group ${group.name}: ${nextPing.toISOString()}`)
    }
    
    // Process eligible groups
    for (const group of eligibleGroups) {
      console.log(`[Cron Ping] Processing group "${group.name}" (id: ${group.id})`)
      
      // Use custom notification message if set, otherwise default
      const payload: PushPayload = {
        title: group.notificationTitle || 'Vibe Check! 🎯',
        body: group.notificationBody || 'How are you feeling right now?',
        url: '/check-in',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
      }
      
      // Get all members of the group with their subscriptions
      const groupMemberships = await db.query.userGroups.findMany({
        where: eq(userGroups.groupId, group.id),
        with: {
          user: {
            with: {
              pushSubscriptions: true,
            },
          },
        },
      })
      
      let usersEligible = 0
      let usersNotified = 0
      let usersSkippedRecentNotification = 0
      let usersSkippedQuietHours = 0
      
      for (const membership of groupMemberships) {
        const user = membership.user
        const userTimezone = user.timezone || 'UTC'
        usersEligible++
        
        // Skip if already notified in this cron run (consolidation)
        if (notifiedUserIds.has(user.id)) {
          console.log(`[Cron Ping] User ${user.email}: Already notified in this cron run (consolidated)`)
          continue
        }
        
        // Check if user was recently notified (use group frequency, convert pings/week to hours)
        // e.g., 7 pings/week = 24 hours between, 2 pings/week = 84 hours between
        const minHoursBetween = Math.max(8, (7 * 24) / group.frequency * 0.5) // 50% of expected interval, min 8 hours
        const hoursSinceLastNotification = user.lastNotifiedAt 
          ? (now.getTime() - user.lastNotifiedAt.getTime()) / (1000 * 60 * 60)
          : Infinity
        
        if (hoursSinceLastNotification < minHoursBetween) {
          console.log(`[Cron Ping] User ${user.email}: Skipped (notified ${hoursSinceLastNotification.toFixed(1)}h ago, min ${minHoursBetween}h)`)
          usersSkippedRecentNotification++
          continue
        }
        
        // Check if user is in quiet hours
        if (isInQuietHours(group.quietHoursStart, group.quietHoursEnd, userTimezone)) {
          console.log(`[Cron Ping] User ${user.email}: Skipped (in quiet hours)`)
          usersSkippedQuietHours++
          continue
        }
        
        // Send to all subscriptions for this user
        let sentToUser = false
        for (const subscription of user.pushSubscriptions) {
          console.log(`[Cron Ping] Sending to ${user.email} endpoint: ${subscription.endpoint.substring(0, 50)}...`)
          const result = await sendNotification(subscription, payload)
          if (result.success) {
            console.log(`[Cron Ping] Sent successfully to ${user.email}`)
            sentToUser = true
          } else {
            console.log(`[Cron Ping] Failed to send to ${user.email}: ${result.error}`)
          }
        }
        
        if (sentToUser) {
          usersNotified++
          notifiedUserIds.add(user.id)
          
          // Update user's lastNotifiedAt
          await db.update(users)
            .set({ lastNotifiedAt: now })
            .where(eq(users.id, user.id))
        }
      }
      
      // Calculate next ping time based on interval mode and schedule
      const nextPingTime = calculateNextPingTime(
        group.frequency, 
        group.intervalMode,
        group.scheduleDays,
        group.scheduleTimes,
        group.ownerTimezone
      )
      
      // Update group with last and next ping times
      await db.update(groups)
        .set({ 
          lastPingTime: now,
          nextPingTime: nextPingTime,
          updatedAt: now,
        })
        .where(eq(groups.id, group.id))
      
      results.push({
        groupId: group.id,
        groupName: group.name,
        usersEligible,
        usersNotified,
        usersSkippedRecentNotification,
        usersSkippedQuietHours,
        nextPingTime,
      })
      
      console.log(`Pinged group ${group.name}: eligible=${usersEligible}, notified=${usersNotified}, skippedRecent=${usersSkippedRecentNotification}, skippedQuiet=${usersSkippedQuietHours}, next=${nextPingTime.toISOString()}`)
    }
    
    // ============================================
    // Solo users: Users with push subscriptions but no active group
    // Only notify if enough time has passed based on their notificationFrequency
    // ============================================
    let soloEligible = 0
    let soloNotified = 0
    let soloSkippedRecentNotification = 0
    
    // Get all users with push subscriptions who have no active group
    const soloUsersWithSubs = await retryWithBackoff(() =>
      db.query.users.findMany({
        where: isNull(users.activeGroupId),
        with: {
          pushSubscriptions: true,
        },
      })
    )
    
    // Filter to only those with subscriptions
    const soloUsersToCheck = soloUsersWithSubs.filter(u => u.pushSubscriptions.length > 0)
    
    console.log(`[Cron Ping] Found ${soloUsersToCheck.length} solo users with push subscriptions`)
    
    if (soloUsersToCheck.length > 0) {
      const soloPayload: PushPayload = {
        title: 'Vibe Check! 🎯',
        body: 'How are you feeling right now?',
        url: '/check-in',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
      }
      
      for (const user of soloUsersToCheck) {
        soloEligible++
        
        // Skip if already notified in this cron run (e.g., from a group they're in)
        if (notifiedUserIds.has(user.id)) {
          console.log(`[Cron Ping] Solo user ${user.email}: Already notified in this cron run`)
          continue
        }
        
        // Check notification frequency (1=daily, 2=every 2 days, 3=every 3 days, 7=weekly)
        const frequency = user.notificationFrequency || 1
        if (!canSendNotification(user.lastNotifiedAt, frequency)) {
          const hoursSince = user.lastNotifiedAt 
            ? ((now.getTime() - user.lastNotifiedAt.getTime()) / (1000 * 60 * 60)).toFixed(1)
            : 'never'
          console.log(`[Cron Ping] Solo user ${user.email}: Skipped (notified ${hoursSince}h ago, frequency=${frequency})`)
          soloSkippedRecentNotification++
          continue
        }
        
        console.log(`[Cron Ping] Notifying solo user ${user.email}`)
        
        let sentToUser = false
        for (const subscription of user.pushSubscriptions) {
          const result = await sendNotification(subscription, soloPayload)
          if (result.success) {
            sentToUser = true
          } else {
            console.log(`[Cron Ping] Failed to notify solo user ${user.email}: ${result.error}`)
          }
        }
        
        if (sentToUser) {
          soloNotified++
          notifiedUserIds.add(user.id)
          
          // Update user's lastNotifiedAt
          await db.update(users)
            .set({ lastNotifiedAt: now })
            .where(eq(users.id, user.id))
        }
      }
    }
    
    console.log(`[Cron Ping] Solo users: eligible=${soloEligible}, notified=${soloNotified}, skippedRecent=${soloSkippedRecentNotification}`)
    
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      groupsProcessed: eligibleGroups.length,
      groupsInitialized: needsInit.length,
      totalUsersNotified: notifiedUserIds.size,
      soloUsersEligible: soloEligible,
      soloUsersNotified: soloNotified,
      soloUsersSkippedRecentNotification: soloSkippedRecentNotification,
      results,
    })
    
  } catch (error) {
    console.error('Cron ping error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process pings',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering in development
export async function POST(request: NextRequest) {
  return GET(request)
}
