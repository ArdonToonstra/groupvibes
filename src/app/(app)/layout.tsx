import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Statelink',
  description: 'A group vibe check app',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  // Verification gating removed - now handled in onboarding flow

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
