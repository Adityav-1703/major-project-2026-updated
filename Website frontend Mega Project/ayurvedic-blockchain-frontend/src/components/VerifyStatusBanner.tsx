import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react'
import type { VerifyStatus } from '@/lib/api'

interface VerifyStatusBannerProps {
  status: VerifyStatus
  message: string
  labels: {
    valid: string
    invalid: string
    malformed: string
    unverified: string
  }
}

export function VerifyStatusBanner({ status, message, labels }: VerifyStatusBannerProps) {
  const config = {
    valid: {
      icon: CheckCircle2,
      title: labels.valid,
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    invalid: {
      icon: XCircle,
      title: labels.invalid,
      className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    },
    malformed: {
      icon: HelpCircle,
      title: labels.malformed,
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    },
    unverified: {
      icon: AlertTriangle,
      title: labels.unverified,
      className: 'border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-300',
    },
  }[status]

  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-4 flex gap-3 rounded-xl border p-4 ${config.className}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <motion.div>
        <p className="font-semibold text-sm">{config.title}</p>
        <p className="mt-1 text-sm opacity-90">{message}</p>
      </motion.div>
    </motion.div>
  )
}
