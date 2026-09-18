import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Info,
  Layers,
  Palette,
  RotateCcw,
  Search,
  Settings,
  Sliders,
  Sparkles,
} from 'lucide-react'
import * as React from 'react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../shared/components/ui/Accordion'
import { Badge } from '../../../shared/components/ui/Badge'
import { Breadcrumb } from '../../../shared/components/ui/Breadcrumb'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Progress } from '../../../shared/components/ui/Progress'
import { RadioGroup, RadioGroupItem } from '../../../shared/components/ui/RadioGroup'
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

const PALETTES: Record<string, PaletteTheme> = {
  original: {
    id: 'original',
    name: 'Classic Blue',
    badgeLabel: 'Original (Default)',
    subtitle: 'Existing design tokens (#0056D2) with cool neutral canvas.',
    primaryHex: '#0056D2',
    accentDot: '#0056D2',
    swatches: [
      { name: 'Primary Blue', hex: '#0056D2', class: 'bg-primary text-primary-foreground', role: 'Main Brand / Primary CTAs' },
      { name: 'Primary Hover', hex: '#00419E', class: 'bg-[hsl(215_100%_31%)] text-white', role: 'CTA Hover State' },
      { name: 'Secondary Tint', hex: '#E8F0FE', class: 'bg-secondary text-secondary-foreground border border-blue-200', role: 'Secondary Action / Badges' },
      { name: 'Canvas Background', hex: '#F5F7FA', class: 'bg-background border border-border text-foreground', role: 'Page Background' },
      { name: 'Card Surface', hex: '#FFFFFF', class: 'bg-card border border-border text-foreground', role: 'Containers & Cards' },
      { name: 'Navy Foreground', hex: '#1F2937', class: 'bg-[hsl(215_25%_17%)] text-white', role: 'Headings & Body Text' },
      { name: 'Muted Text', hex: '#5F6464', class: 'bg-[hsl(215_12%_42%)] text-white', role: 'Subtitles & Captions' },
      { name: 'Success Green', hex: '#16A34A', class: 'bg-success text-success-foreground', role: 'Completed & Active' },
      { name: 'Warning Amber', hex: '#D97706', class: 'bg-warning text-warning-foreground', role: 'In Progress / Pending' },
      { name: 'Destructive Red', hex: '#DC2626', class: 'bg-destructive text-destructive-foreground', role: 'Errors & Deletions' },
    ],
  },
  sapphire: {
    id: 'sapphire',
    name: 'Modern Sapphire',
    badgeLabel: 'Refined Blue',
    subtitle: 'Deeper tech sapphire (#2563EB) & slate neutrals — modern enterprise evolution.',
    primaryHex: '#2563EB',
    accentDot: '#2563EB',
    swatches: [
      { name: 'Sapphire Blue', hex: '#2563EB', class: 'bg-primary text-primary-foreground', role: 'Main Brand / Primary CTAs' },
      { name: 'Royal Hover', hex: '#1E40AF', class: 'bg-[hsl(224_76%_40%)] text-white', role: 'CTA Hover State' },
      { name: 'Ice Secondary', hex: '#EFF6FF', class: 'bg-secondary text-secondary-foreground border border-blue-200', role: 'Secondary Action / Badges' },
      { name: 'Slate Canvas', hex: '#F8FAFC', class: 'bg-background border border-border text-foreground', role: 'Page Background' },
      { name: 'Card Surface', hex: '#FFFFFF', class: 'bg-card border border-border text-foreground', role: 'Containers & Cards' },
      { name: 'Deep Navy', hex: '#0F172A', class: 'bg-[hsl(222_47%_11%)] text-white', role: 'Headings & Body Text' },
      { name: 'Slate Muted', hex: '#64748B', class: 'bg-[hsl(215_16%_47%)] text-white', role: 'Subtitles & Captions' },
      { name: 'Emerald Success', hex: '#10B981', class: 'bg-success text-success-foreground', role: 'Completed & Active' },
      { name: 'Warning Amber', hex: '#F59E0B', class: 'bg-warning text-warning-foreground', role: 'In Progress / Pending' },
      { name: 'Destructive Red', hex: '#EF4444', class: 'bg-destructive text-destructive-foreground', role: 'Errors & Deletions' },
    ],
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Intelligence',
    badgeLabel: 'Pine & Mint',
    subtitle: 'Deep forest pine (#0A635D) with mint ice and distinct vivid leaf success green.',
    primaryHex: '#0A635D',
    accentDot: '#0A635D',
    swatches: [
      { name: 'Deep Pine Teal', hex: '#0A635D', class: 'bg-primary text-primary-foreground', role: 'Main Brand / Primary CTAs' },
      { name: 'Rich Forest Hover', hex: '#064E49', class: 'bg-[hsl(176_88%_20%)] text-white', role: 'CTA Hover State' },
      { name: 'Mint Secondary', hex: '#CCFBF1', class: 'bg-secondary text-secondary-foreground border border-teal-200', role: 'Secondary Action / Badges' },
      { name: 'Fresh Canvas', hex: '#F8FAFA', class: 'bg-background border border-border text-foreground', role: 'Page Background' },
      { name: 'Card Surface', hex: '#FFFFFF', class: 'bg-card border border-border text-foreground', role: 'Containers & Cards' },
      { name: 'Graphite Text', hex: '#1B282C', class: 'bg-[hsl(200_24%_14%)] text-white', role: 'Headings & Body Text' },
      { name: 'Sage Muted', hex: '#5C6D70', class: 'bg-[hsl(180_10%_42%)] text-white', role: 'Subtitles & Captions' },
      { name: 'Vivid Leaf Success', hex: '#16A34A', class: 'bg-success text-success-foreground', role: 'Completed & Active' },
      { name: 'Warm Amber', hex: '#D97706', class: 'bg-warning text-warning-foreground', role: 'In Progress / Pending' },
      { name: 'Destructive Red', hex: '#DC2626', class: 'bg-destructive text-destructive-foreground', role: 'Errors & Deletions' },
    ],
  },
  orange: {
    id: 'orange',
    name: 'Solar Amber',
    badgeLabel: 'Warm Terracotta',
    subtitle: 'Warm executive terracotta (#E8590C) with stone canvas & high-contrast accents.',
    primaryHex: '#E8590C',
    accentDot: '#E8590C',
    swatches: [
      { name: 'Terracotta Orange', hex: '#E8590C', class: 'bg-primary text-primary-foreground', role: 'Main Brand / Primary CTAs' },
      { name: 'Burnt Amber Hover', hex: '#C2410C', class: 'bg-[hsl(21_90%_40%)] text-white', role: 'CTA Hover State' },
      { name: 'Cream Peach Tint', hex: '#FFF7ED', class: 'bg-secondary text-secondary-foreground border border-orange-200', role: 'Secondary Action / Badges' },
      { name: 'Stone Canvas', hex: '#FAF9F7', class: 'bg-background border border-border text-foreground', role: 'Page Background' },
      { name: 'Card Surface', hex: '#FFFFFF', class: 'bg-card border border-border text-foreground', role: 'Containers & Cards' },
      { name: 'Charcoal Text', hex: '#231C18', class: 'bg-[hsl(24_25%_12%)] text-white', role: 'Headings & Body Text' },
      { name: 'Warm Muted', hex: '#786D65', class: 'bg-[hsl(25_10%_44%)] text-white', role: 'Subtitles & Captions' },
      { name: 'Crisp Green Success', hex: '#16A34A', class: 'bg-success text-success-foreground', role: 'Completed & Active' },
      { name: 'Deep Amber', hex: '#D97706', class: 'bg-warning text-warning-foreground', role: 'In Progress / Pending' },
      { name: 'Destructive Red', hex: '#DC2626', class: 'bg-destructive text-destructive-foreground', role: 'Errors & Deletions' },
    ],
  },
  indigo: {
    id: 'indigo',
    name: 'Linear Indigo',
    badgeLabel: 'Modern Violet',
    subtitle: 'High-tech developer tool aesthetic (#6366F1) with midnight slate.',
    primaryHex: '#6366F1',
    accentDot: '#6366F1',
    swatches: [
      { name: 'Electric Indigo', hex: '#6366F1', class: 'bg-primary text-primary-foreground', role: 'Main Brand / Primary CTAs' },
      { name: 'Royal Violet Hover', hex: '#4338CA', class: 'bg-[hsl(243_75%_52%)] text-white', role: 'CTA Hover State' },
      { name: 'Lavender Mist', hex: '#EEF2FF', class: 'bg-secondary text-secondary-foreground border border-indigo-200', role: 'Secondary Action / Badges' },
      { name: 'Modern Canvas', hex: '#F8F9FC', class: 'bg-background border border-border text-foreground', role: 'Page Background' },
      { name: 'Card Surface', hex: '#FFFFFF', class: 'bg-card border border-border text-foreground', role: 'Containers & Cards' },
      { name: 'Midnight Slate', hex: '#0B0F19', class: 'bg-[hsl(224_71%_10%)] text-white', role: 'Headings & Body Text' },
      { name: 'Indigo Gray', hex: '#646A7E', class: 'bg-[hsl(220_14%_46%)] text-white', role: 'Subtitles & Captions' },
      { name: 'Success Emerald', hex: '#10B981', class: 'bg-success text-success-foreground', role: 'Completed & Active' },
      { name: 'Warning Amber', hex: '#F59E0B', class: 'bg-warning text-warning-foreground', role: 'In Progress / Pending' },
      { name: 'Destructive Rose', hex: '#F43F5E', class: 'bg-destructive text-destructive-foreground', role: 'Errors & Deletions' },
    ],
  },
  slate: {
    id: 'slate',
    name: 'Minimalist Slate',
    badgeLabel: 'Monochrome Tech',
    subtitle: 'Content-first monochrome tech (#1A273C) with crisp clean contrast.',
    primaryHex: '#1A273C',
    accentDot: '#1A273C',
    swatches: [
      { name: 'Obsidian Navy', hex: '#1A273C', class: 'bg-primary text-primary-foreground', role: 'Main Brand / Primary CTAs' },
      { name: 'Black Obsidian', hex: '#0D1420', class: 'bg-[hsl(222_47%_10%)] text-white', role: 'CTA Hover State' },
      { name: 'Slate Tint', hex: '#EAEFF4', class: 'bg-secondary text-secondary-foreground border border-slate-200', role: 'Secondary Action / Badges' },
      { name: 'Pure Canvas', hex: '#FCFCFC', class: 'bg-background border border-border text-foreground', role: 'Page Background' },
      { name: 'Card Surface', hex: '#FFFFFF', class: 'bg-card border border-border text-foreground', role: 'Containers & Cards' },
      { name: 'Charcoal Text', hex: '#141920', class: 'bg-[hsl(220_30%_12%)] text-white', role: 'Headings & Body Text' },
      { name: 'Neutral Slate', hex: '#626D7A', class: 'bg-[hsl(215_14%_46%)] text-white', role: 'Subtitles & Captions' },
      { name: 'Success Green', hex: '#16A34A', class: 'bg-success text-success-foreground', role: 'Completed & Active' },
      { name: 'Warning Amber', hex: '#D97706', class: 'bg-warning text-warning-foreground', role: 'In Progress / Pending' },
      { name: 'Destructive Red', hex: '#DC2626', class: 'bg-destructive text-destructive-foreground', role: 'Errors & Deletions' },
    ],
  },
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

  // Active palette theme state
  const [activeThemeId, setActiveThemeId] = React.useState<string>(() => {
    return document.documentElement.getAttribute('data-theme') || 'original'
  })

  const currentTheme = PALETTES[activeThemeId] || PALETTES.original

  const handleSelectTheme = (themeId: string) => {
    setActiveThemeId(themeId)
    if (themeId === 'original') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', themeId)
    }
    toast({
      title: `Applied "${PALETTES[themeId]?.name || themeId}" Palette`,
      description: 'Live CSS variables updated across all components on this page.',
      variant: 'info',
    })
  }

  const handleResetToDefault = () => {
    setActiveThemeId('original')
    document.documentElement.removeAttribute('data-theme')
    toast({
      title: 'Reset to Original Palette',
      description: 'Restored classic design tokens.',
      variant: 'info',
    })
  }

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex)
    setCopiedColor(hex)
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

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <Heading level={1} size="page" className="text-foreground flex items-center gap-3">
                <Palette className="h-7 w-7 text-primary" />
                Design System Showcase
              </Heading>
              <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
                System design tokens, primary blue palette (`#0056D2`), reusable shared components (`src/shared/components/ui/`), and interactive state controls.
              </p>
            </div>
            <Badge variant="secondary" className="px-3 py-1 text-xs self-start md:self-center font-medium">
              Theme Connected
            </Badge>
          </div>
        </div>

        {/* SECTION 1: Color Palette */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Heading level={2} size="section" className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Color Palette & Live Theme Switcher
              </Heading>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle between curated palettes to test contrast, buttons, badges, and cards live across the workspace.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeThemeId !== 'original' && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={handleResetToDefault}
                >
                  Reset Default
                </Button>
              )}
              {copiedColor && (
                <span className="text-xs text-success font-medium animate-in fade-in">
                  Copied {copiedColor} to clipboard!
                </span>
              )}
            </div>
          </div>

          {/* PALETTE TOGGLE BAR */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Palette:
              </span>
              <span className="text-xs text-muted-foreground">
                Active Theme: <strong className="text-foreground">{currentTheme.name}</strong> &bull; {currentTheme.subtitle}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {Object.values(PALETTES).map((p) => {
                const isSelected = activeThemeId === p.id

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectTheme(p.id)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-secondary text-foreground ring-2 ring-primary/20 font-semibold shadow-xs'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                      style={{ backgroundColor: p.accentDot }}
                    />
                    <span>{p.name}</span>
                    <Badge variant={isSelected ? 'primary' : 'outline'} className="text-[10px] px-1.5 py-0">
                      {p.badgeLabel}
                    </Badge>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary ml-0.5" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Swatches Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {currentTheme.swatches.map((color) => (
              <Card
                key={color.name + color.hex}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => copyHex(color.hex)}
              >
                <div
                  className="h-24 p-3 flex flex-col justify-between"
                  style={{
                    backgroundColor: color.hex,
                    color: ['#FFFFFF', '#F5F7FA', '#F8FAFC', '#F8FAFA', '#F8F9FC', '#FCFCFC', '#E8F0FE', '#EFF6FF', '#CCFBF1', '#EEF2FF', '#EAEFF4'].includes(color.hex)
                      ? '#1F2937'
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
