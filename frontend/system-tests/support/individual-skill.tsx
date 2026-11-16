import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../src/app/styles.css'
import { LanguageProvider } from '../../src/shared/i18n/LanguageContext'
import { WorkspaceSessionContext } from '../../src/shared/auth/workspaceSession'
import { UpskillSkillsPanel } from '../../src/features/employee/target-roles/UpskillSkillsPanel'
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><LanguageProvider><MemoryRouter><WorkspaceSessionContext.Provider value={{ identity: { accountId: 'fixture-learner', organizationId: 'e0000000-0000-0000-0000-000000000099', organizationName: 'UI fixture', email: 'fixture@example.test', fullName: 'Fixture learner' }, onSignOut: async () => {} }}><main className="min-h-screen bg-background p-4 text-foreground"><Routes><Route path="/employee/modules/:id" element={<h1>Reader navigation reached</h1>} /><Route path="*" element={<UpskillSkillsPanel />} /></Routes></main></WorkspaceSessionContext.Provider></MemoryRouter></LanguageProvider></QueryClientProvider>)
