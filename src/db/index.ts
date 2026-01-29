import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create postgres connection
const connectionString = process.env.DATABASE_URL!

// For queries - enable SSL for cloud databases like Neon, but not for local
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
const queryClient = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' && !isLocal ? 'require' : false,
})

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema })

// Export schema for convenience
export * from './schema'
