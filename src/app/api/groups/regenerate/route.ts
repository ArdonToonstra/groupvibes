import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
// Helper to generate a short manageable code
const generateInviteCode = () => {
    return crypto.randomUUID().substring(0, 6).toUpperCase()
}

export async function POST(request: Request) {
    try {
        const payload = await getPayload({ config })
        const { userId, groupId } = await request.json()

        if (!userId || !groupId) {
            return NextResponse.json(
                { error: 'User ID and Group ID are required' },
                { status: 400 }
            )
        }

        // Security Check: Ensure user is the owner of the group
        const group = await payload.findByID({
            collection: 'groups',
            id: groupId,
        })

        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 })
        }

        // Robust check for ownership
        const createdBy = typeof group.createdBy === 'object' ? group.createdBy.id : group.createdBy

        // We can also verify against the user making the request if we fetched the user,
        // but the payload user session should be ideal. For now using ID check.
        if (String(createdBy) !== String(userId)) {
            return NextResponse.json({ error: 'Unauthorized: Only the group owner can regenerate invite codes' }, { status: 403 })
        }

        // Generate new code
        const newCode = generateInviteCode()
        const now = new Date()

        const updatedGroup = await payload.update({
            collection: 'groups',
            id: groupId,
            data: {
                inviteCode: newCode,
                inviteCodeCreated: now.toISOString(),
            } as any,
        }) as any

        return NextResponse.json({
            success: true,
            inviteCode: updatedGroup.inviteCode,
            inviteCodeCreated: updatedGroup.inviteCodeCreated
        })

    } catch (error) {
        console.error('Error regenerating invite code:', error)
        return NextResponse.json(
            { error: 'Failed to regenerate invite code' },
            { status: 500 }
        )
    }
}
