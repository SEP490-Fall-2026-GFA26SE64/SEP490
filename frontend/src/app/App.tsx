import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { WorkspaceBoundary } from '../features/subscription/WorkspaceBoundary'
import { Toaster } from '../shared/components/ui/Toast'
import { ToastProvider } from '../shared/hooks/useToast'
import { PageLoader } from '../shared/components/ui/PageLoader'
import { LanguageProvider } from '../shared/i18n/LanguageContext'
import { WorkspaceSlugContext, workspaceBase } from '../shared/auth/workspacePaths'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
})

const AdaptivePathwayPage = lazy(() => import('../features/employee/pathway/AdaptivePathwayPage').then(module => ({ default: module.AdaptivePathwayPage })))
const LearningUploadSettingsPage = lazy(() => import('../features/platform-admin/LearningUploadSettingsPage').then(module => ({ default: module.LearningUploadSettingsPage })))
const PlatformGraphBenchmarkPage = lazy(() => import('../features/platform-admin/PlatformGraphBenchmarkPage').then(module => ({ default: module.PlatformGraphBenchmarkPage })))
const LearningModuleReaderPage = lazy(() => import('../features/employee/modules/LearningModuleReaderPage').then(module => ({ default: module.LearningModuleReaderPage })))
const AdminDashboardPage = lazy(() => import('../features/administration/dashboard/AdminDashboardPage').then(module => ({ default: module.AdminDashboardPage })))
const DesignSystemShowcasePage = lazy(() => import('../features/administration/design-system/DesignSystemShowcasePage').then(module => ({ default: module.DesignSystemShowcasePage })))
const KnowledgeGraphPage = lazy(() => import('../features/administration/knowledge-graph/KnowledgeGraphPage').then(module => ({ default: module.KnowledgeGraphPage })))
const LoginPage = lazy(() => import('../features/auth/LoginPage').then(module => ({ default: module.LoginPage })))
const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('../features/auth/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })))
const MemberActivationPage = lazy(() => import('../features/subscription/WorkspaceLoginPage').then(module => ({ default: module.MemberActivationPage })))
const AssessmentPage = lazy(() => import('../features/employee/assessment/AssessmentPage').then(module => ({ default: module.AssessmentPage })))
const RiasecAttemptPage = lazy(() => import('../features/employee/riasec/RiasecExperience').then(module => ({ default: module.RiasecAttemptPage })))
const RiasecRedirect = lazy(() => import('../features/employee/riasec/riasecNavigation').then(module => ({ default: module.RiasecRedirect })))
const EmployeeBaselineRoute = lazy(() => import('../features/employee/baseline-assessment/EmployeeBaselinePage').then(module => ({ default: module.EmployeeBaselineRoute })))
const MySkillsPage = lazy(() => import('../features/employee/baseline-assessment/MySkillsPage').then(module => ({ default: module.MySkillsPage })))
const MyMasteryPage = lazy(() => import('../features/employee/baseline-assessment/MyMasteryPage').then(module => ({ default: module.MyMasteryPage })))
const EmployeeOverviewPage = lazy(() => import('../features/employee/overview/EmployeeOverviewPage').then(module => ({ default: module.EmployeeOverviewPage })))
const EmployeeTargetRolesPage = lazy(() => import('../features/employee/target-roles/EmployeeTargetRolesPage').then(module => ({ default: module.EmployeeTargetRolesPage })))
const EmployeeUpskillingPage = lazy(() => import('../features/employee/target-roles/EmployeeTargetRolesPage').then(module => ({ default: module.EmployeeUpskillingPage })))
const AssessmentBankPage = lazy(() => import('../features/manager/assessment-bank/AssessmentBankPage').then(module => ({ default: module.AssessmentBankPage })))
const AdaptiveBaselineRoute = lazy(() => import('../features/manager/baseline-assessments/AdaptiveBaselinePage').then(module => ({ default: module.AdaptiveBaselineRoute })))
const SkillAssessmentConfigurationPage = lazy(() => import('../features/manager/baseline-assessments/ScopedAssessmentConfiguration').then(module => ({ default: module.SkillAssessmentConfigurationPage })))
const LegacyBaselineAssessmentRedirect = lazy(() => import('../features/manager/baseline-assessments/LegacyBaselineAssessmentRedirect').then(module => ({ default: module.LegacyBaselineAssessmentRedirect })))
const LearningModulesPage = lazy(() => import('../features/manager/modules/LearningModulesPage').then(module => ({ default: module.LearningModulesPage })))
const CompetencyOntologyPage = lazy(() => import('../features/manager/ontology/CompetencyOntologyPage').then(module => ({ default: module.CompetencyOntologyPage })))
const CertificatesPage = lazy(() => import('../features/expert/certificates/CertificatesPage').then(module => ({ default: module.CertificatesPage })))
const LearningContentAuthoringPage = lazy(() => import('../features/expert/content/LearningContentAuthoringPage').then(module => ({ default: module.LearningContentAuthoringPage })))
const ExpertAssignedRolesPage = lazy(() => import('../features/expert/target-roles/ExpertAssignedRolesPage').then(module => ({ default: module.ExpertAssignedRolesPage })))
const ExpertPathwayReviewPage = lazy(() => import('../features/expert/guidance-review/ExpertGuidanceReviewPage').then(module => ({ default: module.ExpertPathwayReviewPage })))
const ExpertPathwayDetailPage = lazy(() => import('../features/expert/pathway-review/ExpertPathwayDetailPage').then(module => ({ default: module.ExpertPathwayDetailPage })))
const JobPositionsManagementPage = lazy(() => import('../features/manager/job-positions/JobPositionsManagementPage').then(module => ({ default: module.JobPositionsManagementPage })))
const DevelopmentDashboardPage = lazy(() => import('../features/manager/development/DevelopmentDashboardPage').then(module => ({ default: module.DevelopmentDashboardPage })))
const TargetRolesPage = lazy(() => import('../features/manager/target-roles/TargetRolesPage').then(module => ({ default: module.TargetRolesPage })))
const EmployeesPage = lazy(() => import('../features/manager/development/EmployeesPage').then(module => ({ default: module.EmployeesPage })))
const EmployeeDevelopmentPage = lazy(() => import('../features/manager/development/EmployeeDevelopmentPage').then(module => ({ default: module.EmployeeDevelopmentPage })))
const UserManagementPage = lazy(() => import('../features/administration/user-management/UserManagementPage').then(module => ({ default: module.UserManagementPage })))
const ProfilePage = lazy(() => import('../features/profile/ProfilePage').then(module => ({ default: module.ProfilePage })))
const SystemStatusPage = lazy(() => import('../features/system/SystemStatusPage').then(module => ({ default: module.SystemStatusPage })))
const GuestRegisterPage = lazy(() => import('../features/guest/GuestRegisterPage').then(module => ({ default: module.GuestRegisterPage })))
const SubscriptionPlansPage = lazy(() => import('../features/guest/SubscriptionPlansPage').then(module => ({ default: module.SubscriptionPlansPage })))
const PayOsCheckoutPage = lazy(() => import('../features/guest/PayOsCheckoutPage').then(module => ({ default: module.PayOsCheckoutPage })))
const GuestSubscriptionPage = lazy(() => import('../features/subscription/GuestSubscriptionPage').then(module => ({ default: module.GuestSubscriptionPage })))
const AdminPaymentResultPage = lazy(() => import('../features/subscription/AdminPaymentResultPage').then(module => ({ default: module.AdminPaymentResultPage })))
const WorkspaceProvisioningPage = lazy(() => import('../features/guest/WorkspaceProvisioningPage').then(module => ({ default: module.WorkspaceProvisioningPage })))
const PlatformWorkspacePage = lazy(() => import('../features/subscription/PlatformWorkspaceControls').then(module => ({ default: module.PlatformWorkspacePage })))
const PlatformSubscriptionsConfigPage = lazy(() => import('../features/platform-admin/PlatformSubscriptionsConfigPage').then(module => ({ default: module.PlatformSubscriptionsConfigPage })))
const PlatformActivityMonitoringPage = lazy(() => import('../features/platform-admin/PlatformActivityMonitoringPage').then(module => ({ default: module.PlatformActivityMonitoringPage })))
const DepartmentsManagementPage = lazy(() => import('../features/administration/departments/DepartmentsManagementPage').then(module => ({ default: module.DepartmentsManagementPage })))
const OrganizationSettingsPage = lazy(() => import('../features/administration/settings/OrganizationSettingsPage').then(module => ({ default: module.OrganizationSettingsPage })))
const OrganizationSubscriptionPage = lazy(() => import('../features/administration/subscription/OrganizationSubscriptionPage').then(module => ({ default: module.OrganizationSubscriptionPage })))
const LdModuleWorkspaceRoute = lazy(() => import('../features/manager/approvals/ContentApprovalQueuePage').then(module => ({ default: module.LdModuleWorkspaceRoute })))

const GuestLandingPage = lazy(() => import('../features/guest/GuestLandingPage').then(module => ({ default: module.GuestLandingPage })))
const DemoResetPage = lazy(() => import('../features/demo-reset/DemoResetPage').then(module => ({ default: module.DemoResetPage })))

export default function App() {
  // Workspace pages live under /workspace/{slug}; the router basename keeps in-app paths workspace-relative.
  const workspace = workspaceBase(window.location.pathname)
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LanguageProvider>
          <BrowserRouter basename={workspace?.basename}>
          <WorkspaceSlugContext.Provider value={workspace?.slug ?? null}>
          <WorkspaceBoundary><Suspense fallback={<div role="status" className="p-6 text-muted-foreground">Loading...</div>}><Routes>
            {/* Auth routes */}
            <Route path="/" element={<Suspense fallback={<PageLoader variant="fullscreen" />}><GuestLandingPage /></Suspense>} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/reset" element={<DemoResetPage />} />
            <Route path="/activate" element={<MemberActivationPage />} />
            <Route path="/active" element={<MemberActivationPage />} />

            {/* Guest Self-Service Onboarding & Subscription */}
            <Route path="/register" element={<GuestRegisterPage />} />
            <Route path="/guest/register" element={<GuestRegisterPage />} />
            <Route path="/guest/resume" element={<GuestRegisterPage mode="resume" />} />
            <Route path="/packages" element={<SubscriptionPlansPage />} />
            <Route path="/guest/packages" element={<Navigate to="/packages" replace />} />
            <Route path="/guest/plans" element={<SubscriptionPlansPage />} />
            <Route path="/guest/checkout" element={<PayOsCheckoutPage />} />
            <Route path="/guest/payment-result" element={<GuestSubscriptionPage mode="result" />} />
            <Route path="/guest/onboarding-status" element={<WorkspaceProvisioningPage />} />
            <Route path="/guest" element={<Navigate to="/" replace />} />

            {/* 1. Employee routes (Primary) */}
            <Route path="/employee" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/employee/overview" element={<EmployeeOverviewPage />} />
            <Route path="/employee/upskilling" element={<EmployeeUpskillingPage />} />
            <Route path="/employee/target-roles" element={<EmployeeTargetRolesPage />} />
            <Route path="/employee/riasec" element={<RiasecRedirect />} />
            <Route path="/employee/riasec/attempt/:attemptId" element={<RiasecAttemptPage />} />
            <Route path="/employee/guidance" element={<Navigate to="/employee/upskilling?tab=roles" replace />} />
            <Route path="/employee/pathway" element={<AdaptivePathwayPage />} />
            <Route path="/employee/modules/:moduleId" element={<LearningModuleReaderPage />} />
            <Route path="/employee/modules" element={<Navigate to="/employee/pathway" replace />} />
            <Route path="/employee/skills-catalog" element={<Navigate to="/employee/upskilling?tab=skills" replace />} />
            <Route path="/employee/skills" element={<Navigate to="/employee/upskilling?tab=skills" replace />} />
            <Route path="/employee/gap-analysis" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/employee/assessment" element={<AssessmentPage />} />
            <Route path="/employee/baseline-assessment" element={<EmployeeBaselineRoute />} />
            <Route path="/employee/my-skills" element={<MySkillsPage />} />
            <Route path="/employee/my-mastery" element={<MyMasteryPage />} />
            <Route path="/employee/baseline-assessment/:attemptId" element={<EmployeeBaselineRoute />} />
            <Route path="/employee/profile" element={<Navigate to="/profile" replace />} />

            {/* Dedicated Profile Route for All Actors */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Backwards compatibility for Learner routes */}
            <Route path="/learner" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/learner/overview" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/learner/upskilling" element={<Navigate to="/employee/upskilling" replace />} />
            <Route path="/learner/target-roles" element={<Navigate to="/employee/target-roles" replace />} />
            <Route path="/learner/riasec" element={<RiasecRedirect />} />
            <Route path="/learner/pathway" element={<Navigate to="/employee/pathway" replace />} />
            <Route path="/learner/modules/:moduleId" element={<LearningModuleReaderPage />} />
            <Route path="/learner/skills-catalog" element={<Navigate to="/employee/skills-catalog" replace />} />
            <Route path="/learner/gap-analysis" element={<Navigate to="/employee/overview" replace />} />
            <Route path="/learner/assessment" element={<Navigate to="/employee/assessment" replace />} />
            <Route path="/learner/profile" element={<Navigate to="/profile" replace />} />
            <Route path="/assessment" element={<Navigate to="/employee/assessment" replace />} />

            {/* 2. Expert routes (Roles, Ontology, Modules, Assessment Bank) */}
            <Route path="/expert" element={<Navigate to="/expert/roles" replace />} />
            <Route path="/expert/roles" element={<ExpertAssignedRolesPage />} />
            <Route path="/expert/target-roles" element={<Navigate to="/expert/roles" replace />} />
            <Route path="/expert/assigned-roles" element={<Navigate to="/expert/roles" replace />} />
            <Route path="/expert/pathway-review" element={<ExpertPathwayReviewPage />} />
            <Route path="/expert/pathway-review/:pathwayId" element={<ExpertPathwayDetailPage />} />
            <Route path="/expert/guidance-review" element={<Navigate to="/expert/pathway-review" replace />} />
            <Route path="/expert/ontology" element={<CompetencyOntologyPage />} />
            <Route path="/expert/certificates" element={<CertificatesPage />} />
            <Route path="/ld-manager/certificates" element={<CertificatesPage manager />} />
            <Route path="/expert/learning-content" element={<LearningContentAuthoringPage />} />
            <Route path="/expert/modules" element={<LearningModulesPage />} />
            <Route path="/expert/assessment-bank" element={<AssessmentBankPage />} />
            <Route path="/expert/skill-assessment-config" element={<SkillAssessmentConfigurationPage />} />

            {/* 3. L&D Manager routes (JobPositions, Target Roles, Approvals, Team Matrix, Outcomes, Users) */}
            <Route path="/ld-manager" element={<Navigate to="/ld-manager/dashboard" replace />} />
            <Route path="/ld-manager/job-positions" element={<JobPositionsManagementPage />} />
            <Route path="/ld-manager/disciplines" element={<Navigate to="/ld-manager/job-positions" replace />} />
            <Route path="/ld-manager/roles" element={<TargetRolesPage />} />
            <Route path="/ld-manager/target-roles" element={<Navigate to="/ld-manager/roles" replace />} />
            <Route element={<LdModuleWorkspaceRoute />}>
              <Route path="/ld-manager/approvals" />
              <Route path="/ld-manager/modules" />
            </Route>
            <Route path="/ld-manager/learning-content" element={<Navigate to="/ld-manager/modules" replace />} />
            <Route path="/ld-manager/employees" element={<EmployeesPage />} />
            <Route path="/ld-manager/employees/:accountId" element={<EmployeeDevelopmentPage />} />
            <Route path="/ld-manager/team-matrix" element={<Navigate to="/ld-manager/employees" replace />} />
            <Route path="/ld-manager/dashboard" element={<DevelopmentDashboardPage />} />
            <Route path="/ld-manager/baseline-assessments" element={<AdaptiveBaselineRoute />} />
            <Route path="/ld-manager/baseline-assessments/:jobPositionId/*" element={<AdaptiveBaselineRoute />} />
            <Route path="/ld-manager/question-bank" element={<AssessmentBankPage />} />
            <Route path="/ld-manager/assessment-bank" element={<LegacyBaselineAssessmentRedirect />} />
            <Route path="/ld-manager/learning-outcomes" element={<Navigate to="/ld-manager/dashboard" replace />} />
            <Route path="/ld-manager/baseline-config" element={<Navigate to="/ld-manager/baseline-assessments" replace />} />
            <Route path="/ld-manager/users" element={<Navigate to="/admin/users" replace />} />
            <Route path="/ld-manager/roi-forecast" element={<Navigate to="/ld-manager/dashboard" replace />} />
            <Route path="/ld-manager/evaluations" element={<Navigate to="/ld-manager/employees" replace />} />

            {/* Redirects from old L&D Manager / Manager routes to new Expert and L&D locations */}
            <Route path="/ld-manager/ontology" element={<Navigate to="/expert/ontology" replace />} />
            <Route path="/manager/baseline-config" element={<Navigate to="/ld-manager/baseline-assessments" replace />} />
            <Route path="/manager/ontology" element={<Navigate to="/expert/ontology" replace />} />
            <Route path="/manager/modules" element={<Navigate to="/ld-manager/modules" replace />} />
            <Route path="/manager/assessment-bank" element={<LegacyBaselineAssessmentRedirect />} />
            <Route path="/manager/job-positions" element={<Navigate to="/ld-manager/job-positions" replace />} />
            <Route path="/manager/job-positions" element={<Navigate to="/ld-manager/job-positions" replace />} />
            <Route path="/manager" element={<Navigate to="/ld-manager/dashboard" replace />} />
            <Route path="/manager/learning-outcomes" element={<Navigate to="/ld-manager/dashboard" replace />} />
            <Route path="/manager/roles" element={<Navigate to="/ld-manager/roles" replace />} />
            <Route path="/manager/target-roles" element={<Navigate to="/ld-manager/roles" replace />} />
            <Route path="/manager/users" element={<Navigate to="/ld-manager/users" replace />} />
            <Route path="/manager/team-matrix" element={<Navigate to="/ld-manager/employees" replace />} />
            <Route path="/manager/roi-forecast" element={<Navigate to="/ld-manager/dashboard" replace />} />

            {/* 4. Administrator routes (Taxonomy, Knowledge Graph, Departments, Settings, Subscription, Design System) */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/departments" element={<DepartmentsManagementPage />} />
            <Route path="/admin/organization-settings" element={<OrganizationSettingsPage />} />
            <Route path="/admin/subscription" element={<OrganizationSubscriptionPage />} />
            <Route path="/admin/subscription/payment-result" element={<AdminPaymentResultPage />} />
            <Route path="/admin/user" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/billing" element={<Navigate to="/admin/subscription" replace />} />
            <Route path="/admin/knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="/knowledge-graph" element={<Navigate to="/admin/knowledge-graph" replace />} />
            <Route path="/admin/design-system" element={<DesignSystemShowcasePage />} />
            <Route path="/design-system" element={<Navigate to="/admin/design-system" replace />} />
            <Route path="/admin/users" element={<UserManagementPage />} />

            {/* 5. Platform Administrator routes (Multi-Tenant Organizations, Subscriptions, Platform Telemetry) */}
            <Route path="/platform-admin" element={<Navigate to="/platform-admin/organizations" replace />} />
            <Route path="/platform-admin/organizations" element={<PlatformWorkspacePage />} />
            <Route path="/platform-admin/subscriptions" element={<PlatformSubscriptionsConfigPage />} />
            <Route path="/platform-admin/learning-upload-settings" element={<LearningUploadSettingsPage />} />
            <Route path="/platform-admin/activity" element={<PlatformActivityMonitoringPage />} />
            <Route path="/platform-admin/graph-benchmark" element={<PlatformGraphBenchmarkPage />} />

            {/* System Status route */}
            <Route path="/system-status" element={<SystemStatusPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/employee/overview" replace />} />
          </Routes></Suspense></WorkspaceBoundary>
          </WorkspaceSlugContext.Provider>
          <Toaster />
        </BrowserRouter>
        </LanguageProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
