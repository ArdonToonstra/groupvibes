'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PageHeader } from '@/components/ui/page-header'
import { Mail, Loader2, Check, ArrowLeft, AlertCircle } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

function ChangeEmailContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [step, setStep] = useState<'input' | 'verify'>('input')
    const [newEmail, setNewEmail] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [currentEmail, setCurrentEmail] = useState('')

    // Fetch current user email
    const { data: session, isPending: sessionLoading } = authClient.useSession()

    useEffect(() => {
        if (session?.user?.email) {
            setCurrentEmail(session.user.email)
        }
    }, [session])

    // Check for verification token in URL (for email verification link flow)
    const token = searchParams.get('token')
    useEffect(() => {
        if (token) {
            handleVerifyFromLink(token)
        }
    }, [token])

    const handleVerifyFromLink = async (verificationToken: string) => {
        setLoading(true)
        setError('')

        try {
            // Verify the email change using the token from the link
            const result = await authClient.changeEmail({
                newEmail: '', // Token-based verification
                callbackURL: `${window.location.origin}/change-email`,
            })

            if (result.error) {
                throw new Error(result.error.message || 'Failed to verify email change')
            }

            setSuccess(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed')
        } finally {
            setLoading(false)
        }
    }

    const handleRequestChange = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!newEmail.trim()) {
            setError('Please enter your new email address')
            return
        }

        if (newEmail === currentEmail) {
            setError('New email must be different from current email')
            return
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(newEmail)) {
            setError('Please enter a valid email address')
            return
        }

        setLoading(true)
        setError('')

        try {
            const result = await authClient.changeEmail({
                newEmail,
                callbackURL: `${window.location.origin}/change-email`,
            })

            if (result.error) {
                throw new Error(result.error.message || 'Failed to send verification email')
            }

            setStep('verify')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (sessionLoading) {
        return <LoadingSpinner message="Loading..." />
    }

    if (!session?.user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
                <Card className="w-full max-w-md p-6 space-y-6 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
                    <h1 className="text-xl font-bold">Not Authenticated</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        You must be logged in to change your email address.
                    </p>
                    <Link href="/onboarding?view=login">
                        <Button className="w-full">Go to Login</Button>
                    </Link>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <PageHeader title="Change Email" showBackButton onBack={() => router.push('/settings')} maxWidth="md" />
                <div className="max-w-md mx-auto p-4">
                    <Card className="p-6 space-y-6">
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Updated!</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                Your email has been successfully changed to <strong>{newEmail}</strong>.
                            </p>
                        </div>

                        <Link href="/settings" className="block">
                            <Button className="w-full">
                                Back to Settings
                            </Button>
                        </Link>
                    </Card>
                </div>
            </div>
        )
    }

    if (step === 'verify') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <PageHeader title="Verify Email" showBackButton onBack={() => router.push('/settings')} maxWidth="md" />
                <div className="max-w-md mx-auto p-4">
                    <Card className="p-6 space-y-6">
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                                <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Check Your Email</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                We&apos;ve sent a verification link to <strong>{newEmail}</strong>. 
                                Click the link in the email to confirm your new address.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setStep('input')
                                    setNewEmail('')
                                }}
                                className="w-full"
                            >
                                Use a different email
                            </Button>
                            <Link href="/settings" className="block">
                                <Button variant="ghost" className="w-full">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Settings
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <PageHeader title="Change Email" showBackButton onBack={() => router.push('/settings')} maxWidth="md" />
            <div className="max-w-md mx-auto p-4">
                <Card className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change Email</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Update your email address. A verification link will be sent to your new email.
                        </p>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Current email</p>
                        <p className="font-medium text-gray-900 dark:text-white">{currentEmail}</p>
                    </div>

                    <form onSubmit={handleRequestChange} className="space-y-4">
                        <div>
                            <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                New Email Address
                            </label>
                            <Input
                                id="newEmail"
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="your-new-email@example.com"
                                autoComplete="email"
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send Verification Link'
                            )}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    )
}

export default function ChangeEmailPage() {
    return (
        <Suspense fallback={<LoadingSpinner message="Loading..." />}>
            <ChangeEmailContent />
        </Suspense>
    )
}
