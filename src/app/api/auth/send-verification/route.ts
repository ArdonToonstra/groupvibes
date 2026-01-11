import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(request: Request) {
    try {
        const payload = await getPayload({ config })
        const { user } = await payload.auth({ headers: request.headers })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Cast user to any to access custom fields if types aren't generated yet
        const castedUser = user as any

        // Check cooldown (5 minutes)
        if (castedUser.lastVerificationEmailSentAt) {
            const lastSent = new Date(castedUser.lastVerificationEmailSentAt)
            const now = new Date()
            const diffCmd = now.getTime() - lastSent.getTime()
            if (diffCmd < 5 * 60 * 1000) {
                return NextResponse.json(
                    { error: 'Please wait 5 minutes before resending.' },
                    { status: 429 }
                )
            }
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 mins

        // Save to user
        await payload.update({
            collection: 'users',
            id: user.id,
            data: {
                verificationCode: code,
                verificationCodeExpiresAt: expiresAt.toISOString(),
                lastVerificationEmailSentAt: new Date().toISOString(),
            },
        })

        // Send email
        await sendVerificationEmail({
            to: user.email,
            code,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error sending verification email:', error)
        return NextResponse.json(
            { error: 'Failed to send verification email' },
            { status: 500 }
        )
    }
}
