import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'

export async function DELETE() {
    try {
        const user = await getAuthenticatedUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const payload = await getPayload({ config })

        // Delete all check-ins by this user
        const userCheckIns = await payload.find({
            collection: 'checkins',
            where: {
                user: {
                    equals: user.id,
                },
            },
            limit: 1000,
        })

        for (const checkIn of userCheckIns.docs) {
            await payload.delete({
                collection: 'checkins',
                id: checkIn.id,
            })
        }

        // If user is owner of a group (createdBy), we need to handle that
        const ownedGroups = await payload.find({
            collection: 'groups',
            where: {
                createdBy: {
                    equals: user.id,
                },
            },
            limit: 100,
        })

        // Delete groups where user is the creator
        // Note: This will orphan other users in the group - could be improved to transfer ownership
        for (const group of ownedGroups.docs) {
            await payload.delete({
                collection: 'groups',
                id: group.id,
            })
        }

        // Delete the user
        await payload.delete({
            collection: 'users',
            id: user.id,
        })

        // Clear the auth cookie
        const response = NextResponse.json({
            message: 'Account deleted successfully',
        })
        response.cookies.delete('payload-token')

        return response
    } catch (error) {
        console.error('Error deleting account:', error)
        return NextResponse.json(
            { error: 'Failed to delete account' },
            { status: 500 }
        )
    }
}
