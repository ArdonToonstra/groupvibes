import { createAuthClient } from 'better-auth/react'
import { emailOTPClient } from 'better-auth/client/plugins'

// Auto-detect base URL - prioritize window.location.origin for browser environments
// This ensures the API calls go to the same domain the user is on
const getBaseURL = () => {
  // In browser, always use current origin to avoid CORS issues
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Server-side fallback
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  return 'http://localhost:3000'
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    emailOTPClient(),
  ],
})

// Export commonly used methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  emailOtp,
} = authClient
