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
      // Migration support: If no creation date, assume valid? 
      // Or set it to now? For minimal friction, let's treat old codes as valid 
      // OR invalid? 
      // Let's treat as valid but maybe trigger an update?
      // Actually, safer to treat as "Expired" to force regeneration if we want strict security,
      // BUT for UX, let's treat it as valid and maybe update the date to now to start the clock?
      // Let's treating it as "Exipred" to be clean, user can just ask owner to regenerate.
      // Actually, user requested "New ones are generated".
      // Let's assume expired if null to enforce the new system.
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
