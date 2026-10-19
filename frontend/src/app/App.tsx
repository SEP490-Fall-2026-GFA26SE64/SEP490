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
import { AssessmentBankPage } from '../features/manager/assessment-bank/AssessmentBankPage'
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
import { GuestRegisterPage } from '../features/guest/GuestRegisterPage'
import { SubscriptionPlansPage } from '../features/guest/SubscriptionPlansPage'
import { PayOsCheckoutPage } from '../features/guest/PayOsCheckoutPage'
import { WorkspaceProvisioningPage } from '../features/guest/WorkspaceProvisioningPage'
import { PlatformOrganizationsPage } from '../features/platform-admin/PlatformOrganizationsPage'
import { PlatformSubscriptionsConfigPage } from '../features/platform-admin/PlatformSubscriptionsConfigPage'
import { PlatformActivityMonitoringPage } from '../features/platform-admin/PlatformActivityMonitoringPage'
import { DepartmentsManagementPage } from '../features/administration/departments/DepartmentsManagementPage'
import { OrganizationSettingsPage } from '../features/administration/settings/OrganizationSettingsPage'
import { OrganizationSubscriptionPage } from '../features/administration/subscription/OrganizationSubscriptionPage'
import { BaselineAssessmentConfigPage } from '../features/manager/baseline-config/BaselineAssessmentConfigPage'
import { LearningModuleReaderPage } from '../features/employee/modules/LearningModuleReaderPage'
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

            {/* Guest Self-Service Onboarding & Subscription */}
            <Route path="/register" element={<GuestRegisterPage />} />
            <Route path="/guest/register" element={<GuestRegisterPage />} />
            <Route path="/packages" element={<SubscriptionPlansPage />} />
            <Route path="/guest/packages" element={<Navigate to="/packages" replace />} />
            <Route path="/guest/plans" element={<SubscriptionPlansPage />} />
            <Route path="/guest/checkout" element={<PayOsCheckoutPage />} />
            <Route path="/guest/onboarding-status" element={<WorkspaceProvisioningPage />} />
            <Route path="/guest" element={<Navigate to="/guest/register" replace />} />

            {/* 1. Employee routes (Primary) */}
            <Route path="/employee" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/employee/overview" element={<EmployeeOverviewPage />} />
            <Route path="/employee/upskilling" element={<EmployeeTargetRolesPage />} />
            <Route path="/employee/target-roles" element={<Navigate to="/employee/upskilling" replace />} />
            <Route path="/employee/riasec" element={<Navigate to="/employee/assessment?tab=baseline" replace />} />
            <Route path="/employee/guidance" element={<Navigate to="/employee/upskilling?tab=roles" replace />} />
            <Route path="/employee/pathway" element={<AdaptivePathwayPage />} />
            <Route path="/employee/modules/:moduleId" element={<LearningModuleReaderPage />} />
            <Route path="/employee/modules" element={<Navigate to="/employee/pathway" replace />} />
            <Route path="/employee/skills-catalog" element={<Navigate to="/employee/upskilling?tab=skills" replace />} />
            <Route path="/employee/skills" element={<Navigate to="/employee/upskilling?tab=skills" replace />} />
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
            <Route path="/learner/riasec" element={<Navigate to="/employee/riasec" replace />} />
            <Route path="/learner/pathway" element={<Navigate to="/employee/pathway" replace />} />
            <Route path="/learner/modules/:moduleId" element={<LearningModuleReaderPage />} />
            <Route path="/learner/skills-catalog" element={<Navigate to="/employee/skills-catalog" replace />} />
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
            <Route path="/ld-manager/learning-outcomes" element={<LearningOutcomesPage />} />
            <Route path="/ld-manager/baseline-config" element={<BaselineAssessmentConfigPage />} />
            <Route path="/ld-manager/users" element={<UserManagementPage />} />
            <Route path="/ld-manager/roi-forecast" element={<Navigate to="/ld-manager/team-matrix" replace />} />
            <Route path="/ld-manager/evaluations" element={<Navigate to="/ld-manager/team-matrix" replace />} />

            {/* Redirects from old L&D Manager / Manager routes to new Expert and L&D locations */}
            <Route path="/ld-manager/ontology" element={<Navigate to="/expert/ontology" replace />} />
            <Route path="/ld-manager/modules" element={<Navigate to="/expert/modules" replace />} />
            <Route path="/ld-manager/assessment-bank" element={<Navigate to="/expert/assessment-bank" replace />} />
            <Route path="/manager/baseline-config" element={<Navigate to="/ld-manager/baseline-config" replace />} />
            <Route path="/manager/ontology" element={<Navigate to="/expert/ontology" replace />} />
            <Route path="/manager/modules" element={<Navigate to="/expert/modules" replace />} />
            <Route path="/manager/assessment-bank" element={<Navigate to="/expert/assessment-bank" replace />} />
            <Route path="/manager" element={<Navigate to="/ld-manager/learning-outcomes" replace />} />
            <Route path="/manager/learning-outcomes" element={<Navigate to="/ld-manager/learning-outcomes" replace />} />
            <Route path="/manager/target-roles" element={<Navigate to="/ld-manager/target-roles" replace />} />
            <Route path="/manager/users" element={<Navigate to="/ld-manager/users" replace />} />
            <Route path="/manager/team-matrix" element={<Navigate to="/ld-manager/team-matrix" replace />} />
            <Route path="/manager/roi-forecast" element={<Navigate to="/ld-manager/team-matrix" replace />} />

            {/* 4. Administrator routes (Taxonomy, Knowledge Graph, Departments, Settings, Subscription, Design System) */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/departments" element={<DepartmentsManagementPage />} />
            <Route path="/admin/organization-settings" element={<OrganizationSettingsPage />} />
            <Route path="/admin/subscription" element={<OrganizationSubscriptionPage />} />
            <Route path="/admin/billing" element={<Navigate to="/admin/subscription" replace />} />
            <Route path="/admin/knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="/knowledge-graph" element={<Navigate to="/admin/knowledge-graph" replace />} />
            <Route path="/admin/design-system" element={<DesignSystemShowcasePage />} />
            <Route path="/design-system" element={<Navigate to="/admin/design-system" replace />} />
            <Route path="/admin/users" element={<UserManagementPage />} />

            {/* 5. Platform Administrator routes (Multi-Tenant Organizations, Subscriptions, Platform Telemetry) */}
            <Route path="/platform-admin" element={<Navigate to="/platform-admin/organizations" replace />} />
            <Route path="/platform-admin/organizations" element={<PlatformOrganizationsPage />} />
            <Route path="/platform-admin/subscriptions" element={<PlatformSubscriptionsConfigPage />} />
            <Route path="/platform-admin/activity" element={<PlatformActivityMonitoringPage />} />

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