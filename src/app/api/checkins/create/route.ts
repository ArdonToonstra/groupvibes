import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { userId, groupID, vibeScore, tags, customNote } = await request.json()

    if (!userId || !groupID || vibeScore === undefined) {
      return NextResponse.json(
        { error: 'userId, groupID, and vibeScore are required' },
        { status: 400 }
      )
    }

    if (vibeScore < 1 || vibeScore > 10) {
      return NextResponse.json(
        { error: 'vibeScore must be between 1 and 10' },
        { status: 400 }
      )
    }

    // Create the check-in
    const checkIn = await payload.create({
      collection: 'checkins',
      data: {
        user: userId,
        groupID,
        vibeScore,
        tags: tags?.map((tag: string) => ({ tag })) || [],
        customNote: customNote || '',
      },
    })

    return NextResponse.json({
      success: true,
      checkIn: {
        id: checkIn.id,
        vibeScore: checkIn.vibeScore,
        createdAt: checkIn.createdAt,
      },
    })
  } catch (error) {
    console.error('Error creating check-in:', error)
    return NextResponse.json(
      { error: 'Failed to create check-in' },
      { status: 500 }
    )
  }
}
