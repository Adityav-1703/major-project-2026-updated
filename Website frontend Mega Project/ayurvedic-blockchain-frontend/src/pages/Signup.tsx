import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { authInputClass, PASSWORD_HINT, signupFormSchema, zodFieldErrors } from '@/lib/validation'

type PasswordStrength = 'weak' | 'medium' | 'strong'

function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null
  const checks = [
    password.length >= 8,
    /[a-zA-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
    /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/.test(password),
  ]
  const passed = checks.filter(Boolean).length
  if (passed <= 2) return 'weak'
  if (passed < 5) return 'medium'
  return 'strong'
}

export default function Signup() {
  const navigate = useNavigate()
  const { signup, error, clearError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>>({})
  const [isLoading, setIsLoading] = useState(false)

  const passwordStrength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const parsed = signupFormSchema.safeParse({ name, email, password, confirmPassword })
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      return
    }

    setIsLoading(true)
    try {
      await signup(parsed.data.name, parsed.data.email, parsed.data.password, parsed.data.confirmPassword)
      navigate('/consumer')
    } catch {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false)
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
            Back to Home
          </Link>

          <Card className="backdrop-blur-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-slate-900 dark:text-white">Create Account</CardTitle>
              <CardDescription className="text-slate-600 dark:text-white/70">
                Join AyurAuth to access AI assistance and track your herb verifications
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
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        clearError()
                        setFieldErrors((prev) => ({ ...prev, name: undefined }))
                      }}
                      placeholder="John Doe"
                      className={`${authInputClass(fieldErrors.name)} pl-10`}
                    />
                  </div>
                  {fieldErrors.name ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.name}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-white/80">
                    Email Address
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
                      className={`${authInputClass(fieldErrors.email)} pl-10`}
                    />
                  </div>
                  {fieldErrors.email ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-white/80">
                    Password
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
                      placeholder="Create a strong password"
                      className={`${authInputClass(fieldErrors.password)} pl-10 pr-10`}
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
                  {passwordStrength && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            passwordStrength === 'weak'
                              ? 'w-1/3 bg-red-500'
                              : passwordStrength === 'medium'
                              ? 'w-2/3 bg-yellow-500'
                              : 'w-full bg-emerald-500'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          passwordStrength === 'weak'
                            ? 'text-red-500'
                            : passwordStrength === 'medium'
                            ? 'text-yellow-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {passwordStrength === 'weak'
                          ? 'Weak'
                          : passwordStrength === 'medium'
                          ? 'Medium'
                          : 'Strong'}
                      </span>
                    </div>
                  )}
                  {fieldErrors.password ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-white/80">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        clearError()
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                      }}
                      placeholder="Confirm your password"
                      className={`${authInputClass(fieldErrors.confirmPassword)} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white/70"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && password === confirmPassword && (
                    <div className="flex items-center gap-1 text-xs text-emerald-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Passwords match
                    </div>
                  )}
                  {fieldErrors.confirmPassword ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
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
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-600 dark:text-white/70">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}