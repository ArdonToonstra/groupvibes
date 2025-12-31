'use client'

import React from 'react'
import { Zap } from 'lucide-react'

export const Logo = () => {
    return (
        <div className="flex items-center gap-3 font-sans">
            <Zap className="w-8 h-8 text-blue-600 fill-blue-600/10" />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 tracking-tight">
                StateLink
            </span>
        </div>
    )
}

export const Icon = () => {
    return (
        <Zap className="w-6 h-6 text-blue-600 fill-blue-600/10" />
    )
}
