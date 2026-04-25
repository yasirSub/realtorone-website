import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.tsx'
import TermsOfServicePage from './pages/TermsOfServicePage.tsx'
import ContactPage from './pages/ContactPage.tsx'
import { initFirebaseAnalytics } from './firebase'

void initFirebaseAnalytics()

const pathSeg = window.location.pathname.replace(/^\/+/, '').split('/').filter(Boolean)[0] ?? ''

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pathSeg === 'privacy' ? (
      <PrivacyPolicyPage />
    ) : pathSeg === 'terms' ? (
      <TermsOfServicePage />
    ) : pathSeg === 'contact' ? (
      <ContactPage />
    ) : (
      <App />
    )}
  </StrictMode>,
)
