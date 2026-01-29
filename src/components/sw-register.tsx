'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
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
              })
            }
          })
          
          // Listen for controller changes (when new SW takes over)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[SW] Controller changed - reloading page for new version')
            // Optionally reload the page to get the new version
            // window.location.reload()
          })
        })
        .catch((error) => {
          console.error('[SW] Service worker registration failed:', error)
        })
    }
  }, [])

  return null
}
