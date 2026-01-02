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
        const user = await payload.findByID({ collection: 'users', id: userId })
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        let group: any = null
        if (user.groupID) {
            const gid = typeof user.groupID === 'object' ? user.groupID.id : user.groupID
            group = await payload.findByID({ collection: 'groups', id: gid as unknown as number })

            // Get members
            const membersResult = await payload.find({
                collection: 'users',
                where: { groupID: { equals: gid } },
            })
            // Attach members to group obj for frontend
            // @ts-ignore
            group.members = membersResult.docs.map(u => ({
                id: u.id,
                name: u.displayName,
                role: u.id === (typeof group.createdBy === 'object' ? group.createdBy.id : group.createdBy) ? 'owner' : 'member'
            }))
        }

        return NextResponse.json({
            user: {
                id: user.id,
                displayName: user.displayName,
                email: user.email,
                isGroupOwner: group ? (user.id === (typeof group.createdBy === 'object' ? group.createdBy.id : group.createdBy)) : false
            },
            group: group ? {
                id: group.id,
                name: group.name,
                inviteCode: group.inviteCode,
                members: group.members
            } : null
        })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
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
    const body = await request.json()
    const { type, data } = body

    try {
        if (type === 'profile') {
            const { displayName } = data
            await payload.update({
                collection: 'users',
                id: userId,
                data: { displayName }
            })
            return NextResponse.json({ success: true })
        }

        if (type === 'leave_group') {
            await payload.update({
                collection: 'users',
                id: userId,
                data: { groupID: null }
            })
            return NextResponse.json({ success: true })
        }

        if (type === 'group') {
            const user = await payload.findByID({ collection: 'users', id: userId })
            if (!user.groupID) return NextResponse.json({ error: 'No group' }, { status: 400 })
            const gId = typeof user.groupID === 'object' ? user.groupID.id : user.groupID

            // Verify user is the group owner
            const group = await payload.findByID({ collection: 'groups', id: gId as unknown as number })
            const groupOwnerId = typeof group.createdBy === 'object' ? group.createdBy.id : group.createdBy
            
            if (userId !== groupOwnerId) {
                return NextResponse.json(
                    { error: 'Only the group owner can perform this action' },
                    { status: 403 }
                )
            }

            const { name, removeMemberId } = data

            if (removeMemberId) {
                // Prevent owner from removing themselves
                if (removeMemberId === userId) {
                    return NextResponse.json(
                        { error: 'Group owner cannot remove themselves. Use leave_group instead.' },
                        { status: 400 }
                    )
                }
                // Remove member logic: Set their groupID to null
                await payload.update({
                    collection: 'users',
                    id: removeMemberId,
                    data: { groupID: null }
                })
            }

            if (name) {
                await payload.update({
                    collection: 'groups',
                    id: gId as unknown as number,
                    data: { name }
                })
            }
            return NextResponse.json({ success: true })
        }

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
