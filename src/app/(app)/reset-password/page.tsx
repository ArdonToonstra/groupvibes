'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ArrowLeft, Lock, Loader2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [tokenError, setTokenError] = useState(false)

    const token = searchParams.get('token')

    useEffect(() => {
        if (!token) {
            setTokenError(true)
        }
    }, [token])

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) {
            return 'Password must be at least 8 characters'
        }
        if (!/[A-Z]/.test(pwd)) {
            return 'Password must contain at least one uppercase letter'
        }
        if (!/[a-z]/.test(pwd)) {
            return 'Password must contain at least one lowercase letter'
        }
        if (!/[0-9]/.test(pwd)) {
            return 'Password must contain at least one number'
        }
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!password.trim()) {
            setError('Please enter a new password')
            return
        }

        const passwordError = validatePassword(password)
        if (passwordError) {
            setError(passwordError)
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (!token) {
            setError('Invalid reset link')
            return
        }

        setLoading(true)
        setError('')

        try {
            const result = await authClient.resetPassword({
                newPassword: password,
                token,
            })

            if (result.error) {
                throw new Error(result.error.message || 'Failed to reset password')
            }

            setSuccess(true)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred'
            if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid')) {
                setTokenError(true)
            } else {
                setError(message)
            }
        } finally {
            setLoading(false)
        }
    }

    if (tokenError) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
                <Card className="w-full max-w-md p-6 space-y-6">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid or Expired Link</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Link href="/forgot-password" className="block">
                            <Button className="w-full">
                                Request New Reset Link
                            </Button>
                        </Link>
                        <Link href="/onboarding?view=login" className="block">
                            <Button variant="ghost" className="w-full">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Login
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
                <Card className="w-full max-w-md p-6 space-y-6">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password Reset!</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Your password has been successfully reset. You can now log in with your new password.
                        </p>
                    </div>

                    <Link href="/onboarding?view=login" className="block">
                        <Button className="w-full">
                            Go to Login
                        </Button>
                    </Link>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <Card className="w-full max-w-md p-6 space-y-6">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Enter your new password below.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter new password"
                                autoComplete="new-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Min 8 characters with uppercase, lowercase, and number
                        </p>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Confirm Password
                        </label>
                        <Input
                            id="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            autoComplete="new-password"
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
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </Button>
                </form>

                <div className="text-center">
                    <Link 
                        href="/onboarding?view=login" 
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Back to Login
                    </Link>
                </div>
            </Card>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<LoadingSpinner message="Loading..." />}>
            <ResetPasswordContent />
        </Suspense>
    )
}
