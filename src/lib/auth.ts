import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies, headers } from 'next/headers'

/**
 * Get authenticated user from request
 * Uses Payload's built-in auth verification
 * @returns User object if authenticated, null otherwise
 */
export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value

    if (!token) {
      console.log('No payload-token cookie found')
      return null
    }

    const payload = await getPayload({ config })
    
    // Use Payload's built-in auth verification by passing the token as Authorization header
    // This lets Payload verify the token using its own secret and configuration
    const { user } = await payload.auth({
      headers: new Headers({
        Authorization: `JWT ${token}`,
      }),
    })

    if (!user) {
      console.log('Token invalid or user not found')
      return null
    }
    
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
