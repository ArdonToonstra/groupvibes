import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const payload = await getPayload({ config })
        const { user } = await payload.auth({ headers: request.headers })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { code } = await request.json()

        if (!code) {
            return NextResponse.json({ error: 'Code is required' }, { status: 400 })
        }

        // Cast user to any to access custom fields
        const castedUser = user as any
        const savedCode = castedUser.verificationCode
        const expiresAt = castedUser.verificationCodeExpiresAt
            ? new Date(castedUser.verificationCodeExpiresAt)
            : null

        if (!savedCode || !expiresAt) {
            return NextResponse.json(
                { error: 'No verification code found. Please request a new one.' },
                { status: 400 }
            )
        }

        if (savedCode !== code.toString().trim()) {
            return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
        }

        if (Date.now() > expiresAt.getTime()) {
            return NextResponse.json(
                { error: 'Code has expired. Please request a new one.' },
                { status: 400 }
            )
        }

        // Mark as verified and clear code
        await payload.update({
            collection: 'users',
            id: user.id,
            data: {
                isVerified: true,
                verificationCode: null,
                verificationCodeExpiresAt: null,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error verifying code:', error)
        return NextResponse.json(
            { error: 'Failed to verify code' },
            { status: 500 }
        )
    }
}
