'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageHeader } from "@/components/ui/page-header"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from "react"
import { CheckinCard } from "@/components/stats/CheckinCard"
import { StatsView } from "@/components/stats/StatsView"
import { VibeHeatmap } from "@/components/stats/VibeHeatmap"

export default function MyStatsPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'feed' | 'insights' | 'heatmap'>('feed')
    const [checkins, setCheckins] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                // Fetch only my checkins - user determined by JWT
                const res = await fetch('/api/check-ins', {
                    credentials: 'include'
                })
                if (res.status === 401) {
                    router.push('/onboarding')
                    return
                }
                if (res.ok) {
                    const data = await res.json()
                    setCheckins(data.docs || [])
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchFeed()
    }, [router])

    const tabToggle = (
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
    )

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <PageHeader
                title="My Stats"
                showBackButton
                maxWidth="2xl"
                rightContent={tabToggle}
            />

            <div className="max-w-2xl mx-auto p-4 space-y-6">
                {loading ? (
                    <LoadingSpinner message="Loading history..." fullScreen={false} />
                ) : checkins.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">No check-ins found.</div>
                ) : (
                    <>
                        {activeTab === 'feed' && (
                            <div className="space-y-4">
                                {checkins.map((checkin) => (
                                    <CheckinCard key={checkin.id} checkin={checkin} showUser={true} />
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
