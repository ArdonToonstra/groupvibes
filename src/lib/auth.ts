import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

interface JWTPayload {
  id: string | number
  collection: 'users'
  email: string
}

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

    // Get the secret from environment - fail if not set
    const secret = process.env.PAYLOAD_SECRET
    if (!secret) {
      throw new Error('PAYLOAD_SECRET environment variable is not set')
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, secret) as JWTPayload
    
    if (!decoded || !decoded.id || decoded.collection !== 'users') {
      return null
    }

    // Fetch the user from the database using the ID from the token
    const user = await payload.findByID({
      collection: 'users',
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
