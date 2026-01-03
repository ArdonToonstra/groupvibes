'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from "react"
import { CheckinCard } from "@/components/stats/CheckinCard"
import { StatsView } from "@/components/stats/StatsView"
import { VibeHeatmap } from "@/components/stats/VibeHeatmap"

export default function GroupStatsPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'feed' | 'insights' | 'heatmap'>('feed')
    const [checkins, setCheckins] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                // Scope=group automatically finds group by userId from JWT
                const res = await fetch('/api/check-ins?scope=group', {
                    credentials: 'include'
                })
                if (res.status === 401) {
                    router.push('/onboarding')
                    return
                }
                if (res.ok) {
                    const data = await res.json()
                    setCheckins(data.docs || []) // Payload returns { docs: [...] } usually for find
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchFeed()
    }, [router])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Button>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Group</h1>
                    </div>

                    {/* Simple Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('feed')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'feed' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                        >
                            Feed
                        </button>
                        <button
                            onClick={() => setActiveTab('insights')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'insights' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                        >
                            Trends
                        </button>
                        <button
                            onClick={() => setActiveTab('heatmap')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'heatmap' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                        >
                            Heatmap
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-6">
                {loading ? (
                    <div className="text-center text-gray-400 py-10">Loading activity...</div>
                ) : checkins.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">No activity yet. Be the first to check in!</div>
                ) : (
                    <>
                        {activeTab === 'feed' && (
                            <div className="space-y-4">
                                {checkins.map((checkin) => (
                                    <CheckinCard key={checkin.id} checkin={checkin} />
                                ))}
                            </div>
                        )}
                        {activeTab === 'insights' && (
                            <StatsView checkins={checkins} />
                        )}
                        {activeTab === 'heatmap' && (
                            <VibeHeatmap checkins={checkins} />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
