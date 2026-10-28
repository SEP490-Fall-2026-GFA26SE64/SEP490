import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, BookOpen, Check, ChevronRight, Compass, GitBranch, Layers3, Mail, Menu, Network, ShieldCheck, Users, X } from 'lucide-react'
import { domAnimation, LazyMotion, MotionConfig, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../shared/components/ui/Accordion'
import { Button, buttonVariants } from '../../shared/components/ui/Button'
import { Card } from '../../shared/components/ui/Card'
import { LanguageSwitcher } from '../../shared/components/ui/LanguageSwitcher'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { useTranslation } from '../../shared/i18n/LanguageContext'

const sectionClass = 'mx-auto w-full max-w-7xl px-4 sm:px-6'
const navClass = 'inline-flex min-h-11 items-center rounded-md px-3 text-body-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export function GuestLandingPage() {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLButtonElement>(null)
  const faqId = React.useId()
  const navigation = [
    { href: '#platform', label: t('landing.platform') },
    { href: '#getting-started', label: t('landing.steps') },
    { href: '#questions', label: t('landing.questions') },
  ]
  const benefits = [
    { icon: Network, title: 'benefitSkillsTitle', body: 'benefitSkillsBody' },
    { icon: Compass, title: 'benefitPathTitle', body: 'benefitPathBody' },
    { icon: Users, title: 'benefitTeamTitle', body: 'benefitTeamBody' },
  ] as const
  const steps = [
    { icon: Users, title: 'stepDetailsTitle', body: 'stepDetailsBody' },
    { icon: Mail, title: 'stepEmailTitle', body: 'stepEmailBody' },
    { icon: ShieldCheck, title: 'stepSecureTitle', body: 'stepSecureBody' },
  ] as const
  const questions = [
    { id: 'need', question: 'faqNeedQuestion', answer: 'faqNeedAnswer' },
    { id: 'resume', question: 'faqResumeQuestion', answer: 'faqResumeAnswer' },
    { id: 'workspace', question: 'faqWorkspaceQuestion', answer: 'faqWorkspaceAnswer' },
  ] as const

  function closeMenu(event: React.KeyboardEvent) {
    if (event.key === 'Escape' && menuOpen) {
      setMenuOpen(false)
      menuRef.current?.focus()
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <div className="min-h-screen bg-background text-foreground" data-motion={reducedMotion ? 'reduced' : 'standard'}>
          <a href="#landing-content" className="sr-only z-50 rounded-md bg-card p-3 font-semibold shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-ring">
            {t('landing.skip')}
          </a>
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md" onKeyDown={closeMenu}>
            <div className={`${sectionClass} flex min-h-20 items-center justify-between gap-3 py-3`}>
              <Link to="/" className="flex min-h-11 items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Adapt-Learn-Graph">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-secondary text-primary">
                  <Network size={21} aria-hidden="true" />
                </span>
                <span className="text-[length:var(--text-card)]">Adapt-Learn-Graph</span>
              </Link>
              <nav aria-label={t('landing.navigation')} className="hidden items-center xl:flex">
                {navigation.map(item => <a key={item.href} href={item.href} className={navClass}>{item.label}</a>)}
              </nav>
              <div className="hidden items-center gap-2 xl:flex">
                <LanguageSwitcher />
                <Link to="/login" className={navClass}>{t('landing.signIn')}</Link>
                <Link to="/guest/register" className={buttonVariants({ size: 'lg', className: 'px-5' })}>
                  {t('landing.start')}<ArrowRight size={16} className="ml-2" aria-hidden="true" />
                </Link>
              </div>
              <Button ref={menuRef} variant="ghost" size="icon" className="size-11 xl:hidden"
                aria-label={t('landing.menu')} aria-expanded={menuOpen} aria-controls="landing-mobile-navigation"
                onClick={() => setMenuOpen(open => !open)}>
                {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
              </Button>
            </div>
            <nav id="landing-mobile-navigation" aria-label={t('landing.navigation')} hidden={!menuOpen}
              className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-border bg-card px-4 pb-4 xl:hidden">
              <div className="flex flex-col py-2">
                {navigation.map(item => <a key={item.href} href={item.href} className={navClass} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
                <Link to="/login" className={navClass}>{t('landing.signIn')}</Link>
                <Link to="/guest/resume" className={navClass}>{t('landing.resume')}</Link>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <LanguageSwitcher />
                <Link to="/guest/register" className={buttonVariants({ size: 'lg', className: 'px-5' })}>{t('landing.start')}</Link>
              </div>
            </nav>
          </header>

          <main id="landing-content" tabIndex={-1} className="scroll-mt-24 outline-none">
            <section className={`${sectionClass} grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-14 lg:py-16`}>
              <m.div data-landing-reveal variants={reveal} initial={reducedMotion ? false : 'hidden'} animate="visible" transition={{ duration: reducedMotion ? 0 : 0.45 }}>
                <Text className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary px-3 py-2 text-caption font-medium text-secondary-foreground">
                  <GitBranch size={15} aria-hidden="true" />{t('landing.eyebrow')}
                </Text>
                <PageHeader className="border-0 pb-0"
                  title={<span className="block text-display leading-tight tracking-tight">
                    <span className="block">{t('landing.heroLine1')}</span>
                    <span className="block text-primary">{t('landing.heroLine2')}</span>
                  </span>}
                  description={<span className="mt-4 block max-w-xl text-lead leading-relaxed">{t('landing.heroDescription')}</span>} />
                <div className="mt-7 flex flex-wrap gap-3">
                  <m.div whileHover={reducedMotion ? undefined : { y: -2 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }}>
                    <Link to="/guest/register" className={buttonVariants({ size: 'lg', className: 'px-5' })}>
                      {t('landing.register')}<ArrowRight size={18} className="ml-2" aria-hidden="true" />
                    </Link>
                  </m.div>
                  <a href="#getting-started" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'px-5' })}>
                    {t('landing.explore')}<ArrowDown size={16} className="ml-2" aria-hidden="true" />
                  </a>
                </div>
                <Text className="mt-5 flex items-start gap-2 text-caption text-muted-foreground">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />{t('landing.secure')}
                </Text>
                <Text className="mt-4 text-body-sm text-muted-foreground">
                  {t('landing.alreadyStarted')}{' '}
                  <Link to="/guest/resume" className="inline-flex min-h-11 items-center rounded-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {t('landing.resume')}<ChevronRight size={15} aria-hidden="true" />
                  </Link>
                </Text>
              </m.div>

              <m.figure data-landing-reveal className="relative min-w-0" variants={reveal}
                initial={reducedMotion ? false : 'hidden'} animate="visible" transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : 0.12 }}>
                <div aria-hidden="true" className="absolute -inset-3 rounded-3xl border border-border bg-muted/50 sm:-inset-4" />
                <Card className="relative overflow-hidden rounded-2xl p-4 shadow-lg shadow-foreground/5 sm:p-6">
                  <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <Text className="text-eyebrow font-bold uppercase tracking-wider text-muted-foreground">{t('landing.visualEyebrow')}</Text>
                      <Heading level={2} size="subsection" className="mt-1">{t('landing.visualTitle')}</Heading>
                    </div>
                    <Layers3 size={24} className="shrink-0 text-primary" aria-hidden="true" />
                  </div>
                  <div className="relative mt-5 grid grid-cols-2 gap-x-3 gap-y-9 py-2"
                    style={{ backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 480 340" preserveAspectRatio="none">
                      {['M240 70 V112 Q240 122 230 122 H125 Q115 122 115 132 V168', 'M240 70 V112 Q240 122 250 122 H355 Q365 122 365 132 V168', 'M115 205 V243 Q115 253 125 253 H230 Q240 253 240 263 V290', 'M365 205 V243 Q365 253 355 253 H250 Q240 253 240 263 V290'].map((path, index) => (
                        <m.path key={path} data-graph-path d={path} fill="none" className={index % 2 ? 'stroke-primary' : 'stroke-border'}
                          strokeWidth={2} initial={reducedMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }}
                          transition={{ duration: reducedMotion ? 0 : 0.9, delay: reducedMotion ? 0 : 0.2 + index * 0.12 }} />
                      ))}
                    </svg>
                    <div className="relative col-span-2 mx-auto rounded-xl border border-border bg-card px-6 py-3 text-center shadow-sm">
                      <Text className="text-caption text-muted-foreground">{t('landing.target')}</Text>
                      <Text className="mt-1 text-card font-semibold">{t('landing.role')}</Text>
                    </div>
                    <div className="relative rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                      <Check size={20} className="mb-2 text-success" aria-hidden="true" />
                      <Text className="text-caption text-muted-foreground">{t('landing.strengths')}</Text>
                      <Text className="mt-1 text-body-sm font-semibold">{t('landing.foundations')}</Text>
                    </div>
                    <div className="relative rounded-xl border border-primary/30 bg-secondary p-3 shadow-sm sm:p-4">
                      <Compass size={20} className="mb-2 text-primary" aria-hidden="true" />
                      <Text className="text-caption text-secondary-foreground">{t('landing.opportunity')}</Text>
                      <Text className="mt-1 text-body-sm font-semibold">{t('landing.systemDesign')}</Text>
                    </div>
                    <div className="relative col-span-2 mx-auto flex max-w-full items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
                      <BookOpen size={22} className="shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <Text className="text-caption text-muted-foreground">{t('landing.nextStep')}</Text>
                        <Text className="mt-1 text-body-sm font-semibold">{t('landing.nextModule')}</Text>
                      </div>
                    </div>
                  </div>
                  <figcaption className="mt-4 text-center text-caption text-muted-foreground">{t('landing.illustration')}</figcaption>
                </Card>
              </m.figure>
            </section>

            <section id="platform" aria-labelledby="platform-heading" className={`${sectionClass} scroll-mt-24 py-12`}>
              <Text className="text-eyebrow font-bold uppercase tracking-wider text-primary">{t('landing.benefitsEyebrow')}</Text>
              <Heading id="platform-heading" level={2} size="section" className="mt-3 max-w-2xl">{t('landing.benefitsTitle')}</Heading>
              <Text className="mt-3 max-w-2xl text-muted-foreground">{t('landing.benefitsDescription')}</Text>
              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {benefits.map((item, index) => (
                  <m.div key={item.title} data-landing-reveal variants={reveal} initial={reducedMotion ? false : 'hidden'}
                    whileInView="visible" viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : index * 0.08 }}>
                    <Card className="h-full p-6">
                      <span className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-primary"><item.icon size={23} aria-hidden="true" /></span>
                      <Heading level={3} size="subsection">{t(`landing.${item.title}`)}</Heading>
                      <Text className="mt-3 text-body-sm leading-relaxed text-muted-foreground">{t(`landing.${item.body}`)}</Text>
                    </Card>
                  </m.div>
                ))}
              </div>
            </section>

            <section id="getting-started" aria-labelledby="steps-heading" className="scroll-mt-24 border-y border-border bg-card py-12">
              <div className={sectionClass}>
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div className="max-w-2xl">
                    <Text className="text-eyebrow font-bold uppercase tracking-wider text-primary">{t('landing.stepsEyebrow')}</Text>
                    <Heading id="steps-heading" level={2} size="section" className="mt-3">{t('landing.stepsTitle')}</Heading>
                    <Text className="mt-3 text-muted-foreground">{t('landing.stepsDescription')}</Text>
                  </div>
                  <Link to="/guest/register" className={buttonVariants({ variant: 'outline', size: 'lg' })}>{t('landing.start')}<ArrowRight size={16} className="ml-2" aria-hidden="true" /></Link>
                </div>
                <ol className="mt-8 grid gap-7 md:grid-cols-3">
                  {steps.map((item, index) => (
                    <li key={item.title}>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-secondary text-body-sm font-semibold text-secondary-foreground">{index + 1}</span>
                        <div className="h-px flex-1 bg-border" /><item.icon size={20} className="text-muted-foreground" aria-hidden="true" />
                      </div>
                      <Heading level={3} size="subsection">{t(`landing.${item.title}`)}</Heading>
                      <Text className="mt-3 text-body-sm leading-relaxed text-muted-foreground">{t(`landing.${item.body}`)}</Text>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section id="questions" aria-labelledby="questions-heading" className={`${sectionClass} grid scroll-mt-24 gap-7 py-12 lg:grid-cols-[1fr_1.4fr] lg:py-16`}>
              <div>
                <Text className="text-eyebrow font-bold uppercase tracking-wider text-primary">{t('landing.faqEyebrow')}</Text>
                <Heading id="questions-heading" level={2} size="section" className="mt-3">{t('landing.faqTitle')}</Heading>
                <Text className="mt-3 text-muted-foreground">{t('landing.faqDescription')}</Text>
              </div>
              <Accordion defaultValue={['need']} className="self-start">
                {questions.map(item => (
                  <AccordionItem key={item.id} value={item.id} className="px-5">
                    <AccordionTrigger id={`${faqId}-${item.id}-trigger`} aria-controls={`${faqId}-${item.id}-content`}
                      className="min-h-14 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none [&_svg]:motion-reduce:transition-none">
                      {t(`landing.${item.question}`)}
                    </AccordionTrigger>
                    <AccordionContent id={`${faqId}-${item.id}-content`} role="region" aria-labelledby={`${faqId}-${item.id}-trigger`}
                      className="leading-relaxed motion-reduce:animate-none">{t(`landing.${item.answer}`)}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            <section className={`${sectionClass} pb-12`} aria-labelledby="final-heading">
              <Card className="grid items-center gap-6 rounded-2xl border-primary/20 bg-secondary p-6 sm:p-9 lg:grid-cols-[1fr_auto]">
                <div>
                  <Text className="text-eyebrow font-bold uppercase tracking-wider text-secondary-foreground">{t('landing.finalEyebrow')}</Text>
                  <Heading id="final-heading" level={2} size="section" className="mt-3">{t('landing.finalTitle')}</Heading>
                  <Text className="mt-3 max-w-2xl text-body-sm text-secondary-foreground">{t('landing.finalDescription')}</Text>
                </div>
                <div className="flex flex-col items-start gap-2 lg:items-center">
                  <Link to="/guest/register" className={buttonVariants({ size: 'lg', className: 'px-5' })}>{t('landing.register')}<ArrowRight size={17} className="ml-2" aria-hidden="true" /></Link>
                  <Link to="/guest/resume" className={navClass}>{t('landing.resume')}</Link>
                </div>
              </Card>
            </section>
          </main>
          <footer className="border-t border-border bg-card">
            <div className={`${sectionClass} flex flex-col gap-3 py-6 text-caption text-muted-foreground sm:flex-row sm:items-center sm:justify-between`}>
              <span className="font-semibold text-foreground">Adapt-Learn-Graph</span>
              <span>{t('landing.footer')}</span>
              <Link to="/login" className={navClass}>{t('landing.signIn')}</Link>
            </div>
          </footer>
        </div>
      </LazyMotion>
    </MotionConfig>
  )
}
