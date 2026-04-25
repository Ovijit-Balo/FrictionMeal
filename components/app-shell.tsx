"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"
import { AppNav } from "./app-nav"
import { Leaf } from "lucide-react"

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Leaf className="h-5 w-5 animate-pulse text-primary" />
          <span className="text-sm">Loading FrictionMeal…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="md:pl-60 pb-24 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  )
}
