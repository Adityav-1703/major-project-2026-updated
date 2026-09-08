import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { useHerbData } from '@/context/HerbDataContext'
import { StatusBadge } from '@/components/ui/status-badge'

export default function Dashboard() {
  const { records } = useHerbData()
  const totalUploads = records.length
  const verifiedHerbs = records.filter((record) => record.isVerified).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 text-slate-900 dark:mesh-bg dark:text-white">
      <div className="noise-overlay fixed inset-0 z-[1] pointer-events-none hidden dark:block" aria-hidden />
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 space-y-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Dashboard</h1>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Upload className="h-5 w-5 text-emerald-200" />
                  Total uploads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-white">{totalUploads}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BadgeCheck className="h-5 w-5 text-emerald-200" />
                  Verified herbs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-white">{verifiedHerbs}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-white">Uploaded Herb Records</CardTitle>
              <ButtonLink to="/upload" variant="neon" size="sm">Upload New</ButtonLink>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="rounded-2xl border border-white/20 bg-white/5 p-8 text-center text-sm text-white/70">
                  No uploads yet. Start by adding your first herb batch.
                </div>
              ) : (
                <div className="overflow-auto rounded-2xl border border-white/20">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/10 text-white/80">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Herb</th>
                        <th className="px-4 py-3">Farmer ID</th>
                        <th className="px-4 py-3">Origin</th>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record.id} className="border-t border-white/10">
                          <td className="px-4 py-3">{record.id.slice(0, 8)}...</td>
                          <td className="px-4 py-3">{record.herbName}</td>
                          <td className="px-4 py-3">{record.farmerId}</td>
                          <td className="px-4 py-3">{record.origin}</td>
                          <td className="px-4 py-3">{new Date(record.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3"><StatusBadge verified={record.isVerified} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
