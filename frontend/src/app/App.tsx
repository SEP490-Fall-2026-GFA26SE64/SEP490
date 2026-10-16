import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminDashboardPage } from '../features/administration/dashboard/AdminDashboardPage'
import { DesignSystemShowcasePage } from '../features/administration/design-system/DesignSystemShowcasePage'
import { KnowledgeGraphPage } from '../features/administration/knowledge-graph/KnowledgeGraphPage'
import { LoginPage } from '../features/auth/LoginPage'
import { AssessmentPage } from '../features/employee/assessment/AssessmentPage'
import { CompetencyGapAnalysisPage } from '../features/employee/gap-analysis/CompetencyGapAnalysisPage'
import { EmployeeOverviewPage } from '../features/employee/overview/EmployeeOverviewPage'
import { AdaptivePathwayPage } from '../features/employee/pathway/AdaptivePathwayPage'
import { EmployeeTargetRolesPage } from '../features/employee/target-roles/EmployeeTargetRolesPage'
import { EmployeeRoleGuidancePage } from '../features/employee/guidance/EmployeeRoleGuidancePage'
import { AssessmentBankPage } from '../features/manager/assessment-bank/AssessmentBankPage'
import { BaselineBlueprintPage } from '../features/manager/baseline-blueprints/BaselineBlueprintPage'
import { LearningModulesPage } from '../features/manager/modules/LearningModulesPage'
import { CompetencyOntologyPage } from '../features/manager/ontology/CompetencyOntologyPage'
import { ExpertAssignedRolesPage } from '../features/expert/target-roles/ExpertAssignedRolesPage'
import { ExpertPathwayReviewPage } from '../features/expert/guidance-review/ExpertGuidanceReviewPage'
import { OccupationsManagementPage } from '../features/manager/occupations/OccupationsManagementPage'
import { ContentApprovalQueuePage } from '../features/manager/approvals/ContentApprovalQueuePage'
import { LearningOutcomesPage } from '../features/manager/learning-outcomes/LearningOutcomesPage'
import { TargetRolesPage } from '../features/manager/target-roles/TargetRolesPage'
import { TeamMatrixPage } from '../features/manager/team-matrix/TeamMatrixPage'
import { UserManagementPage } from '../features/manager/user-management/UserManagementPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { SystemStatusPage } from '../features/system/SystemStatusPage'
import { Toaster } from '../shared/components/ui/Toast'
import { ToastProvider } from '../shared/hooks/useToast'
import { LanguageProvider } from '../shared/i18n/LanguageContext'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LanguageProvider>
          <BrowserRouter>
          <Routes>
            {/* Auth routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/home" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Out-of-scope package & guest routes redirect to login */}
            <Route path="/packages" element={<Navigate to="/login" replace />} />
            <Route path="/guest/packages" element={<Navigate to="/login" replace />} />
            <Route path="/guest" element={<Navigate to="/login" replace />} />

            {/* 1. Employee routes (Primary) */}
            <Route path="/employee" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/employee/overview" element={<EmployeeOverviewPage />} />
            <Route path="/employee/upskilling" element={<EmployeeTargetRolesPage />} />
            <Route path="/employee/target-roles" element={<Navigate to="/employee/upskilling" replace />} />
            <Route path="/employee/guidance" element={<EmployeeRoleGuidancePage />} />
            <Route path="/employee/pathway" element={<AdaptivePathwayPage />} />
            <Route path="/employee/gap-analysis" element={<CompetencyGapAnalysisPage />} />
            <Route path="/employee/assessment" element={<AssessmentPage />} />
            <Route path="/employee/profile" element={<Navigate to="/profile" replace />} />

            {/* Dedicated Profile Route for All Actors */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Backwards compatibility for Learner routes */}
            <Route path="/learner" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/learner/overview" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/learner/upskilling" element={<Navigate to="/employee/upskilling" replace />} />
            <Route path="/learner/target-roles" element={<Navigate to="/employee/upskilling" replace />} />
            <Route path="/learner/pathway" element={<Navigate to="/employee/pathway" replace />} />
            <Route path="/learner/gap-analysis" element={<Navigate to="/employee/gap-analysis" replace />} />
            <Route path="/learner/assessment" element={<Navigate to="/employee/assessment" replace />} />
            <Route path="/learner/profile" element={<Navigate to="/profile" replace />} />
            <Route path="/assessment" element={<Navigate to="/employee/assessment" replace />} />

            {/* 2. Expert routes (Target Roles, Ontology, Modules, Assessment Bank) */}
            <Route path="/expert" element={<Navigate to="/expert/target-roles" replace />} />
            <Route path="/expert/target-roles" element={<ExpertAssignedRolesPage />} />
            <Route path="/expert/assigned-roles" element={<Navigate to="/expert/target-roles" replace />} />
            <Route path="/expert/pathway-review" element={<ExpertPathwayReviewPage />} />
            <Route path="/expert/guidance-review" element={<Navigate to="/expert/pathway-review" replace />} />
            <Route path="/expert/ontology" element={<CompetencyOntologyPage />} />
            <Route path="/expert/modules" element={<LearningModulesPage />} />
            <Route path="/expert/assessment-bank" element={<AssessmentBankPage />} />

            {/* 3. L&D Manager routes (Occupations, Target Roles, Approvals, Team Matrix, Outcomes, Users) */}
            <Route path="/ld-manager" element={<Navigate to="/ld-manager/occupations" replace />} />
            <Route path="/ld-manager/occupations" element={<OccupationsManagementPage />} />
            <Route path="/ld-manager/disciplines" element={<Navigate to="/ld-manager/occupations" replace />} />
            <Route path="/ld-manager/target-roles" element={<TargetRolesPage />} />
            <Route path="/ld-manager/approvals" element={<ContentApprovalQueuePage />} />
            <Route path="/ld-manager/team-matrix" element={<TeamMatrixPage />} />
            <Route path="/ld-manager/assessment-bank" element={<BaselineBlueprintPage />} />
            <Route path="/ld-manager/learning-outcomes" element={<LearningOutcomesPage />} />
            <Route path="/ld-manager/users" element={<UserManagementPage />} />
            <Route path="/ld-manager/roi-forecast" element={<Navigate to="/ld-manager/team-matrix" replace />} />
            <Route path="/ld-manager/evaluations" element={<Navigate to="/ld-manager/team-matrix" replace />} />

            {/* Redirects from old L&D Manager / Manager routes to new Expert and L&D locations */}
            <Route path="/ld-manager/ontology" element={<Navigate to="/expert/ontology" replace />} />
            <Route path="/ld-manager/modules" element={<Navigate to="/expert/modules" replace />} />
            <Route path="/manager/ontology" element={<Navigate to="/expert/ontology" replace />} />
            <Route path="/manager/modules" element={<Navigate to="/expert/modules" replace />} />
            <Route path="/manager/assessment-bank" element={<Navigate to="/ld-manager/assessment-bank" replace />} />
            <Route path="/manager" element={<Navigate to="/ld-manager/learning-outcomes" replace />} />
            <Route path="/manager/learning-outcomes" element={<Navigate to="/ld-manager/learning-outcomes" replace />} />
            <Route path="/manager/target-roles" element={<Navigate to="/ld-manager/target-roles" replace />} />
            <Route path="/manager/users" element={<Navigate to="/ld-manager/users" replace />} />
            <Route path="/manager/team-matrix" element={<Navigate to="/ld-manager/team-matrix" replace />} />
            <Route path="/manager/roi-forecast" element={<Navigate to="/ld-manager/team-matrix" replace />} />

            {/* 4. Administrator routes (Taxonomy, Knowledge Graph, Design System) */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="/knowledge-graph" element={<Navigate to="/admin/knowledge-graph" replace />} />
            <Route path="/admin/design-system" element={<DesignSystemShowcasePage />} />
            <Route path="/design-system" element={<Navigate to="/admin/design-system" replace />} />
            <Route path="/admin/users" element={<UserManagementPage />} />

            {/* System Status route */}
            <Route path="/system-status" element={<SystemStatusPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/employee/overview" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
        </LanguageProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
