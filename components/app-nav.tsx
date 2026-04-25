"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, PlusCircle, BarChart3, UserCircle, LogOut } from "lucide-react"
import { useAuth } from "./auth-provider"
import { ThemeToggle } from "./theme-toggle"
import { BrandMark } from "./brand-mark"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/log", label: "Log Food", icon: PlusCircle },
  { href: "/summary", label: "Insights", icon: BarChart3 },
  { href: "/profile", label: "Account", icon: UserCircle },
]

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  if (!user) return null

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col border-r border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-6 py-6 border-b border-border">
          <BrandMark size={36} iconSize={18} />
          <div>
            <div className="font-serif text-xl leading-none">FrictionMeal</div>
            <div className="text-xs text-muted-foreground mt-1">Smart Pause Engine</div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border px-3 py-3">
          <div className="px-3 py-2 text-sm">
            <div className="font-medium truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
          <ThemeToggle variant="inline" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark size={32} iconSize={16} />
          <span className="font-serif text-lg">FrictionMeal</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm"
        aria-label="Primary navigation"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md px-3 py-1.5 text-xs",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
