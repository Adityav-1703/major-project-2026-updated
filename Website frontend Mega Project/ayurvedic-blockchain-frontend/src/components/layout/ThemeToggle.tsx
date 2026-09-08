import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="glass"
      size="sm"
      onClick={toggleTheme}
      className="fixed bottom-6 left-6 z-50 border-border/50 shadow-lg backdrop-blur-sm text-foreground hover:shadow-neon-sm transition-all duration-300 dark:border-white/30 dark:shadow-neon-sm"
    >
      {theme === 'dark' ? (
        <span className="inline-flex items-center gap-2 text-foreground">
          <Sun className="h-4 w-4 stroke-current" />
          <span className="font-medium">Light</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-foreground">
          <Moon className="h-4 w-4 stroke-current" />
          <span className="font-medium">Dark</span>
        </span>
      )}
    </Button>
  )
}
