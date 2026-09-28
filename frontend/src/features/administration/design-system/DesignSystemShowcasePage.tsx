import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  Copy,
  Info,
  Layers,
  Palette,
  Search,
  Settings,
  Sliders,
  Sparkles,
} from 'lucide-react'
import * as React from 'react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../shared/components/ui/Accordion'
import { Badge } from '../../../shared/components/ui/Badge'
import { Breadcrumb } from '../../../shared/components/ui/Breadcrumb'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import { RadioGroup, RadioGroupItem } from '../../../shared/components/ui/RadioGroup'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import './DesignSystemShowcasePage.css'

export interface PaletteSwatch {
  name: string
  hex: string
  class: string
  role: string
}

export interface PaletteTheme {
  id: string
  name: string
  badgeLabel: string
  subtitle: string
  primaryHex: string
  accentDot: string
  swatches: PaletteSwatch[]
}

const OFFICIAL_PALETTE: PaletteTheme = {
  id: 'orange',
  name: 'Refined Orange with Cool Slate Neutrals',
  badgeLabel: 'Official Team Palette',
  subtitle: 'Crisp cool slate canvas (easy on eyes), refined brand orange CTAs, and vivid yellow for In Progress states.',
  primaryHex: '#EA580C',
  accentDot: '#EA580C',
  swatches: [
    { name: 'Brand Orange', hex: '#EA580C', class: 'bg-primary text-primary-foreground', role: 'Main Brand / Primary CTAs' },
    { name: 'Amber Hover', hex: '#C2410C', class: 'bg-[hsl(21_90%_40%)] text-white', role: 'CTA Hover State' },
    { name: 'Soft Peach Tint', hex: '#FFF5EB', class: 'bg-secondary text-secondary-foreground border border-orange-200', role: 'Secondary Action / Badges' },
    { name: 'Cool Slate Canvas', hex: '#F8FAFC', class: 'bg-background border border-border text-foreground', role: 'Page Canvas (Eye-Friendly)' },
    { name: 'Card Surface', hex: '#FFFFFF', class: 'bg-card border border-border text-foreground', role: 'Containers & Cards' },
    { name: 'Deep Slate Text', hex: '#0F172A', class: 'bg-[hsl(222_47%_11%)] text-white', role: 'Headings & Body Text' },
    { name: 'Slate Muted', hex: '#64748B', class: 'bg-[hsl(215_16%_47%)] text-white', role: 'Subtitles & Captions' },
    { name: 'Crisp Green Success', hex: '#16A34A', class: 'bg-success text-success-foreground', role: 'Completed & Active' },
    { name: 'Vivid Yellow', hex: '#EAB308', class: 'bg-warning text-warning-foreground', role: 'In Progress / Pending (Distinct Yellow)' },
    { name: 'Destructive Red', hex: '#DC2626', class: 'bg-destructive text-destructive-foreground', role: 'Errors & Deletions' },
  ],
}

const SAMPLE_COURSES = [
  { value: 'ai-python', label: 'AI for Everyone (Andrew Ng)', description: 'Beginner • 4 weeks' },
  { value: 'web-dev', label: 'Full-Stack Web Development', description: 'Intermediate • 6 months' },
  { value: 'data-science', label: 'Data Science Specialization', description: 'Advanced • 8 months' },
  { value: 'ux-design', label: 'Google UX Design Certificate', description: 'Beginner • 3 months' },
  { value: 'machine-learning', label: 'Machine Learning Specialization', description: 'Intermediate • 5 months' },
]

