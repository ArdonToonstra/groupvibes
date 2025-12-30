'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { VibeSlider } from '@/components/ui/vibe-slider'
import { TagSelector } from '@/components/ui/tag-selector'

export default function CheckInPage() {
  const router = useRouter()
  const [vibeScore, setVibeScore] = useState(5)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)

    try {
      // Placeholder values - in production these would come from auth
      const userId = 'placeholder-user-id'
      const groupID = 'placeholder-group-id'
      const themeColor = '#3B82F6'

      const response = await fetch('/api/checkins/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          groupID,
          vibeScore,
          tags: selectedTags,
          customNote,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit check-in')
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to submit check-in:', err)
      alert('Failed to submit check-in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center pt-8 pb-4">
          <h1 className="text-3xl font-bold mb-2">How are you feeling?</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Share your current vibe with your group
          </p>
        </div>

        <Card>
          <div className="space-y-8">
            <VibeSlider value={vibeScore} onChange={setVibeScore} />
            
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <TagSelector
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                themeColor="#3B82F6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Additional notes (optional)
              </label>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Anything else you'd like to share..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 resize-none"
                rows={3}
              />
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Submitting...' : 'Submit Vibe Check'}
          </Button>
        </div>
      </div>
    </div>
  )
}
