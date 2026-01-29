'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      let controllerChangeHandler: (() => void) | null = null
      
      // Register the service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service worker registered:', registration.scope)
          
          // If there's a waiting worker, tell it to activate immediately
          if (registration.waiting) {
            console.log('[SW] Waiting worker found on registration, activating...')
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
          
          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, tell it to activate
                  console.log('[SW] New content available, activating...')
                  newWorker.postMessage({ type: 'SKIP_WAITING' })
                }
              }, { once: true })
            }
          })
          
          // Listen for controller changes (when new SW takes over)
          controllerChangeHandler = () => {
            console.log('[SW] Controller changed - new service worker activated')
            // Note: We don't reload here to avoid disrupting the user
            // The new SW will take effect on next page load or navigation
          }
          navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler)
        })
        .catch((error) => {
          console.error('[SW] Service worker registration failed:', error)
        })
      
      // Cleanup function to remove event listener when component unmounts
      return () => {
        if (controllerChangeHandler) {
          navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
        }
      }
    }
  }, [])

  return null
}
