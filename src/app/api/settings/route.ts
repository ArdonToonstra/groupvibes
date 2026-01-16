import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/better-auth'
import { db } from '@/db'
import { users, groups, checkIns } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get group if user has one
    let group = null
    if (dbUser.groupId) {
      group = await db.query.groups.findFirst({
        where: eq(groups.id, dbUser.groupId),
      })
    }

    // Get user's check-ins
    const userCheckIns = await db.query.checkIns.findMany({
      where: eq(checkIns.userId, session.user.id),
      orderBy: desc(checkIns.createdAt),
    })

    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName,
        createdAt: dbUser.createdAt,
      },
      group: group ? {
        id: group.id,
        name: group.name,
        createdAt: group.createdAt,
      } : null,
      checkins: userCheckIns.map(ci => ({
        id: ci.id,
        vibeScore: ci.vibeScore,
        tags: ci.tags,
        customNote: ci.customNote,
        createdAt: ci.createdAt,
      })),
    })
  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
