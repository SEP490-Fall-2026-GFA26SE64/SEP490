import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminDashboardPage } from '../features/administration/dashboard/AdminDashboardPage'
import { DesignSystemShowcasePage } from '../features/administration/design-system/DesignSystemShowcasePage'
import { KnowledgeGraphPage } from '../features/administration/knowledge-graph/KnowledgeGraphPage'
import { LoginPage } from '../features/auth/LoginPage'
import { AssessmentPage } from '../features/learner/assessment/AssessmentPage'
import { CompetencyGapAnalysisPage } from '../features/learner/gap-analysis/CompetencyGapAnalysisPage'
import { AdaptivePathwayPage } from '../features/learner/pathway/AdaptivePathwayPage'
import { EvaluationsPage } from '../features/manager/evaluations/EvaluationsPage'
import { RoiForecastPage } from '../features/manager/roi-forecast/RoiForecastPage'
import { TeamMatrixPage } from '../features/manager/team-matrix/TeamMatrixPage'
import { SystemStatusPage } from '../features/system/SystemStatusPage'
import { Toaster } from '../shared/components/ui/Toast'
import { ToastProvider } from '../shared/hooks/useToast'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth routes: Root redirects to Login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/home" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Learner routes */}
            <Route path="/learner" element={<Navigate to="/learner/pathway" replace />} />
            <Route path="/learner/pathway" element={<AdaptivePathwayPage />} />
            <Route path="/learner/gap-analysis" element={<CompetencyGapAnalysisPage />} />
            <Route path="/learner/assessment" element={<AssessmentPage />} />
            <Route path="/assessment" element={<Navigate to="/learner/assessment" replace />} />

            {/* Manager routes */}
            <Route path="/manager" element={<Navigate to="/manager/team-matrix" replace />} />
            <Route path="/manager/team-matrix" element={<TeamMatrixPage />} />
            <Route path="/manager/roi-forecast" element={<RoiForecastPage />} />
            <Route path="/manager/evaluations" element={<EvaluationsPage />} />

            {/* Administrator routes */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="/knowledge-graph" element={<Navigate to="/admin/knowledge-graph" replace />} />
            <Route path="/admin/design-system" element={<DesignSystemShowcasePage />} />
            <Route path="/design-system" element={<Navigate to="/admin/design-system" replace />} />

            {/* System Status route */}
            <Route path="/system-status" element={<SystemStatusPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/learner/pathway" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}