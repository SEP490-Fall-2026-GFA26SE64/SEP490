import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '../../src/app/styles.css'
import { LanguageProvider } from '../../src/shared/i18n/LanguageContext'
import { ToastProvider } from '../../src/shared/hooks/useToast'
import { LoginPage } from '../../src/features/auth/LoginPage'
import { AdaptiveAssessmentPreview } from '../../src/features/manager/baseline-assessments/AdaptiveAssessmentPreview'
import { previewFixture } from './ui-refresh.fixture'
function Fixture() {
  const [open, setOpen] = useState(false)
  const mode = new URLSearchParams(window.location.search).get('mode')
  const preview = mode === 'empty' ? { feasible: true, shortages: [], sample: [] } : mode === 'infeasible' ? { feasible: false, sample: [], shortages: [{ roleId: null, microSkillId: null, kind: 'ITEM_CAPACITY' as const, required: 45, available: 0 }] } : previewFixture
  if (mode === 'login') return <LoginPage />
  return <main style={{ minHeight: '200vh' }}><button onClick={() => setOpen(true)}>Open fixture preview</button><button>Background focus target</button>
    {open && <AdaptiveAssessmentPreview preview={preview} skillNames={{ 'fixture-skill-0': 'Very long skill name '.repeat(15) }} onClose={() => setOpen(false)} />}</main>
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><ToastProvider><MemoryRouter><Fixture /></MemoryRouter></ToastProvider></LanguageProvider>)
