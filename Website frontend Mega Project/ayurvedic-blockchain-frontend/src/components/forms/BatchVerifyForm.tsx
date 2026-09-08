import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Scan, AlertTriangle, Database } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { verifyBatchSchema, type VerifyBatchValues } from '@/lib/validation'

type FieldErrors = Partial<Record<keyof VerifyBatchValues, string>>

type VerifyResult = {
  batchId: string
  verified: boolean
  statusLabel: string
  confidence: number
  sustainabilityScore: number
  onChainRecords: number
  reasons: string[]
  events: Array<{ title: string; detail: string }>
}

type RecentItem = { batchId: string; statusLabel: string; verified: boolean; at: number }

const initialValues: VerifyBatchValues = {
  batchId: '',
  purpose: 'Export',
  notes: '',
}

function mockVerifyBatch(values: VerifyBatchValues): VerifyResult {
  const lastChar = values.batchId.trim().slice(-1) || '0'
  const lastDigit = Number(lastChar) || 0

  const verified = lastDigit % 2 === 0
  const confidence = 62 + (lastDigit % 9) * 3
  const sustainabilityScore = 70 + (lastDigit % 10) * 2
  const onChainRecords = 18 + lastDigit

  const reasons: string[] = []
  if (verified) {
    reasons.push('Attestations found for the full batch lineage.')
    reasons.push('Sustainability score matches policy thresholds for export.')
  } else {
    reasons.push('Some attestations are still pending verification.')
    reasons.push('We detected partial records; a regulator review may be required.')
  }

  const events = verified
    ? [
        { title: 'Batch registered', detail: `Signature committed to on-chain ledger.` },
        { title: 'Attestations linked', detail: `Sourcing, processing, and export checkpoints matched.` },
        { title: 'Export readiness', detail: `Policy checks passed for purpose: ${values.purpose}.` },
      ]
    : [
        { title: 'Batch registered', detail: `Signature committed to on-chain ledger.` },
        { title: 'Partial linkage', detail: `Some checkpoints missing from the current record view.` },
        { title: 'Review recommended', detail: `Continue monitoring until attestations complete.` },
      ]

  return {
    batchId: values.batchId.trim(),
    verified,
    statusLabel: verified ? 'Verified' : 'Needs review',
    confidence: Math.min(99, confidence),
    sustainabilityScore: Math.min(99, sustainabilityScore),
    onChainRecords,
    reasons,
    events,
  }
}

