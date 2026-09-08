import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { z } from 'zod'
import {
  loginUser,
  registerUser,
  TOKEN_KEY,
  USER_KEY,
  type AuthUser,
} from '@/lib/api'
import { loginFormSchema, signupFormSchema } from '@/lib/validation'

export const loginSchema = loginFormSchema
export const signupSchema = signupFormSchema

export type User = AuthUser

export type AuthState = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>
  logout: () => void
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

function persistSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem(USER_KEY)
    const token = localStorage.getItem(TOKEN_KEY)
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(TOKEN_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      const validatedData = loginSchema.parse({ email, password })
      const { token, user: apiUser } = await loginUser(validatedData.email, validatedData.password)
      setUser(apiUser)
      persistSession(token, apiUser)
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Login failed. Please try again.')
      }
      throw err
    }
  }

  const signup = async (name: string, email: string, password: string, confirmPassword: string) => {
    setError(null)
    try {
      const validatedData = signupSchema.parse({ name, email, password, confirmPassword })
      const { token, user: apiUser } = await registerUser(
        validatedData.name,
        validatedData.email,
        validatedData.password,
        'consumer'
      )
      setUser(apiUser)
      persistSession(token, apiUser)
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Signup failed. Please try again.')
      }
      throw err
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
