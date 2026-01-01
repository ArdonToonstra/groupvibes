import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

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

    // Verify and decode the JWT token
    const secret = process.env.PAYLOAD_SECRET || 'your-secret-key-here'
    const decoded = jwt.verify(token, secret) as any
    
    if (!decoded || !decoded.id || !decoded.collection) {
      return null
    }

    // Fetch the user from the database using the ID from the token
    const user = await payload.findByID({
      collection: decoded.collection,
      id: decoded.id,
    })
    
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
