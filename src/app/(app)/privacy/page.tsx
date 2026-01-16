import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="w-full p-4 md:p-6 flex items-center justify-between max-w-3xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Last updated: January 2026
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
            Cookies
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We only use technically necessary cookies that are required for the application to function properly. 
            These include session cookies to keep you logged in. We do not use any tracking cookies, analytics cookies, 
            or advertising cookies.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
            No Tracking
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We do not track your behavior, we do not use any third-party analytics services, and we do not sell or 
            share your data with anyone. Your check-ins and personal data are stored securely and are only visible 
            to you and the groups you choose to join.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
            Your Data, Your Control
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You have full control over your data at all times:
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mb-6 space-y-2">
            <li>You can download all your data at any time from the settings page</li>
            <li>You can delete all your data at any time from the settings page</li>
            <li>When you delete your account, all your data is permanently removed</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
            Data Storage
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your data is stored securely in our database. We take reasonable measures to protect your information, 
            but as stated in our Terms of Service, use of this application is at your own risk.
          </p>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Link href="/terms" className="text-primary hover:underline">
            View Terms of Service →
          </Link>
        </div>
      </main>
    </div>
  )
}
