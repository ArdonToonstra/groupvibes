import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET(request: Request) {
    // Get authenticated user from JWT token
    const authenticatedUser = await getAuthenticatedUser()
    
    if (!authenticatedUser) {
        return NextResponse.json(
            { error: 'Unauthorized - Please log in' },
            { status: 401 }
        )
    }

    const payload = await getPayload({ config })
    const userId = authenticatedUser.id

    try {
        // 1. Get User and Group Info
        const user = await payload.findByID({
            collection: 'users',
            id: userId,
        })

        if (!user || !user.groupID) {
            return NextResponse.json({
                groupPulse: null,
                memberCount: 0,
                userLastVibe: null,
                groupName: 'No Group'
            })
        }

        const groupId = typeof user.groupID === 'object' ? user.groupID.id : user.groupID

        // 2. Get Member Count
        const members = await payload.find({
            collection: 'users',
            where: {
                groupID: { equals: groupId }
            },
            limit: 0
        })
        const memberCount = members.totalDocs

        // 3. Get User's Last Vibe
        const userCheckins = await payload.find({
            collection: 'checkins',
            where: {
                user: { equals: userId }
            },
            sort: '-createdAt',
            limit: 1
        })
        const userLastVibe = userCheckins.docs[0] || null

        // 4. Calculate Group Pulse (Avg of latest 24h)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const recentCheckins = await payload.find({
            collection: 'checkins',
            where: {
                groupID: { equals: groupId },
                createdAt: { greater_than: yesterday.toISOString() }
            },
            limit: 100
        })

        let avgVibe = null
        if (recentCheckins.docs.length > 0) {
            const sum = recentCheckins.docs.reduce((acc, curr) => acc + curr.vibeScore, 0)
            avgVibe = (sum / recentCheckins.docs.length).toFixed(1)
        }

        const group = await payload.findByID({ collection: 'groups', id: groupId as unknown as number })

        return NextResponse.json({
            groupPulse: avgVibe,
            memberCount,
            userLastVibe,
            groupName: group?.name || 'My Group'
        })

    } catch (error) {
        console.error('Error fetching dashboard data:', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}
