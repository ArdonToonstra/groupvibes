import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { inviteCode, userId } = await request.json()

    if (!inviteCode || !userId) {
      return NextResponse.json(
        { error: 'Invite code and userId are required' },
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

    const group = groups.docs[0]

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
