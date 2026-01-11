import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// This endpoint is for TESTING/DEVELOPMENT ONLY
// It is disabled in production
export async function GET() {
    // Only allow in development/test environment
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    try {
        const payload = await getPayload({ config })
        const { user } = await payload.auth({ headers: await headers() })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const castedUser = user as any

        return NextResponse.json({
            verificationCode: castedUser.verificationCode,
            expiresAt: castedUser.verificationCodeExpiresAt,
        })
    } catch (error) {
        console.error('Error getting verification code:', error)
        return NextResponse.json({ error: 'Failed to get code' }, { status: 500 })
    }
}

