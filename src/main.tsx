import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Review } from './review-kit'

// Firebase web config is public by design; it lives in .env.local (see .env.example)
const env = import.meta.env
const REVIEW_FIREBASE = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

// Without a Firebase config the prototype runs on its own, with no review layer
const app = REVIEW_FIREBASE.apiKey ? (
  <Review
    project={env.VITE_REVIEW_PROJECT || 'my-app'}
    firebase={REVIEW_FIREBASE}
    password={env.VITE_REVIEW_PASSWORD || undefined}
    title={env.VITE_REVIEW_TITLE || 'App design prototype'}
  >
    <App />
  </Review>
) : (
  <App />
)

createRoot(document.getElementById('root')!).render(<StrictMode>{app}</StrictMode>)
