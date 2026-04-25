"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { NutritionScoreCard } from "@/components/nutrition-score-card"
import { BudgetProgressBar } from "@/components/budget-progress-bar"
import { MealHistoryList, type MealEntry } from "@/components/meal-history-list"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth, authFetch } from "@/components/auth-provider"
import { Plus, Pause, Flame, Drumstick, Cookie, Droplets } from "lucide-react"

interface TodayData {
  meals: MealEntry[]
  totals: {
    score: number
    spent: number
    protein_g: number
    calories: number
    carbs_g: number
    fat_g: number
    frictionCount: number
    mealsCount: number
  }
  dailyBudget: number
  monthlyBudget: number
  micronutrientTargets?: {
    vitaminC_mg_per_day: number
    iron_mg_per_day: number
    calcium_mg_per_day: number
    potassium_mg_per_day: number
    protein_g_per_day: number
  }
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  )
}

function DashboardContent() {
  const { user, token } = useAuth()
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    let mounted = true
    setLoading(true)
    authFetch(token, "/api/meals/today")
      .then((r) => r.json())
      .then((d) => {
        if (mounted && !d.error) setData(d)
      })
      .catch((e) => console.error("[v0] today fetch", e))
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [token])

  const greeting = getGreeting()
  const proteinTarget = data?.micronutrientTargets?.protein_g_per_day ?? 46
  const proteinIntake = data?.totals.protein_g ?? 0
  const proteinPct = Math.min(100, (proteinIntake / proteinTarget) * 100)
  const proteinStatus =
    proteinIntake >= proteinTarget ? "Protein goal reached" : "Protein goal in progress"
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent p-4 md:p-5">
        <div>
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="font-serif text-3xl md:text-4xl text-balance">
            {user?.name.split(" ")[0]}
          </h1>
        </div>
        <Button asChild size="lg" className="gap-2 hidden sm:flex">
          <Link href="/log">
            <Plus className="h-4 w-4" />
            Log meal
          </Link>
        </Button>
      </header>

      {loading && !data ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NutritionScoreCard score={data?.totals.score ?? 0} />
            <BudgetProgressBar
              spent={data?.totals.spent ?? 0}
              dailyBudget={data?.dailyBudget ?? 500}
            />
          </div>

          <Card className="p-5 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Protein target
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-serif text-4xl tabular-nums leading-none">
                    {proteinIntake.toFixed(1)}g
                  </span>
                  <span className="text-muted-foreground text-sm">/ {proteinTarget}g</span>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                {proteinStatus}
              </span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${proteinPct}%` }} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Minimum protein is based on your profile target. If intake stays below this goal, the
              app will flag you as lacking protein.
            </p>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniStat
              icon={<Drumstick className="h-4 w-4" />}
              label="Protein"
              value={`${data?.totals.protein_g ?? 0}g`}
              tone="protein"
            />
            <MiniStat
              icon={<Flame className="h-4 w-4" />}
              label="Calories"
              value={`${data?.totals.calories ?? 0} kcal`}
              tone="calories"
            />
            <MiniStat
              icon={<Cookie className="h-4 w-4" />}
              label="Carbs"
              value={`${data?.totals.carbs_g ?? 0}g`}
              tone="carbs"
            />
            <MiniStat
              icon={<Droplets className="h-4 w-4" />}
              label="Fat"
              value={`${data?.totals.fat_g ?? 0}g`}
              tone="fat"
            />
            <MiniStat
              icon={<Pause className="h-4 w-4" />}
              label="Smart Pauses"
              value={`${data?.totals.frictionCount ?? 0}`}
              tone="pause"
            />
          </div>

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-serif text-xl">Today&apos;s meals</h2>
              <span className="text-xs text-muted-foreground">
                {data?.totals.mealsCount ?? 0} logged
              </span>
            </div>
            <MealHistoryList meals={data?.meals ?? []} />
          </section>

          <Button asChild size="lg" className="w-full sm:hidden gap-2">
            <Link href="/log">
              <Plus className="h-4 w-4" />
              Log a meal
            </Link>
          </Button>
        </>
      )}
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: "protein" | "calories" | "carbs" | "fat" | "pause" | "neutral"
}) {
  const toneStyles: Record<NonNullable<typeof tone>, { card: string; chip: string; value: string }> = {
    protein: {
      card: "border-emerald-300/55 bg-gradient-to-br from-emerald-50/80 to-card dark:from-emerald-500/10",
      chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    calories: {
      card: "border-orange-300/55 bg-gradient-to-br from-orange-50/70 to-card dark:from-orange-500/10",
      chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
      value: "text-orange-700 dark:text-orange-300",
    },
    carbs: {
      card: "border-violet-300/55 bg-gradient-to-br from-violet-50/80 to-card dark:from-violet-500/10",
      chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
      value: "text-violet-700 dark:text-violet-300",
    },
    fat: {
      card: "border-sky-300/55 bg-gradient-to-br from-sky-50/70 to-card dark:from-sky-500/10",
      chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
      value: "text-sky-700 dark:text-sky-300",
    },
    pause: {
      card: "border-amber-300/55 bg-gradient-to-br from-amber-50/75 to-card dark:from-amber-500/10",
      chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      value: "text-amber-700 dark:text-amber-300",
    },
    neutral: {
      card: "border-border/80 bg-card/80",
      chip: "bg-muted text-muted-foreground",
      value: "text-foreground",
    },
  }
  const style = toneStyles[tone]

  return (
    <Card className={`p-4 ${style.card}`}>
      <div className="flex items-center gap-2 text-xs">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${style.chip}`}>
          {icon}
        </span>
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className={`mt-1 font-serif text-2xl tabular-nums ${style.value}`}>{value}</div>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="h-36 animate-pulse bg-muted/40" />
        <Card className="h-36 animate-pulse bg-muted/40" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card className="h-20 animate-pulse bg-muted/40" />
        <Card className="h-20 animate-pulse bg-muted/40" />
        <Card className="h-20 animate-pulse bg-muted/40" />
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}
