'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

interface PageHeaderProps {
    title: string | ReactNode
    showBackButton?: boolean
    onBack?: () => void
    rightContent?: ReactNode
    leftContent?: ReactNode
    maxWidth?: 'sm' | 'md' | 'lg' | '2xl'
}

export function PageHeader({
    title,
    showBackButton = false,
    onBack,
    rightContent,
    leftContent,
    maxWidth = '2xl'
}: PageHeaderProps) {
    const router = useRouter()

    const handleBack = () => {
        if (onBack) {
            onBack()
        } else {
            router.back()
        }
    }

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        '2xl': 'max-w-2xl'
    }

    return (
        <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 p-4 border-b border-gray-100 dark:border-gray-800">
            <div className={`${maxWidthClasses[maxWidth]} mx-auto flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                    {showBackButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleBack}
                            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Button>
                    )}
                    {leftContent}
                    {typeof title === 'string' ? (
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
                    ) : (
                        title
                    )}
                </div>
                {rightContent || <div />}
            </div>
        </div>
    )
}
