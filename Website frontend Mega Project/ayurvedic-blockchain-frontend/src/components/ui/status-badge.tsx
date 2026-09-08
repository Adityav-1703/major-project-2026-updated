import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  verified: boolean
  className?: string
}

export function StatusBadge({ verified, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        verified
          ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-200'
          : 'border-red-300/30 bg-red-400/15 text-red-200',
        className
      )}
    >
      {verified ? 'Verified' : 'Not Verified'}
    </span>
  )
}
