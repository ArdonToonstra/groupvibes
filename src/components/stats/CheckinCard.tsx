'use client'

import { Card } from "@/components/ui/card"

interface CheckinCardProps {
    checkin: any // Typing as any for now to match existing code, ideally should be a defined type
    showUser?: boolean
}

export function CheckinCard({ checkin, showUser = true }: CheckinCardProps) {
    const userDisplayName = checkin.user?.displayName || 'Unknown'
    const userInitial = (userDisplayName[0] || 'U').toUpperCase()

    // We can use different colors for 'Me' vs others if we want, but for now sticking to the existing logic
    // or passing a prop to override styles.
    // The previous "Group" page used blue/purple. "Me" used purple/pink. 
    // Let's stick to a neutral or passed-in style if possible, or just default to the "Group" style for consistency
    // unless we want to differentiate "My" posts in the group feed.

    return (
        <Card className="p-5 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    {showUser && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center font-bold text-primary">
                            {userInitial}
                        </div>
                    )}
                    <div>
                        {showUser && (
                            <div className="font-semibold text-gray-900 dark:text-white">
                                {userDisplayName}
                            </div>
                        )}
                        <div className="text-xs text-gray-500">
                            {new Date(checkin.createdAt).toLocaleString()}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full">
                    <span className="text-sm font-bold text-primary">Vibe: {checkin.vibeScore}</span>
                </div>
            </div>

            {checkin.customNote && (
                <p className="text-gray-600 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl text-sm italic">
                    &quot;{checkin.customNote}&quot;
                </p>
            )}

            {checkin.tags && checkin.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {checkin.tags.map((tagObj: any, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                            {tagObj.tag}
                        </span>
                    ))}
                </div>
            )}
        </Card>
    )
}
