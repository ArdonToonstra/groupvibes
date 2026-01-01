import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'

/**
 * Get authenticated user from request
 * Validates the JWT token from the payload-token cookie
 * @returns User object if authenticated, null otherwise
 */
export async function getAuthenticatedUser() {
  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value

    if (!token) {
      return null
    }

    // Verify the token and get the user
    const { user } = await payload.auth({ headers: { Authorization: `JWT ${token}` } })
    
    return user
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
