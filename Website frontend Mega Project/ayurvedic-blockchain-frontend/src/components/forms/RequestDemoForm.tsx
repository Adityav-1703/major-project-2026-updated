import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { requestDemoSchema, type RequestDemoValues } from '@/lib/validation'

type FieldErrors = Partial<Record<keyof RequestDemoValues, string>>

const initialValues: RequestDemoValues = {
  fullName: '',
  email: '',
  company: '',
  interest: 'Exporter',
  message: '',
  consent: false,
}

export default function RequestDemoForm() {
  const [values, setValues] = useState<RequestDemoValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const fieldSchema = useMemo(() => requestDemoSchema, [])

  const setField = <K extends keyof RequestDemoValues>(key: K, value: RequestDemoValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const result = fieldSchema.safeParse(values)
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors
      const nextErrors: FieldErrors = {}
      for (const key of Object.keys(flat) as Array<keyof typeof flat>) {
        const messages = flat[key]
        if (messages && messages[0]) nextErrors[key as keyof RequestDemoValues] = messages[0]
      }
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    setErrors({})
    // Mock submit
    await new Promise((r) => setTimeout(r, 900))
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 backdrop-blur-xl md:p-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Request a 2026 demo</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
              Tell us your use case. We’ll respond with onboarding steps and batch verification flow.
            </p>
          </div>
          <div className="mt-3 md:mt-0 text-sm text-white/55">
            Validation included. No spam.
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="text-sm font-medium text-white/80">Full name</label>
            <Input
              value={values.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              placeholder="e.g., Priya Sharma"
              className="mt-2"
              autoComplete="name"
            />
            {errors.fullName ? <p className="mt-1 text-xs text-rose-300/90">{errors.fullName}</p> : null}
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-medium text-white/80">Work email</label>
            <Input
              value={values.email}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="name@company.com"
              className="mt-2"
              autoComplete="email"
              type="email"
            />
            {errors.email ? <p className="mt-1 text-xs text-rose-300/90">{errors.email}</p> : null}
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-medium text-white/80">Organization</label>
            <Input
              value={values.company}
              onChange={(e) => setField('company', e.target.value)}
              placeholder="e.g., Himalaya Herb Co."
              className="mt-2"
              autoComplete="organization"
            />
            {errors.company ? <p className="mt-1 text-xs text-rose-300/90">{errors.company}</p> : null}
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-medium text-white/80">Primary role</label>
            <select
              value={values.interest}
              onChange={(e) => setField('interest', e.target.value as RequestDemoValues['interest'])}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/90 outline-none ring-offset-background backdrop-blur-md transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {(['Grower', 'Processor', 'Exporter', 'Regulator', 'Buyer', 'Other'] as const).map((opt) => (
                <option key={opt} value={opt} className="bg-slate-950 text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-white/80">What are you tracking?</label>
            <Textarea
              value={values.message}
              onChange={(e) => setField('message', e.target.value)}
              placeholder="Batch traceability, sustainability scoring, export-ready attestations..."
              className="mt-2"
            />
            {errors.message ? <p className="mt-1 text-xs text-rose-300/90">{errors.message}</p> : null}
          </div>

          <div className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/15 p-4">
            <input
              type="checkbox"
              checked={values.consent}
              onChange={(e) => setField('consent', e.target.checked)}
              className="mt-1 h-4 w-4 accent-emerald-400"
              aria-label="Consent checkbox"
            />
            <div className="text-sm leading-relaxed text-white/70">
              I agree to be contacted about AyuAuth demo onboarding.
              {errors.consent ? <p className="mt-1 text-xs text-rose-300/90">{errors.consent}</p> : null}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <Button
              variant="neon"
              size="lg"
              type="submit"
              disabled={submitting || submitted}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Sending...' : submitted ? 'Request received' : 'Request demo'}
            </Button>

            <div className="text-xs text-white/45">
              By submitting, you acknowledge this is a demo flow (no real backend call).
            </div>
          </div>
        </form>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100"
          >
            Request received. We’ll follow up with onboarding steps and a batch verification walkthrough.
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  )
}

