import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create postgres connection
const connectionString = process.env.DATABASE_URI!

// For queries
const queryClient = postgres(connectionString)

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema })

// Export schema for convenience
export * from './schema'
