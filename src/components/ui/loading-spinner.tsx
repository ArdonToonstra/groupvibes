'use client'

import { Zap } from 'lucide-react'

interface LoadingSpinnerProps {
    message?: string
    fullScreen?: boolean
}

export function LoadingSpinner({ message = 'Loading...', fullScreen = true }: LoadingSpinnerProps) {
    const content = (
        <div className="animate-pulse flex flex-col items-center">
            <Zap className="w-8 h-8 text-gray-300 mb-4" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            {message && (
                <p className="mt-2 text-sm text-gray-400">{message}</p>
            )}
        </div>
    )

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                {content}
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center py-10">
            {content}
        </div>
    )
}