export default function BatchVerifyForm() {
  const schema = useMemo(() => verifyBatchSchema, [])

  const [values, setValues] = useState<VerifyBatchValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ayu_recent_verifies')
      if (!raw) return
      const parsed = JSON.parse(raw) as RecentItem[]
      if (Array.isArray(parsed)) setRecent(parsed.slice(0, 5))
    } catch {
      // ignore
    }
  }, [])

  const setField = <K extends keyof VerifyBatchValues>(key: K, value: VerifyBatchValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors
      const nextErrors: FieldErrors = {}
      for (const key of Object.keys(flat) as Array<keyof typeof flat>) {
        const messages = flat[key]
        if (messages && messages[0]) nextErrors[key as keyof VerifyBatchValues] = messages[0]
      }
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setSubmitting(true)
    setResult(null)

    await new Promise((r) => setTimeout(r, 950))
    const verified = mockVerifyBatch(parsed.data)

    setSubmitting(false)
    setResult(verified)

    const nextRecent: RecentItem[] = [
      { batchId: verified.batchId, statusLabel: verified.statusLabel, verified: verified.verified, at: Date.now() },
      ...recent,
    ].slice(0, 5)

    setRecent(nextRecent)
    try {
      localStorage.setItem('ayu_recent_verifies', JSON.stringify(nextRecent))
    } catch {
      // ignore
    }
  }

  const fillFromRecent = (item: RecentItem) => {
    setValues((prev) => ({ ...prev, batchId: item.batchId }))
    setResult(null)
    setErrors({})
  }

  const downloadProof = () => {
    if (!result) return

    const payload = {
      batchId: result.batchId,
      status: result.statusLabel,
      verified: result.verified,
      confidence: result.confidence,
      sustainabilityScore: result.sustainabilityScore,
      onChainRecords: result.onChainRecords,
      events: result.events,
      reasons: result.reasons,
      purpose: values.purpose,
      notes: values.notes || undefined,
      generatedAt: new Date().toISOString(),
      // Mock: in a real app, this would be the cryptographic proof reference.
      proofId: `proof_${result.batchId.replace('-', '_')}_${Math.floor(result.confidence)}`,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `ayu-proof-${result.batchId}.json`
    a.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 backdrop-blur-xl md:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Verify a batch</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
              Enter your batch ID to see tamper-evident lineage, policy readiness, and on-chain record counts.
            </p>
          </div>
          <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
            <Scan className="h-5 w-5 text-emerald-300" />
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 grid gap-5">
          <div>
            <label className="text-sm font-medium text-white/80">Batch ID</label>
            <Input
              value={values.batchId}
              onChange={(e) => setField('batchId', e.target.value)}
              placeholder="BATCH-123456"
              className="mt-2"
              autoComplete="off"
              spellCheck={false}
              inputMode="numeric"
            />
            {errors.batchId ? <p className="mt-1 text-xs text-rose-300/90">{errors.batchId}</p> : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-white/80">Purpose</label>
              <select
                value={values.purpose}
                onChange={(e) => setField('purpose', e.target.value as VerifyBatchValues['purpose'])}
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/90 outline-none ring-offset-background backdrop-blur-md transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(['Harvest', 'Processing', 'Export'] as const).map((opt) => (
                  <option key={opt} value={opt} className="bg-slate-950 text-white">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-white/80">Quick notes (optional)</label>
              <Textarea
                value={values.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="e.g., Lab sample batch-9"
                className="mt-2 min-h-[84px]"
              />
              {errors.notes ? <p className="mt-1 text-xs text-rose-300/90">{errors.notes}</p> : null}
            </div>
          </div>

          <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <Button
              variant="neon"
              size="lg"
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Verifying...' : 'Verify batch'}
            </Button>

            <div className="text-xs text-white/45">
              This demo uses mock results to show validated UI behavior.
            </div>
          </div>
        </form>

        {recent.length > 0 ? (
          <div className="mt-8">
            <div className="mb-3 text-sm font-medium text-white/80">Recent verifications</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {recent.map((item) => (
                <button
                  key={item.batchId}
                  type="button"
                  onClick={() => fillFromRecent(item)}
                  className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:border-emerald-400/25 hover:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-white/60">ID</div>
                    {item.verified ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-300" />
                    )}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">{item.batchId}</div>
                  <div className="mt-1 text-xs text-white/55">{item.statusLabel}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 backdrop-blur-xl md:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold md:text-2xl">Verification output</h3>
            <p className="mt-2 text-sm text-white/60">
              Structured proof preview with confidence, record counts, and event lineage.
            </p>
          </div>
          <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
            <Database className="h-5 w-5 text-cyan-300" />
          </div>
        </div>

        <div className="mt-7">
          {!result ? (
            <div className="rounded-2xl border border-white/10 bg-black/10 p-6 text-sm text-white/60">
              Type a batch ID and hit <span className="text-white/85 font-semibold">Verify</span>.
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-white/10 bg-black/10 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="inline-flex items-center gap-2">
                  {result.verified ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-300" />
                  )}
                  <div>
                    <div className="text-sm text-white/60">Status</div>
                    <div className="font-display text-lg font-bold text-white">{result.statusLabel}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/60">Confidence</div>
                  <div className="font-display text-lg font-bold text-white">{result.confidence}%</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-white/55">
                  <span>Sustainability score</span>
                  <span className="font-semibold text-white/75">{result.sustainabilityScore}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.sustainabilityScore}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-2 rounded-full ${result.verified ? 'bg-emerald-400' : 'bg-amber-300'}`}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-xs text-white/55">On-chain records</div>
                  <div className="mt-1 font-display text-xl font-bold text-white">{result.onChainRecords}</div>
                  <div className="mt-1 text-xs text-white/55">Lineage artifacts</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-xs text-white/55">Batch ID</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-white">{result.batchId}</div>
                  <div className="mt-1 text-xs text-white/55">Tamper-evident identifier</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-semibold text-white">Reasons</div>
                <ul className="mt-2 space-y-2">
                  {result.reasons.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm text-white/65">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300/70" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <div className="text-sm font-semibold text-white">Event lineage</div>
                <div className="mt-3 space-y-3">
                  {result.events.map((ev, idx) => (
                    <div key={ev.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            idx === 0
                              ? 'bg-cyan-300'
                              : idx === 1
                                ? 'bg-emerald-300'
                                : result.verified
                                  ? 'bg-emerald-300'
                                  : 'bg-amber-300'
                          }`}
                        />
                        <div className="text-sm font-semibold text-white">{ev.title}</div>
                      </div>
                      <div className="mt-2 text-sm text-white/60">{ev.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <Button variant="glass" size="lg" type="button" onClick={downloadProof} className="w-full">
                  Download proof preview (JSON)
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

