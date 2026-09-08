import { z } from 'zod'

/** Email must include @ and a valid user@domain.tld shape */
export const emailFieldSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .refine((val) => val.includes('@'), 'Email must contain an @ symbol.')
  .refine(
    (val) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val),
    'Enter a valid email (e.g. name@example.com).'
  )

/**
 * Password: 8+ chars, at least one letter, one number, and one symbol.
 * Only letters, numbers, and common symbols allowed.
 */
export const passwordFieldSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[a-zA-Z]/, 'Password must include at least one letter (a–z).')
  .regex(/[0-9]/, 'Password must include at least one number.')
  .regex(/[^a-zA-Z0-9]/, 'Password must include at least one symbol (e.g. !@#$%).')
  .regex(
    /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/,
    'Password can only contain letters, numbers, and symbols.'
  )

export const PASSWORD_HINT =
  'At least 8 characters with letters, numbers, and a symbol (e.g. !@#$).'

export function zodFieldErrors<T extends string>(
  error: z.ZodError
): Partial<Record<T, string>> {
  const out: Partial<Record<T, string>> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !out[key as T]) {
      out[key as T] = issue.message
    }
  }
  return out
}

export const loginFormSchema = z.object({
  email: emailFieldSchema,
  password: passwordFieldSchema,
})

export const signupFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
    email: emailFieldSchema,
    password: passwordFieldSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

export const uploadHerbSchema = z.object({
  herbName: z.string().trim().min(2, 'Herb name is required (min 2 characters).'),
  farmerId: z.string().trim().min(2, 'Farmer ID is required (min 2 characters).'),
  latitude: z.number({ invalid_type_error: 'Capture geo-location before submitting.' }),
  longitude: z.number({ invalid_type_error: 'Capture geo-location before submitting.' }),
  hasImage: z.literal(true, { errorMap: () => ({ message: 'Please select a herb image.' }) }),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>
export type SignupFormValues = z.infer<typeof signupFormSchema>
export type UploadHerbFormValues = z.infer<typeof uploadHerbSchema>

export function authInputClass(hasError?: string) {
  return `w-full rounded-xl border bg-white/50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-white/5 dark:text-white ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-white/10 dark:focus:border-emerald-500'
  }`
}

export const requestDemoSchema = z
  .object({
    fullName: z.string().min(2, 'Please enter your name.').max(80, 'Name is too long.'),
    email: emailFieldSchema,
    company: z
      .string()
      .min(2, 'Please enter your organization. ')
      .max(120, 'Organization is too long.'),
    interest: z.enum(['Grower', 'Processor', 'Exporter', 'Regulator', 'Buyer', 'Other']).default('Exporter'),
    message: z
      .string()
      .min(10, 'Message should be at least 10 characters.')
      .max(500, 'Message is too long (max 500 characters).'),
    consent: z
      .boolean()
      .refine((v) => v === true, 'Consent is required to proceed.'),
  })
  .strict()

export type RequestDemoValues = z.infer<typeof requestDemoSchema>

export const verifyBatchSchema = z
  .object({
    batchId: z
      .string()
      .trim()
      .regex(/^BATCH-\d{6}$/, 'Batch ID must look like BATCH-123456.'),
    purpose: z.enum(['Harvest', 'Processing', 'Export']).default('Export'),
    notes: z.string().max(200, 'Notes must be 200 characters or less.').optional().or(z.literal('')),
  })
  .strict()

export type VerifyBatchValues = z.infer<typeof verifyBatchSchema>

