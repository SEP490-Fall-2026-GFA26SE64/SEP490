import * as React from 'react'
import {
  Bell,
  Building,
  Globe,
  HardDrive,
  Lock,
  Network,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  getActiveCompany,
  updateActiveCompany,
  type CompanyRecord,
} from '../../../shared/stores/companyStore'

const SETTINGS_STORAGE_KEY = 'adaptlearn_org_workspace_settings_v1'

export interface OrgWorkspaceSettings {
  allowedDomains: string
  defaultNewUserRole: 'Employee' | 'Expert' | 'L&D Manager'
  sessionTimeoutMinutes: number
  enforce2FA: boolean
  baselinePassingScore: number
  autoRecalculatePathway: boolean
  notifyOnAssessmentSubmit: boolean
  notifyOnPathwayReview: boolean
  notifyOnSeatLimitWarning: boolean
}

const DEFAULT_SETTINGS: OrgWorkspaceSettings = {
  allowedDomains: '@technova.internal, @adaptlearn.internal',
  defaultNewUserRole: 'Employee',
  sessionTimeoutMinutes: 60,
  enforce2FA: false,
  baselinePassingScore: 70,
  autoRecalculatePathway: true,
  notifyOnAssessmentSubmit: true,
  notifyOnPathwayReview: true,
  notifyOnSeatLimitWarning: true,
}

