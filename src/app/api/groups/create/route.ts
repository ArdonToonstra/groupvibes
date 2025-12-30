import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { generateInviteCode } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { name, userId } = await request.json()

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Name and userId are required' },
        { status: 400 }
      )
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode(8)
    let isUnique = false
    
    // Ensure uniqueness
    while (!isUnique) {
      const existing = await payload.find({
        collection: 'groups',
        where: {
          inviteCode: {
            equals: inviteCode,
          },
        },
      })
      
      if (existing.docs.length === 0) {
        isUnique = true
      } else {
        inviteCode = generateInviteCode(8)
      }
    }

    // Create the group
    const group = await payload.create({
      collection: 'groups',
      data: {
        name,
        inviteCode,
        createdBy: userId,
        frequency: 2,
        intervalMode: 'random',
      },
    })

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
        inviteCode: group.inviteCode,
      },
    })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    )
  }
}
