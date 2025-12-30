'use client'

import * as React from "react"
import { cn } from "@/lib/cn"
import { getVibeLabel, getVibeColor } from "@/lib/utils"

export interface VibeSliderProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export function VibeSlider({ value, onChange, className }: VibeSliderProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const sliderRef = React.useRef<HTMLDivElement>(null)
  
  const handleChange = React.useCallback((clientX: number) => {
    if (!sliderRef.current) return
    
    const rect = sliderRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const newValue = Math.round(percentage * 9) + 1 // 1-10
    
    if (newValue !== value) {
      onChange(newValue)
      
      // Haptic feedback (Web Vibration API)
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }
  }, [value, onChange])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    handleChange(e.clientX)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    handleChange(e.touches[0].clientX)
  }

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleChange(e.clientX)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleChange(e.touches[0].clientX)
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, handleChange])

  const vibeColor = getVibeColor(value)
  const vibeLabel = getVibeLabel(value)

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Value Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-6xl font-mono font-bold" style={{ color: vibeColor }}>
            {value}
          </span>
          <span className="text-2xl text-gray-500 dark:text-gray-400">
            / 10
          </span>
        </div>
        <span className="text-xl font-medium text-gray-700 dark:text-gray-300">
          {vibeLabel}
        </span>
      </div>

      {/* Slider Track */}
      <div
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="relative h-16 rounded-full cursor-pointer select-none"
        style={{
          background: `linear-gradient(to right, 
            #3B82F6 0%, 
            #60A5FA 12.5%, 
            #93C5FD 25%, 
            #BFDBFE 37.5%, 
            #D1D5DB 50%, 
            #FCD34D 62.5%, 
            #FBBF24 75%, 
            #F59E0B 87.5%, 
            #EA580C 100%
          )`
        }}
      >
        {/* Handle */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-20 h-20 rounded-full",
            "shadow-lg border-4 border-white dark:border-gray-900",
            "transition-transform",
            isDragging ? "scale-110" : "scale-100"
          )}
          style={{
            left: `${((value - 1) / 9) * 100}%`,
            transform: `translate(-50%, -50%) ${isDragging ? 'scale(1.1)' : 'scale(1)'}`,
            backgroundColor: vibeColor,
            boxShadow: `0 0 20px ${vibeColor}40`
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-mono font-bold text-white">
              {value}
            </span>
          </div>
        </div>
      </div>

      {/* Scale Markers */}
      <div className="flex justify-between px-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <span
            key={num}
            className={cn(
              "text-sm font-mono",
              num === value 
                ? "text-foreground font-bold" 
                : "text-gray-400 dark:text-gray-600"
            )}
          >
            {num}
          </span>
        ))}
      </div>
    </div>
  )
}
