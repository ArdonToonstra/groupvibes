import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const payload = await getPayload({ config })
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        // Authenticate using Payload's login method
        // This validates credentials and returns the user + token
        const result = await payload.login({
            collection: 'users',
            data: {
                email,
                password,
            },
        })

        if (!result || !result.token) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        // Set the JWT token in an HTTP-only cookie for security
        // This prevents XSS attacks as JavaScript cannot access the cookie
        const response = NextResponse.json({
            user: {
                id: result.user.id,
                email: result.user.email,
                displayName: result.user.displayName,
            },
            message: 'Login successful'
        })

        // Set the payload-token cookie with secure settings
        response.cookies.set('payload-token', result.token, {
            httpOnly: true, // Prevents XSS attacks
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'lax', // CSRF protection
            path: '/',
            maxAge: result.exp || 7200, // Use token expiration or default to 2 hours
        })

        return response

    } catch (error) {
        console.error('Error logging in:', error)
        return NextResponse.json(
            { error: 'Invalid email or password' }, // Generic error for security
            { status: 401 }
        )
    }
}
