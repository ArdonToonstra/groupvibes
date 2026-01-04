'use client'

import { useState, useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, isSameMonth, isSameDay, getDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface VibeHeatmapProps {
    checkins: any[]
}

export function VibeHeatmap({ checkins }: VibeHeatmapProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }) // Monday start
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
        return eachDayOfInterval({ start, end })
    }, [currentMonth])

    const dailyStats = useMemo(() => {
        const stats: Record<string, { count: number, totalVibe: number, avg: number }> = {}

        checkins.forEach(c => {
            const dayKey = format(new Date(c.createdAt), 'yyyy-MM-dd')
            if (!stats[dayKey]) {
                stats[dayKey] = { count: 0, totalVibe: 0, avg: 0 }
            }
            stats[dayKey].count += 1
            stats[dayKey].totalVibe += (c.vibeScore || 0)
        })

        // Calculate averages
        Object.keys(stats).forEach(key => {
            stats[key].avg = stats[key].totalVibe / stats[key].count
        })

        return stats
    }, [checkins])

    const getDayColor = (date: Date) => {
        const key = format(date, 'yyyy-MM-dd')
        const stat = dailyStats[key]

        if (!stat) return 'bg-gray-100 dark:bg-gray-800' // Empty

        const avg = stat.avg
        // Matching check-in colors:
        // 10: Rad (Emerald)
        // 8: Good (Lime)
        // 6: Meh (Blue)
        // 4: Bad (Amber)
        // 2: Awful (Red)

        if (avg >= 9) return 'bg-emerald-500'
        if (avg >= 7) return 'bg-lime-500'
        if (avg >= 5) return 'bg-blue-500'
        if (avg >= 3) return 'bg-amber-500'
        return 'bg-red-500'
    }

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return (
        <Card className="p-4 border-none shadow-sm rounded-xl bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="font-semibold text-gray-900 dark:text-white">
                    {format(currentMonth, 'MMMM yyyy')}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                <TooltipProvider>
                    {days.map((day, idx) => {
                        const dayKey = format(day, 'yyyy-MM-dd')
                        const stat = dailyStats[dayKey]
                        const isCurrentMonth = isSameMonth(day, currentMonth)

                        return (
                            <Tooltip key={day.toString()}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={`
                                            aspect-square rounded-md flex items-center justify-center text-xs cursor-default transition-all relative
                                            ${getDayColor(day)}
                                            ${!isCurrentMonth ? 'opacity-30' : ''}
                                            ${stat ? 'hover:scale-105 shadow-sm border border-black/5 dark:border-white/5' : ''}
                                        `}
                                    >
                                        <span className={`
                                            ${stat ? 'text-white font-bold drop-shadow-md' : 'text-gray-400'}
                                        `}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                {stat && (
                                    <TooltipContent side="top">
                                        <div className="text-xs">
                                            <div className="font-bold">{format(day, 'MMM d, yyyy')}</div>
                                            <div>Avg Vibe: {stat.avg.toFixed(1)}</div>
                                            <div>Check-ins: {stat.count}</div>
                                        </div>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        )
                    })}
                </TooltipProvider>
            </div>

            <div className="flex justify-center flex-wrap gap-3 mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Awful
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Bad
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Meh
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-lime-500"></div> Good
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Rad
                </div>
            </div>
        </Card>
    )
}
