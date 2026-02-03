'use client'

import { Card } from '@/components/ui/card'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { CheckinCard } from './CheckinCard'

interface DayCheckinsModalProps {
    isOpen: boolean
    onClose: () => void
    date: Date | null
    checkins: any[]
    currentUserId?: string
    onUpdate?: () => void
}

export function DayCheckinsModal({ isOpen, onClose, date, checkins, currentUserId, onUpdate }: DayCheckinsModalProps) {
    if (!isOpen || !date) return null

    // Filter check-ins for the selected date
    const dayCheckins = checkins.filter(c => {
        const checkinDate = new Date(c.createdAt)
        return format(checkinDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <Card className="relative z-10 w-full max-w-md max-h-[80vh] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            {format(date, 'EEEE, MMMM d, yyyy')}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {dayCheckins.length} check-in{dayCheckins.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
                    {dayCheckins.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">
                            No check-ins on this day.
                        </div>
                    ) : (
                        dayCheckins.map((checkin) => (
                            <CheckinCard
                                key={checkin.id}
                                checkin={checkin}
                                showUser={true}
                                currentUserId={currentUserId}
                                onUpdate={onUpdate}
                            />
                        ))
                    )}
                </div>
            </Card>
        </div>
    )
}
