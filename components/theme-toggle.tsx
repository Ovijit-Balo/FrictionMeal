"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Variant = "icon" | "inline"

export function ThemeToggle({
  variant = "icon",
  className,
}: {
  variant?: Variant
  className?: string
}) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — render a neutral placeholder until mounted
  useEffect(() => setMounted(true), [])

  const current = theme === "system" ? resolvedTheme : theme
  const isDark = current === "dark"
  const next = isDark ? "light" : "dark"

  const handle = () => setTheme(next)

  if (variant === "inline") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handle}
        aria-label={`Switch to ${next} mode`}
        className={cn("w-full justify-start gap-2 text-muted-foreground hover:text-foreground", className)}
      >
        {mounted ? (
          isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4 opacity-0" />
        )}
        {mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handle}
      aria-label={`Switch to ${next} mode`}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4 opacity-0" />
      )}
    </Button>
  )
}
