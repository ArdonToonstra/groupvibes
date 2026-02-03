import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create postgres connection
const connectionString = process.env.DATABASE_URL!

// For queries - enable SSL for cloud databases like Neon, but not for local
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
const queryClient = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' && !isLocal ? 'require' : false,
  // Increase timeouts for serverless/cold start scenarios
  connect_timeout: 30, // 30 seconds to establish connection
  idle_timeout: 20, // Close idle connections after 20 seconds
  max_lifetime: 60 * 30, // 30 minutes max connection lifetime
  // Connection pool settings
  max: 1, // Serverless environments should use minimal connections
})

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema })

// Export schema for convenience
export * from './schema'
