import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminDashboardPage } from '../features/administration/dashboard/AdminDashboardPage'
import { DesignSystemShowcasePage } from '../features/administration/design-system/DesignSystemShowcasePage'
import { KnowledgeGraphPage } from '../features/administration/knowledge-graph/KnowledgeGraphPage'
import { UserManagementPage } from '../features/administration/user-management/UserManagementPage'
import { LoginPage } from '../features/auth/LoginPage'
import { AssessmentPage } from '../features/employee/assessment/AssessmentPage'
import { CompetencyGapAnalysisPage } from '../features/employee/gap-analysis/CompetencyGapAnalysisPage'
import { EmployeeOverviewPage } from '../features/employee/overview/EmployeeOverviewPage'
import { AdaptivePathwayPage } from '../features/employee/pathway/AdaptivePathwayPage'
import { EmployeeManagementPage } from '../features/line-manager/employee-management/EmployeeManagementPage'
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

            {/* 1. Employee routes (formerly Learner) */}
            <Route path="/employee" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/employee/overview" element={<EmployeeOverviewPage />} />
            <Route path="/employee/profile" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/employee/pathway" element={<AdaptivePathwayPage />} />
            <Route path="/employee/gap-analysis" element={<CompetencyGapAnalysisPage />} />
            <Route path="/employee/assessment" element={<AssessmentPage />} />

            {/* Backwards compatibility for Learner routes */}
            <Route path="/learner" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/learner/overview" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/learner/profile" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/learner/pathway" element={<Navigate to="/employee/pathway" replace />} />
            <Route path="/learner/gap-analysis" element={<Navigate to="/employee/gap-analysis" replace />} />
            <Route path="/learner/assessment" element={<Navigate to="/employee/assessment" replace />} />
            <Route path="/assessment" element={<Navigate to="/employee/assessment" replace />} />

            {/* 2. Line Manager routes */}
            <Route path="/line-manager" element={<Navigate to="/line-manager/employees" replace />} />
            <Route path="/line-manager/employees" element={<EmployeeManagementPage />} />

            {/* 3. L&D Manager routes (formerly Manager) */}
            <Route path="/ld-manager" element={<Navigate to="/ld-manager/team-matrix" replace />} />
            <Route path="/ld-manager/team-matrix" element={<TeamMatrixPage />} />
            <Route path="/ld-manager/roi-forecast" element={<RoiForecastPage />} />
            <Route path="/ld-manager/evaluations" element={<EvaluationsPage />} />

            {/* Backwards compatibility for Manager routes */}
            <Route path="/manager" element={<Navigate to="/ld-manager/team-matrix" replace />} />
            <Route path="/manager/team-matrix" element={<Navigate to="/ld-manager/team-matrix" replace />} />
            <Route path="/manager/roi-forecast" element={<Navigate to="/ld-manager/roi-forecast" replace />} />
            <Route path="/manager/evaluations" element={<Navigate to="/ld-manager/evaluations" replace />} />

            {/* 4. Administrator routes */}
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="/knowledge-graph" element={<Navigate to="/admin/knowledge-graph" replace />} />
            <Route path="/admin/design-system" element={<DesignSystemShowcasePage />} />
            <Route path="/design-system" element={<Navigate to="/admin/design-system" replace />} />

            {/* System Status route */}
            <Route path="/system-status" element={<SystemStatusPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/employee/overview" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}