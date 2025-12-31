import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const payload = await getPayload({ config })
        const users = await payload.find({
            collection: 'users',
            limit: 100,
        })
        return NextResponse.json({
            count: users.totalDocs,
            users: users.docs.map(u => ({ id: u.id, email: u.email }))
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
