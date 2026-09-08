import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Blocks,
  QrCode,
  ScanEye,
  Sprout,
  Upload,
  Workflow,
  HelpCircle,
  X,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SpaNav } from '@/components/layout/SpaNav'
import { HeroOrb3D } from '@/components/HeroOrb3D'

export default function Landing() {
  const { t } = useTranslation()
  const [showWorkflowHelp, setShowWorkflowHelp] = useState(false)
  const [selectedStep, setSelectedStep] = useState<number | null>(null)

  const workflowSteps = [
    { label: t('workflow.consumerScan.title'), icon: Workflow, to: '/verify' },
    { label: t('workflow.aiVerification.title'), icon: ScanEye, to: '/verify' },
    { label: t('workflow.blockchain.title'), icon: Blocks, to: '/shop' },
    { label: t('workflow.qrGeneration.title'), icon: QrCode, to: '/shop' },
    { label: t('workflow.upload.title'), icon: Upload, to: '/upload' },
  ]

  const workflowDescriptions = [
    {
      title: t('workflow.consumerScan.title'),
      description: t('workflow.consumerScan.description'),
      steps: t('workflow.consumerScan.steps', { returnObjects: true }) as string[],
    },
    {
      title: t('workflow.aiVerification.title'),
      description: t('workflow.aiVerification.description'),
      steps: t('workflow.aiVerification.steps', { returnObjects: true }) as string[],
    },
    {
      title: t('workflow.blockchain.title'),
      description: t('workflow.blockchain.description'),
      steps: t('workflow.blockchain.steps', { returnObjects: true }) as string[],
    },
    {
      title: t('workflow.qrGeneration.title'),
      description: t('workflow.qrGeneration.description'),
      steps: t('workflow.qrGeneration.steps', { returnObjects: true }) as string[],
    },
    {
      title: t('workflow.upload.title'),
      description: t('workflow.upload.description'),
      steps: t('workflow.upload.steps', { returnObjects: true }) as string[],
    },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden spa-surface text-foreground">
      <div className="noise-overlay fixed inset-0 z-[1] opacity-[0.04]" aria-hidden />
      <div
        className="aurora-blob absolute -left-24 top-20 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl"
        aria-hidden
      />
      <div
        className="aurora-blob-delayed absolute -right-16 top-40 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <SpaNav />

        <section className="relative grid items-center gap-10 pt-10 md:grid-cols-2 md:pt-14">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300"
            >
              AyurAuth
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="font-display mt-3 max-w-xl text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl"
            >
              {t('landing.heroTitle')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55 }}
              className="mt-5 max-w-lg text-base text-foreground/75 sm:text-lg"
            >
              {t('landing.heroDescription')}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.55 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <ButtonLink to="/verify" variant="neon" size="lg" className="gap-2">
                {t('landing.scanVerify')}
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink to="/shop" variant="glass" size="lg">
                {t('landing.browseShop')}
              </ButtonLink>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-6 flex items-center gap-2 text-xs text-foreground/60"
            >
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Secure Razorpay checkout · XML-injection hardened API · Glass B2C vault
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="glass-panel relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[2rem] p-2"
          >
            <HeroOrb3D className="h-full min-h-[280px] w-full" />
            <div className="pointer-events-none absolute inset-x-6 bottom-6 rounded-2xl border border-white/20 bg-white/20 p-3 backdrop-blur-xl dark:bg-black/30">
              <p className="text-xs font-medium text-foreground/80">Live authenticity orb</p>
              <p className="text-[11px] text-foreground/55">3D herb signature · CNN + QR twin</p>
            </div>
          </motion.div>
        </section>

        <section className="glass-panel mt-16 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground/90">{t('landing.workflow')}</h2>
            <button
              onClick={() => setShowWorkflowHelp(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {t('landing.workflowHelp')}
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <Link
                  key={step.label}
                  to={step.to}
                  className="glass group relative block rounded-2xl p-4 text-sm text-foreground/80 transition-colors hover:border-emerald-500/30"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Icon className="h-5 w-5 text-primary transition-colors group-hover:text-emerald-500" />
                    <p className="mt-2 font-medium">{step.label}</p>
                    <ChevronRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </section>

        <AnimatePresence>
          {showWorkflowHelp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
              onClick={() => {
                setShowWorkflowHelp(false)
                setSelectedStep(null)
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-panel relative w-full max-w-2xl rounded-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setShowWorkflowHelp(false)
                    setSelectedStep(null)
                  }}
                  className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  {selectedStep !== null
                    ? workflowDescriptions[selectedStep].title
                    : t('landing.howItWorks')}
                </h2>

                {selectedStep !== null ? (
                  <div className="space-y-4">
                    <p className="text-foreground/80">
                      {workflowDescriptions[selectedStep].description}
                    </p>
                    <div className="rounded-xl border border-border/20 bg-muted/50 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        {t('landing.stepsInvolved')}
                      </h3>
                      <ul className="space-y-2">
                        {workflowDescriptions[selectedStep].steps.map((step, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-sm text-foreground/80"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {idx + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-foreground/80">{t('landing.workflowDescription')}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {workflowDescriptions.map((desc, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedStep(idx)}
                          className="flex items-center gap-3 rounded-xl border border-border/20 bg-muted/40 p-3 text-left transition-colors hover:border-emerald-500/30"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-foreground">{desc.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: t('landing.features.geotagging'),
              description: t('landing.features.geotaggingDesc'),
              icon: Sprout,
            },
            {
              title: t('landing.features.aiVerification'),
              description: t('landing.features.aiVerificationDesc'),
              icon: ScanEye,
            },
            {
              title: t('landing.features.transparency'),
              description: t('landing.features.transparencyDesc'),
              icon: Blocks,
            },
          ].map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.07 * index }}
              >
                <Card className="glass-panel h-full">
                  <CardContent className="pt-6">
                    <Icon className="h-8 w-8 text-primary" />
                    <h3 className="mt-4 text-xl font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </section>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Grower or packer?{' '}
          <Link to="/upload" className="font-medium text-emerald-700 dark:text-emerald-400">
            {t('landing.startUpload')}
          </Link>
        </p>
      </div>
    </div>
  )
}