export function DesignSystemShowcasePage() {
  // Button playground state
  const [btnVariant, setBtnVariant] = React.useState<'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'>('primary')
  const [btnSize, setBtnSize] = React.useState<'sm' | 'default' | 'lg'>('default')
  const [btnIsLoading, setBtnIsLoading] = React.useState(false)
  const [btnIsDisabled, setBtnIsDisabled] = React.useState(false)

  // Combobox demo state
  const [selectedCourse, setSelectedCourse] = React.useState('ai-python')

  // Search input state
  const [searchQuery, setSearchQuery] = React.useState('')

  // Dialog state
  const [isDemoDialogOpen, setIsDemoDialogOpen] = React.useState(false)

  // Radio selection state
  const [radioValue, setRadioValue] = React.useState('level-3')

  // Tabs demo state
  const [showcaseTab, setShowcaseTab] = React.useState('overview')

  // Toast & copy states
  const { toast } = useToast()
  const [copiedColor, setCopiedColor] = React.useState<string | null>(null)

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex)
    setCopiedColor(hex)
    toast({
      title: `Copied ${hex}`,
      description: 'Color code copied to clipboard.',
      variant: 'info',
    })
    setTimeout(() => setCopiedColor(null), 2000)
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-8 pb-16">
        {/* Top Header & Breadcrumb */}
        <div className="space-y-3">
          <Breadcrumb
            items={[
              { label: 'Platform Home', href: '/' },
              { label: 'Administrator', href: '/admin/dashboard' },
              { label: 'Design System Showcase' },
            ]}
          />

          <div className="flex items-center justify-end gap-3 flex-wrap pb-2">
            <Badge variant="secondary" className="px-3 py-1 text-xs self-start md:self-center font-semibold">
              Official Orange Palette
            </Badge>
          </div>
        </div>

        {/* SECTION 1: Color Palette */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Heading level={2} size="section" className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Official Color Palette: Solar Amber & Terracotta
              </Heading>
              <Text variant="caption" className="mt-0.5">
                Team-approved color palette active system-wide across all pages and interactive controls.
              </Text>
            </div>
            {copiedColor && (
              <span className="text-xs text-success font-medium animate-in fade-in">
                Copied {copiedColor} to clipboard!
              </span>
            )}
          </div>

          {/* Official Palette Banner */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span
                className="w-5 h-5 rounded-full shrink-0 border border-black/10 shadow-xs"
                style={{ backgroundColor: OFFICIAL_PALETTE.primaryHex }}
              />
              <div>
                <strong className="text-sm text-foreground">{OFFICIAL_PALETTE.name}</strong>
                <p className="text-xs text-muted-foreground">{OFFICIAL_PALETTE.subtitle}</p>
              </div>
            </div>
            <Badge variant="primary" className="text-xs px-2.5 py-1">
              Active Design System
            </Badge>
          </div>

          {/* Swatches Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {OFFICIAL_PALETTE.swatches.map((color) => (
              <Card
                key={color.name + color.hex}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => copyHex(color.hex)}
              >
                <div
                  className="h-24 p-3 flex flex-col justify-between"
                  style={{
                    backgroundColor: color.hex,
                    color: ['#FFFFFF', '#FAF9F7', '#FFF7ED', '#F0EDE8', '#DDD8D3'].includes(color.hex)
                      ? '#231C18'
                      : '#FFFFFF',
                  }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold uppercase opacity-90">{color.name}</span>
                    <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="font-mono text-sm font-bold">{color.hex}</span>
                </div>
                <CardContent className="p-3 bg-card">
                  <p className="text-xs text-muted-foreground">{color.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* SECTION 1.5: Standardized Typography Scale */}
        <section className="space-y-4">
          <div>
            <Heading level={2} size="section" className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Standardized Typography Scale
            </Heading>
            <Text variant="caption" className="mt-0.5">
              Locked type tokens and components preventing mismatch across pages. Base font: IBM Plex Sans.
            </Text>
          </div>

          <Card className="border-border overflow-hidden">
            <div className="divide-y divide-border">
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-muted/20">
                <div className="space-y-1">
                  <Text variant="eyebrow">Display / Hero Title (32px / 700)</Text>
                  <Heading level={1} size="display">Knowledge Graph Architecture</Heading>
                </div>
                <code className="text-xs font-mono text-muted-foreground">&lt;Heading level=&#123;1&#125; size="display" /&gt;</code>
              </div>

              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="space-y-1">
                  <Text variant="eyebrow">Page Title / H1 (26px / 700)</Text>
                  <Heading level={1} size="page">Adaptive Pathway & Competency Matrix</Heading>
                </div>
                <code className="text-xs font-mono text-muted-foreground">&lt;Heading level=&#123;1&#125; size="page" /&gt;</code>
              </div>

              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-muted/20">
                <div className="space-y-1">
                  <Text variant="eyebrow">Section Heading / H2 (20px / 600)</Text>
                  <Heading level={2} size="section">Role-Skill Taxonomy & Validation</Heading>
                </div>
                <code className="text-xs font-mono text-muted-foreground">&lt;Heading level=&#123;2&#125; size="section" /&gt;</code>
              </div>

              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="space-y-1">
                  <Text variant="eyebrow">Subsection Heading / H3 (16px / 600)</Text>
                  <Heading level={3} size="subsection">Dynamic Knowledge Tracing Parameters</Heading>
                </div>
                <code className="text-xs font-mono text-muted-foreground">&lt;Heading level=&#123;3&#125; size="subsection" /&gt;</code>
              </div>

              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-muted/20">
                <div className="space-y-1">
                  <Text variant="eyebrow">Card Header / H4 (15px / 600)</Text>
                  <Heading level={4} size="card">Machine Learning Specialization Card</Heading>
                </div>
                <code className="text-xs font-mono text-muted-foreground">&lt;Heading level=&#123;4&#125; size="card" /&gt;</code>
              </div>

              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="space-y-1">
                  <Text variant="eyebrow">Subtitle / Lead Text (15px / 400)</Text>
                  <Text variant="lead">
                    Real-time adaptive learning recommendations driven by ontology graphs and continuous competency tracking.
                  </Text>
                </div>
                <code className="text-xs font-mono text-muted-foreground">&lt;Text variant="lead" /&gt;</code>
              </div>

              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-muted/20">
                <div className="space-y-1">
                  <Text variant="eyebrow">Body Text Default (14px / 400)</Text>
                  <Text variant="body">
                    Standard body copy used across dashboards, tables, modal descriptions, and instructional modules.
                  </Text>
                </div>
                <code className="text-xs font-mono text-muted-foreground">&lt;Text variant="body" /&gt;</code>
              </div>

              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="space-y-1">
                  <Text variant="eyebrow">Caption & Metadata (12px / 500)</Text>
                  <Text variant="caption">Last updated: 5 minutes ago &bull; Verified by Ontologist Engine</Text>
                </div>
                <code className="text-xs font-mono text-muted-foreground">&lt;Text variant="caption" /&gt;</code>
              </div>
            </div>
          </Card>
        </section>

        {/* SECTION 2: Toast Notification System Playground */}
        <Card className="border-primary/20 bg-gradient-to-r from-card to-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <span>Real-Time Feedback: Toast Notification System</span>
            </CardTitle>
            <CardDescription>
              Accessible, auto-dismissing toasts informing users when backend processes, pathway adjustments, and knowledge graph events occur.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => {
                  toast({
                    title: 'Module Mastered!',
                    description: 'Your diagnostic quiz was graded successfully (Score: 94%).',
                    variant: 'success',
                  })
                }}
              >
                Trigger Success Toast
              </Button>

              <Button
                variant="secondary"
                leftIcon={<Info className="h-4 w-4 text-primary" />}
                onClick={() => {
                  toast({
                    title: 'Knowledge Graph Synced',
                    description: 'Fetched latest Neo4j schema migrations and ontology nodes.',
                    variant: 'info',
                  })
                }}
              >
                Trigger Info Toast
              </Button>

              <Button
                variant="outline"
                leftIcon={<AlertTriangle className="h-4 w-4 text-warning" />}
                onClick={() => {
                  toast({
                    title: 'Prerequisite Gap Detected',
                    description: 'Knowledge Tracing inserted remedy module REM-102 into your pathway.',
                    variant: 'warning',
                  })
                }}
              >
                Trigger Warning Toast
              </Button>

              <Button
                variant="destructive"
                leftIcon={<AlertCircle className="h-4 w-4" />}
                onClick={() => {
                  toast({
                    title: 'Connection Offline',
                    description: 'Failed to reach API server at http://127.0.0.1:8080.',
                    variant: 'destructive',
                  })
                }}
              >
                Trigger Destructive Toast
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: Interactive Controls & Small UI Components */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Button Playground */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Button Component Playground
              </CardTitle>
              <CardDescription>
                Test primary, secondary, outline, ghost, and loading states live.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 flex-1">
              <div className="bg-muted/40 p-4 rounded-md space-y-4 border border-border">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Select Variant</label>
                  <div className="flex flex-wrap gap-2">
                    {(['primary', 'secondary', 'outline', 'ghost', 'destructive'] as const).map((variant) => (
                      <Button
                        key={variant}
                        size="sm"
                        variant={btnVariant === variant ? 'primary' : 'outline'}
                        onClick={() => setBtnVariant(variant)}
                      >
                        {variant}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Select Size</label>
                    <div className="flex gap-2">
                      {(['sm', 'default', 'lg'] as const).map((size) => (
                        <Button
                          key={size}
                          size="sm"
                          variant={btnSize === size ? 'primary' : 'outline'}
                          onClick={() => setBtnSize(size)}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Toggles</label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={btnIsLoading ? 'primary' : 'outline'}
                        onClick={() => setBtnIsLoading((prev) => !prev)}
                      >
                        Loading
                      </Button>
                      <Button
                        size="sm"
                        variant={btnIsDisabled ? 'primary' : 'outline'}
                        onClick={() => setBtnIsDisabled((prev) => !prev)}
                      >
                        Disabled
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-dashed border-border rounded-lg flex flex-col items-center justify-center min-h-32 bg-card space-y-3">
                <span className="text-xs text-muted-foreground font-mono">Live Output Preview</span>
                <Button
                  variant={btnVariant}
                  size={btnSize}
                  isLoading={btnIsLoading}
                  disabled={btnIsDisabled}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Primary Action
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Combobox & Input Playground */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Combobox & Input Select Controls
              </CardTitle>
              <CardDescription>
                Searchable combobox dropdown and prefix/suffix text inputs.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 flex-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Select Course (Combobox)</label>
                <Combobox
                  options={SAMPLE_COURSES}
                  value={selectedCourse}
                  onChange={(val) => setSelectedCourse(val)}
                  placeholder="Choose a specialization..."
                  searchPlaceholder="Filter courses..."
                />
                {selectedCourse && (
                  <p className="text-xs text-muted-foreground">
                    Selected ID: <code className="font-mono text-primary font-medium">{selectedCourse}</code>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Search Input with Prefix Icon</label>
                <Input
                  leftIcon={<Search className="h-4 w-4" />}
                  placeholder="Search catalog, skills, or certificates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status Badges</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="primary">Enrolled</Badge>
                  <Badge variant="secondary">All-Access Plan</Badge>
                  <Badge variant="success">Certificate Completed</Badge>
                  <Badge variant="warning" className="font-medium">Assignment Pending</Badge>
                  <Badge variant="destructive">Submission Overdue</Badge>
                  <Badge variant="outline">Guest Learner</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 4: Capstone UI Primitives (Progress, Tabs, Accordion, Dialog, RadioGroup) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Progress & RadioGroup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                <span>Progress Bars & Competency Rating RadioGroup</span>
              </CardTitle>
              <CardDescription>
                Animated progress indicators and Likert-scale self-assessment radio controls.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Progress value={82} label="Neo4j Cypher Query Mastery" showLabel variant="primary" />
                <Progress value={65} label="GNN Node Embeddings Progress" showLabel variant="warning" />
                <Progress value={100} label="RDF Triples Fundamentals" showLabel variant="success" />
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-sm font-medium text-foreground">Competency Self-Rating (RadioGroup)</label>
                <RadioGroup value={radioValue} onChange={setRadioValue} className="grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'level-1', label: '1 - Novice' },
                    { id: 'level-2', label: '2 - Advanced Beginner' },
                    { id: 'level-3', label: '3 - Competent' },
                    { id: 'level-4', label: '4 - Proficient' },
                    { id: 'level-5', label: '5 - Expert / Architect' },
                  ].map((lvl) => (
                    <label
                      key={lvl.id}
                      htmlFor={lvl.id}
                      className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        radioValue === lvl.id
                          ? 'border-primary bg-secondary/50 font-medium text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <RadioGroupItem id={lvl.id} value={lvl.id} />
                      <span>{lvl.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setIsDemoDialogOpen(true)}>
                  Open Dialog Modal Demo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs & Accordion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <span>Tabs & Collapsible Accordion</span>
              </CardTitle>
              <CardDescription>
                Structured navigation and expandable course syllabus gates.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <Tabs value={showcaseTab} onValueChange={setShowcaseTab}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                  <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="text-xs text-muted-foreground p-2 leading-relaxed">
                  Overview tab displaying course summary, prerequisite recommendations, and estimated time commitment.
                </TabsContent>
                <TabsContent value="curriculum" className="text-xs text-muted-foreground p-2 leading-relaxed">
                  Curriculum syllabus tab structured into sequential milestones with gate assessments.
                </TabsContent>
                <TabsContent value="outcomes" className="text-xs text-muted-foreground p-2 leading-relaxed">
                  Competency outcome verification tied directly to employee target role profiles.
                </TabsContent>
              </Tabs>

              <div className="pt-2 border-t border-border">
                <Accordion type="single" defaultValue={['acc-1']}>
                  <AccordionItem value="acc-1">
                    <AccordionTrigger>Module 1: Introduction to Semantic Graphs</AccordionTrigger>
                    <AccordionContent>
                      Covers triple stores, ontology modeling, and schema constraints with interactive quizzes.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="acc-2">
                    <AccordionTrigger>Module 2: Real-Time Subgraph Traversal</AccordionTrigger>
                    <AccordionContent>
                      Covers Breadth-First and Dijkstra graph path recalculation for adaptive personalized pathways.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
          </Card>

          {/* Unified PageHeader & StatCard Components */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>Shared Architecture Components: PageHeader & StatCard</span>
              </CardTitle>
              <CardDescription>
                Standardized layout primitives shared across all actor portals (Learner, Manager, Administrator).
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                <Text variant="eyebrow">Shared PageHeader Component Example</Text>
                <PageHeader
                  icon={<Palette className="h-7 w-7 text-primary" />}
                  title="Example Feature Console"
                  description="Standardized typography, action alignment, and sub-text flow across all actor views."
                  actions={
                    <Badge variant="secondary" className="font-semibold">
                      Enterprise Tier
                    </Badge>
                  }
                  className="pb-4 border-b-0"
                />
              </div>

              <div className="space-y-2">
                <Text variant="eyebrow">Shared StatCard Component Example</Text>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatCard
                    variant="gradient"
                    title="Active Learners"
                    value="1,420"
                    valueClassName="text-primary"
                    description="Continuous competency tracking"
                  />
                  <StatCard
                    variant="gradient"
                    title="Knowledge Mastery"
                    value="88.4%"
                    valueClassName="text-success"
                    description="Passing dynamic gate quizzes"
                  />
                  <StatCard
                    variant="gradient"
                    title="Cost Reduction"
                    value="$124.5K"
                    description="Eliminating redundant training"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <Text variant="eyebrow">Shared EmptyState Component Example</Text>
                <EmptyState
                  icon={<Sparkles className="h-6 w-6 text-primary" />}
                  title="No Dynamic Data Available"
                  description="Standardized fallback display with semantic icon, title, description, and primary CTA button."
                  action={
                    <Button variant="primary" size="sm" leftIcon={<Sparkles size={14} />}>
                      Create Sample Record
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal Dialog Demo */}
        <Dialog open={isDemoDialogOpen} onOpenChange={setIsDemoDialogOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Knowledge Graph Node Details</DialogTitle>
              <DialogDescription>
                Inspecting semantic properties of Node <code>#GNN-301</code> stored in Neo4j.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted/40 p-4 rounded-lg text-xs space-y-1">
              <p><strong>Ontology Type:</strong> Competency Cluster</p>
              <p><strong>Target Role:</strong> AI Knowledge Architect</p>
              <p><strong>Calculated Gap:</strong> 45% deficiency (Prerequisite: Linear Algebra)</p>
            </div>
            <DialogFooter>
              <Button
                variant="primary"
                onClick={() => {
                  setIsDemoDialogOpen(false)
                  toast({
                    title: 'Dialog Confirmed',
                    description: 'Node metadata confirmed and synchronized.',
                    variant: 'success',
                  })
                }}
              >
                Close & Confirm
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </WorkspaceLayout>
  )
}
