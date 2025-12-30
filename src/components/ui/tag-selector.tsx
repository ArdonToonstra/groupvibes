'use client'

import * as React from "react"
import { cn } from "@/lib/cn"
import { CONTEXT_TAGS } from "@/lib/utils"

export interface TagSelectorProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  themeColor?: string
  className?: string
}

export function TagSelector({ 
  selectedTags, 
  onChange, 
  themeColor = "#3B82F6",
  className 
}: TagSelectorProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag))
    } else {
      onChange([...selectedTags, tag])
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        What have you been up to?
      </label>
      <div className="flex flex-wrap gap-2">
        {CONTEXT_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                "border-2",
                isSelected
                  ? "text-white shadow-md"
                  : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600"
              )}
              style={
                isSelected
                  ? {
                      backgroundColor: themeColor,
                      borderColor: themeColor,
                    }
                  : {}
              }
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
