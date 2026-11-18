import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../src/app/styles.css'
import { LanguageProvider } from '../../src/shared/i18n/LanguageContext'
import { WorkspaceSessionContext } from '../../src/shared/auth/workspaceSession'
import { MySkillsSummary } from '../../src/features/employee/baseline-assessment/MySkillsPage'
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><LanguageProvider><MemoryRouter><WorkspaceSessionContext.Provider value={{ identity: { accountId: 'fixture-learner', organizationId: 'fixture-org', fullName: 'Fixture learner', email: 'fixture@example.test', organizationName: 'UI fixture', roles: ['EMPLOYEE'] }, onSignOut: async () => {} }}><main className="min-h-screen bg-background p-4 text-foreground"><Routes><Route path="/employee/baseline-assessment/:id" element={<h1>Assessment result navigation reached</h1>} /><Route path="*" element={<MySkillsSummary />} /></Routes></main></WorkspaceSessionContext.Provider></MemoryRouter></LanguageProvider></QueryClientProvider>)
