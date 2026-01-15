import { headers } from 'next/headers'
import { auth } from '@/lib/better-auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export interface AuthenticatedUser {
  id: string
  email: string
  displayName: string | null
  groupId: string | null
  isVerified: boolean
}

/**
 * Get authenticated user from Better Auth session
 * Returns a user object with app data from Drizzle
 * @returns User object if authenticated, null otherwise
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const headersList = await headers()
    
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: headersList,
    })

    if (!session?.user) {
      return null
    }

    const betterAuthUser = session.user
    
    // Get the user from our unified user table (Better Auth + app data)
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, betterAuthUser.id),
    })

    if (!dbUser) {
      // User exists in Better Auth but not synced to our extended table
      // This shouldn't happen with proper setup, but handle gracefully
      console.warn('User exists in Better Auth but not in extended user table:', betterAuthUser.id)
      return null
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.displayName,
      groupId: dbUser.groupId,
      isVerified: dbUser.emailVerified,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

/**
 * Require authentication - throws error if not authenticated
 * @returns Authenticated user
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}
