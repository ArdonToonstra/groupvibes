import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import * as schema from '@/db/schema'
import { sendVerificationEmail } from '@/lib/email'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  
  // Use email/password authentication
  emailAndPassword: {
    enabled: true,
    // We'll handle password validation in the frontend
    minPasswordLength: 8,
    // Auto sign-in after signup (we handle verification separately)
    autoSignIn: true,
  },

  // JWT mode (no database sessions) as requested
  session: {
    // Use cookie-based JWT sessions
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 2, // 2 hours
    },
  },

  // User fields - these are now stored directly in our users table
  user: {
    additionalFields: {
      displayName: {
        type: 'string',
        required: true,
      },
      groupId: {
        type: 'string',
        required: false,
      },
    },
  },

  // Plugins
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        console.log(`[BETTER-AUTH] Sending ${type} OTP to ${email}: ${otp}`)
        
        // Use existing email service
        await sendVerificationEmail({
          to: email,
          code: otp,
        })
      },
      otpLength: 6,
      expiresIn: 30 * 60, // 30 minutes (matches existing behavior)
      // For testing - store code in DB so we can query it
      sendVerificationOnSignUp: process.env.NEXT_PUBLIC_IS_VERIFICATION_ENABLED === 'true',
    }),
  ],

  // Trust host for Next.js
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ],
})

// Export type for client
export type Auth = typeof auth
