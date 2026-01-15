'use client'

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, X, Check, Laugh, Smile, Meh, Frown, Angry } from 'lucide-react'
import { trpc } from '@/lib/trpc'

// 24 hours in milliseconds
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

const VIBE_OPTIONS = [
    { value: 10, label: 'wonderful', color: '#10B981', icon: Laugh },
    { value: 8, label: 'good', color: '#84CC16', icon: Smile },
    { value: 6, label: 'meh', color: '#3B82F6', icon: Meh },
    { value: 4, label: 'bad', color: '#F59E0B', icon: Frown },
    { value: 2, label: 'awful', color: '#EF4444', icon: Angry },
]

interface CheckinCardProps {
    checkin: any // Typing as any for now to match existing code, ideally should be a defined type
    showUser?: boolean
    currentUserId?: string
    onUpdate?: () => void
}

export function CheckinCard({ checkin, showUser = true, currentUserId, onUpdate }: CheckinCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editVibeScore, setEditVibeScore] = useState(checkin.vibeScore)
    const [editNote, setEditNote] = useState(checkin.customNote || '')
    const [saving, setSaving] = useState(false)

    const userDisplayName = checkin.user?.displayName || 'Unknown'
    const userInitial = (userDisplayName[0] || 'U').toUpperCase()

    // Check if this check-in is editable (within 24 hours and owned by current user)
    const createdAt = new Date(checkin.createdAt).getTime()
    const now = Date.now()
    const isWithin24Hours = now - createdAt <= EDIT_WINDOW_MS
    const isOwnCheckin = currentUserId && checkin.userId === currentUserId
    const canEdit = isWithin24Hours && isOwnCheckin

    const utils = trpc.useUtils()
    const updateMutation = trpc.checkIns.update.useMutation({
        onSuccess: () => {
            setIsEditing(false)
            setSaving(false)
            utils.checkIns.list.invalidate()
            onUpdate?.()
        },
        onError: (error) => {
            console.error('Failed to update check-in:', error)
            alert(error.message || 'Failed to update check-in')
            setSaving(false)
        },
    })

    const handleSave = () => {
        setSaving(true)
        updateMutation.mutate({
            id: checkin.id,
            vibeScore: editVibeScore,
            tags: checkin.tags?.map((t: any) => typeof t === 'string' ? t : t.tag) || [],
            customNote: editNote || undefined,
        })
    }

    const handleCancel = () => {
        setEditVibeScore(checkin.vibeScore)
        setEditNote(checkin.customNote || '')
        setIsEditing(false)
    }

    if (isEditing) {
        return (
            <Card className="p-5 border-2 border-primary/30 shadow-lg rounded-2xl bg-white dark:bg-gray-800">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Edit Check-in</h3>
                    <button onClick={handleCancel} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Vibe Score Selector */}
                <div className="mb-4">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">How were you feeling?</label>
                    <div className="flex justify-between gap-1">
                        {VIBE_OPTIONS.map((option) => {
                            const Icon = option.icon
                            const isSelected = editVibeScore === option.value
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => setEditVibeScore(option.value)}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isSelected ? 'bg-gray-100 dark:bg-gray-700 scale-105' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'scale-110' : ''}`}
                                        style={{ borderColor: option.color, color: option.color }}
                                    >
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-medium" style={{ color: option.color }}>
                                        {option.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Note Editor */}
                <div className="mb-4">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Note (optional)</label>
                    <Input
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Add a note..."
                        className="w-full"
                    />
                </div>

                {/* Save/Cancel Buttons */}
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleCancel} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green-500 hover:bg-green-600 text-white">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </Card>
        )
    }

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
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full">
                        <span className="text-sm font-bold text-primary">Vibe: {checkin.vibeScore}</span>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            title="Edit check-in (available for 24 hours)"
                        >
                            <Pencil className="w-4 h-4 text-gray-400 hover:text-primary" />
                        </button>
                    )}
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
                            {typeof tagObj === 'string' ? tagObj : tagObj.tag}
                        </span>
                    ))}
                </div>
            )}
        </Card>
    )
}