export function OrganizationSettingsPage() {
  const { toast } = useToast()
  const [activeCompany, setActiveCompany] = React.useState<CompanyRecord>(getActiveCompany)
  const [activeTab, setActiveTab] = React.useState('profile')

  // Profile fields
  const [companyName, setCompanyName] = React.useState(activeCompany.name)
  const [ownerEmail, setOwnerEmail] = React.useState(activeCompany.ownerEmail)
  const [subdomain, setSubdomain] = React.useState(activeCompany.id.replace('comp-', ''))
  const [industryDomain, setIndustryDomain] = React.useState('Software Engineering & AI Architecture')
  const [headquarters, setHeadquarters] = React.useState('District 9 High-Tech Park, Ho Chi Minh City, VN')

  // Settings
  const [settings, setSettings] = React.useState<OrgWorkspaceSettings>(() => {
    try {
      const raw = localStorage.getItem(`${SETTINGS_STORAGE_KEY}_${activeCompany.id}`)
      if (raw) return JSON.parse(raw)
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS
  })

  React.useEffect(() => {
    const handleSync = () => {
      const comp = getActiveCompany()
      setActiveCompany(comp)
      setCompanyName(comp.name)
      setOwnerEmail(comp.ownerEmail)
    }
    window.addEventListener('active_company_changed', handleSync)
    window.addEventListener('companies_updated', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
      window.removeEventListener('companies_updated', handleSync)
    }
  }, [])

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Update company record
    updateActiveCompany((c) => ({
      ...c,
      name: companyName.trim(),
      ownerEmail: ownerEmail.trim(),
    }))

    // 2. Update workspace settings
    localStorage.setItem(`${SETTINGS_STORAGE_KEY}_${activeCompany.id}`, JSON.stringify(settings))

    toast({
      title: 'Workspace Settings Saved',
      description: 'Organization profile and security policies updated successfully.',
      variant: 'success',
    })
  }

  return (
    <WorkspaceLayout>
      <form onSubmit={handleSaveAll} className="space-y-6 pb-16">
        {/* Actions Bar */}
        <PageHeader
          actions={
            <Button type="submit" variant="primary" size="sm" className="flex items-center gap-1.5 shadow-xs">
              <Save size={14} />
              <span>Save Configuration</span>
            </Button>
          }
        />

        {/* Global Overview KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Tenant Workspace"
            value={activeCompany.name}
            icon={<Building size={18} className="text-primary" />}
            description={`ID: ${activeCompany.id} • ${activeCompany.packageTier} Tier`}
          />
          <StatCard
            title="MinIO Private Storage"
            value="1.8 GB / 50 GB"
            icon={<HardDrive size={18} className="text-success" />}
            description="Private course video & PDF artifacts"
          />
          <StatCard
            title="Workspace Boundary Protection"
            value="Active Isolation"
            icon={<ShieldCheck size={18} className="text-primary" />}
            description="Isolated enterprise workspace repository"
          />
        </div>

        {/* Tabbed Configuration Sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/60 p-1 w-full sm:w-auto">
            <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs font-semibold data-[state=active]:bg-card">
              <Building size={14} />
              <span>Organization Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs font-semibold data-[state=active]:bg-card">
              <Lock size={14} />
              <span>Access & Security</span>
            </TabsTrigger>
            <TabsTrigger value="adaptive" className="flex items-center gap-1.5 text-xs font-semibold data-[state=active]:bg-card">
              <Network size={14} />
              <span>Knowledge Tracing Rules</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs font-semibold data-[state=active]:bg-card">
              <Bell size={14} />
              <span>Email & Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Organization Profile */}
          <TabsContent value="profile" className="mt-4 space-y-4">
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/70">
                <CardTitle className="text-base font-bold">Corporate Identity & Subdomain</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Official registered entity details and public workspace routing slug.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Organization Legal Name</label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Tenant Subdomain</label>
                    <div className="flex items-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                      <Globe size={14} className="text-muted-foreground mr-1.5" />
                      <input
                        type="text"
                        className="bg-transparent text-foreground font-mono focus:outline-none flex-1"
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value)}
                      />
                      <span className="text-muted-foreground font-mono">.adaptlearn.io</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Designated Administrator Email</label>
                    <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Industry / Engineering Focus</label>
                    <Input value={industryDomain} onChange={(e) => setIndustryDomain(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Corporate Headquarters / Office Location</label>
                  <Input value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Storage Quota Card */}
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/70">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <HardDrive size={16} className="text-primary" />
                  Private MinIO Storage Allocation
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Workspace quota for module PDFs, interactive coding blueprints, and video media.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span>1.8 GB used of 50.0 GB quota</span>
                  <span className="text-primary font-mono font-bold">3.6%</span>
                </div>
                <Progress value={3.6} className="h-2" />
                <p className="text-muted-foreground text-[11px]">
                  Storage encryption is enabled via AES-256 with tenant-scoped presigned download URLs.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Access & Security */}
          <TabsContent value="security" className="mt-4 space-y-4">
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/70">
                <CardTitle className="text-base font-bold">Workspace Access Controls</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Authenticate employees and manage organizational domain allowances.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Allowed Corporate Email Domains</label>
                  <Input
                    value={settings.allowedDomains}
                    onChange={(e) => setSettings({ ...settings, allowedDomains: e.target.value })}
                    placeholder="@company.com, @subsidiary.com"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Users registering with these email domains can automatically join this workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Default Role for New Users</label>
                    <select
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={settings.defaultNewUserRole}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          defaultNewUserRole: e.target.value as 'Employee' | 'Expert' | 'L&D Manager',
                        })
                      }
                    >
                      <option value="Employee">Employee (Learner & Assessment Taker)</option>
                      <option value="Expert">Expert (Ontology & Content Author)</option>
                      <option value="L&D Manager">L&D Manager (Department Oversight)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Session Inactivity Timeout</label>
                    <select
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={settings.sessionTimeoutMinutes}
                      onChange={(e) =>
                        setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })
                      }
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour (Standard)</option>
                      <option value={480}>8 hours (Full shift)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground">Enforce Two-Factor Authentication (2FA)</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Require all L&D Managers and System Administrators to enter a TOTP code on login.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    checked={settings.enforce2FA}
                    onChange={(e) => setSettings({ ...settings, enforce2FA: e.target.checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Knowledge Tracing & Adaptive Rules */}
          <TabsContent value="adaptive" className="mt-4 space-y-4">
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/70">
                <CardTitle className="text-base font-bold">Adaptive Learning & Tracing Engine</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Graph traversal and knowledge tracing parameters for automated pathway recommendations.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Baseline Diagnostic Exemption Threshold (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      className="w-32"
                      value={settings.baselinePassingScore}
                      onChange={(e) =>
                        setSettings({ ...settings, baselinePassingScore: Number(e.target.value) })
                      }
                    />
                    <span className="text-muted-foreground">
                      Employees scoring ≥ {settings.baselinePassingScore}% on a micro-skill skip its introductory module.
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground">Automated Pathway Recalculation</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically update learning pathways when learners pass module assessments.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    checked={settings.autoRecalculatePathway}
                    onChange={(e) =>
                      setSettings({ ...settings, autoRecalculatePathway: e.target.checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Notifications */}
          <TabsContent value="notifications" className="mt-4 space-y-4">
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/70">
                <CardTitle className="text-base font-bold">Email & System Event Notifications</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Configure real-time email dispatch triggers via SMTP.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                  <div>
                    <h4 className="font-bold text-foreground">Assessment Submission Alerts</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Notify L&D Managers when employees finish a baseline or module quiz.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary"
                    checked={settings.notifyOnAssessmentSubmit}
                    onChange={(e) =>
                      setSettings({ ...settings, notifyOnAssessmentSubmit: e.target.checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                  <div>
                    <h4 className="font-bold text-foreground">Pathway Confirmation Dispatch</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Email Experts when an employee creates an initial pathway requiring review.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary"
                    checked={settings.notifyOnPathwayReview}
                    onChange={(e) =>
                      setSettings({ ...settings, notifyOnPathwayReview: e.target.checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                  <div>
                    <h4 className="font-bold text-foreground">Seat Capacity Threshold Alerts</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Alert System Administrators when 90% of allocated employee seats are occupied.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary"
                    checked={settings.notifyOnSeatLimitWarning}
                    onChange={(e) =>
                      setSettings({ ...settings, notifyOnSeatLimitWarning: e.target.checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </WorkspaceLayout>
  )
}
