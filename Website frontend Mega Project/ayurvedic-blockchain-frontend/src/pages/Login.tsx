import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { postAuthPath } from '@/lib/authRedirect'
import { loginFormSchema, PASSWORD_HINT, zodFieldErrors } from '@/lib/validation'
import { USER_KEY, type AuthUser } from '@/lib/api'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, error, clearError, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const parsed = loginFormSchema.safeParse({ email, password })
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      return
    }

    try {
      await login(parsed.data.email, parsed.data.password)
      const saved = localStorage.getItem(USER_KEY)
      const role = saved ? (JSON.parse(saved) as AuthUser).role : 'consumer'
      navigate(postAuthPath(role))
    } catch {
      // Error is handled by the auth context
    }
  }

  const displayError = error

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 text-slate-900 dark:mesh-bg dark:text-white">
      <div className="noise-overlay fixed inset-0 z-[1] hidden dark:block" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('nav.backToHome')}
          </Link>

          <Card className="backdrop-blur-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-slate-900 dark:text-white">{t('login.welcomeBack')}</CardTitle>
              <CardDescription className="text-slate-600 dark:text-white/70">
                {t('login.signInDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {displayError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
                  >
                    {displayError}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-white/80">
                    {t('login.email')}
                  </label>
                  <p className="text-xs text-slate-500 dark:text-white/50">Must include @ (e.g. name@example.com)</p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        clearError()
                        setFieldErrors((prev) => ({ ...prev, email: undefined }))
                      }}
                      placeholder="you@example.com"
                      className={`w-full rounded-xl border bg-white/50 px-4 py-3 pl-10 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-white/5 dark:text-white ${
                        fieldErrors.email
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-white/10 dark:focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {fieldErrors.email ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-white/80">
                    {t('login.password')}
                  </label>
                  <p className="text-xs text-slate-500 dark:text-white/50">{PASSWORD_HINT}</p>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        clearError()
                        setFieldErrors((prev) => ({ ...prev, password: undefined }))
                      }}
                      placeholder={t('login.password')}
                      className={`w-full rounded-xl border bg-white/50 px-4 py-3 pl-10 pr-10 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-white/5 dark:text-white ${
                        fieldErrors.password
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-white/10 dark:focus:border-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white/70"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  variant="neon"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('login.signingIn')}
                    </span>
                  ) : (
                    t('login.signIn')
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-600 dark:text-white/70">
                {t('login.noAccount')}{' '}
                <Link
                  to="/signup"
                  className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  {t('login.signUp')}
                </Link>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs text-slate-500 dark:text-white/50">
                  <strong>{t('login.demoCredentials')}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}