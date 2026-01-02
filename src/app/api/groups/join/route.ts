import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAuthenticatedUser } from '@/lib/auth'

export async function POST(request: Request) {
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
    const { inviteCode } = await request.json()

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Find the group by invite code
    const groups = await payload.find({
      collection: 'groups',
      where: {
        inviteCode: {
          equals: inviteCode.toUpperCase(),
        },
      },
    })

    if (groups.docs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    const group = groups.docs[0] as any

    // Check for expiration (7 days)
    if (group.inviteCodeCreated) {
      const createdTime = new Date(group.inviteCodeCreated).getTime()
      const now = new Date().getTime()
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000

      if (now - createdTime > oneWeekMs) {
        return NextResponse.json(
          { error: 'Invite code has expired (valid for 7 days)' },
          { status: 410 } // Gone
        )
      }
    } else {
      // If no creation date, treat as expired to enforce the new system
      return NextResponse.json(
        { error: 'Invite code is old/invalid. Please ask the group owner to regenerate it.' },
        { status: 410 }
      )
    }

    // Update user's groupID
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        groupID: group.id,
      },
    })

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
      },
    })
  } catch (error) {
    console.error('Error joining group:', error)
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    )
  }
}
