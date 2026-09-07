import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSyncListeners } from './utils/syncQueue'

// Offline-first sync: listen for online/offline and process any queued drafts
initSyncListeners()

// Minimal PWA app-shell service worker (production only — dev uses HMR)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker unsupported/blocked — the app still works online
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)