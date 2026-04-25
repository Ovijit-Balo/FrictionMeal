"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { WeeklyCharts, type WeeklyDayData } from "@/components/weekly-chart"
import { Card } from "@/components/ui/card"
import { useAuth, authFetch } from "@/components/auth-provider"
import {
  AlertTriangle,
  Lightbulb,
  Pause,
  MessageCircle,
  Wallet,
  UtensilsCrossed,
  BarChart3,
} from "lucide-react"

interface SummaryData {
  days: WeeklyDayData[]
  dailyBudget: number
  totals: {
    score: number
    spent: number
    meals: number
    frictionCount: number
  }
  alerts: string[]
  tips: string[]
  frictionJustifications: Array<{
    foodItems: string[]
    cost: number
    justification: string
    timestamp: string
  }>
}

export default function SummaryPage() {
  return (
    <AppShell>
      <SummaryContent />
    </AppShell>
  )
}

function SummaryContent() {
  const { token } = useAuth()
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    let mounted = true
    setLoading(true)
    authFetch(token, "/api/summary/weekly")
      .then((r) => r.json())
      .then((d) => {
        if (mounted && !d.error) setData(d)
      })
      .catch((e) => console.error("[v0] summary fetch", e))
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [token])

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent p-4 md:p-5">
        <h1 className="font-serif text-3xl md:text-4xl text-balance">Weekly summary</h1>
        <p className="text-muted-foreground mt-1 text-pretty">
          Patterns from the last 7 days — reflection turns into insight.
        </p>
      </header>

      {loading && !data ? (
        <div className="space-y-4">
          <Card className="h-64 animate-pulse bg-muted/40" />
          <Card className="h-64 animate-pulse bg-muted/40" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total score"
              value={data.totals.score.toString()}
              suffix={`/ ${7 * 45}`}
              tone="score"
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <StatCard
              label="Total spent"
              value={`৳${Math.round(data.totals.spent)}`}
              tone="budget"
              icon={<Wallet className="h-4 w-4" />}
            />
            <StatCard
              label="Meals logged"
              value={data.totals.meals.toString()}
              tone="meals"
              icon={<UtensilsCrossed className="h-4 w-4" />}
            />
            <StatCard
              label="Smart Pauses"
              value={data.totals.frictionCount.toString()}
              tone="pause"
              icon={<Pause className="h-4 w-4" />}
            />
          </div>

          <WeeklyCharts days={data.days} dailyBudget={data.dailyBudget} />

          {(data.alerts.length > 0 || data.tips.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.alerts.length > 0 && (
                <Card className="p-5 border-amber-300/40 bg-gradient-to-br from-amber-50/60 to-card dark:from-amber-500/10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <h3 className="font-serif text-lg">Patterns noticed</h3>
                  </div>
                  <ul className="space-y-2">
                    {data.alerts.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-700 dark:text-amber-300 mt-1">•</span>
                        <span className="text-pretty">{a}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {data.tips.length > 0 && (
                <Card className="p-5 border-primary/25 bg-gradient-to-br from-primary/10 to-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Lightbulb className="h-4 w-4" />
                    </div>
                    <h3 className="font-serif text-lg">Coaching tips</h3>
                  </div>
                  <ul className="space-y-2">
                    {data.tips.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-pretty">{t}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {data.frictionJustifications.length > 0 && (
            <Card className="p-5 border-border/80 bg-card/90">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-lg">Recent reflections</h3>
              </div>
              <div className="space-y-3">
                {data.frictionJustifications.map((j, i) => (
                  <div key={i} className="rounded-md border border-border/70 bg-muted/45 border-l-2 border-l-accent px-3 py-2">
                    <div className="text-xs text-foreground/70 mb-0.5">
                      {new Date(j.timestamp).toLocaleDateString()} · {j.foodItems.join(", ")} · ৳
                      {Math.round(j.cost)}
                    </div>
                    <div className="text-sm italic text-foreground">
                      &ldquo;{j.justification}&rdquo;
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          No data yet. Log meals to see your weekly summary.
        </Card>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  suffix,
  icon,
  tone = "neutral",
}: {
  label: string
  value: string
  suffix?: string
  icon?: React.ReactNode
  tone?: "score" | "budget" | "meals" | "pause" | "neutral"
}) {
  const toneStyles: Record<NonNullable<typeof tone>, { card: string; chip: string; value: string }> = {
    score: {
      card: "border-emerald-300/55 bg-gradient-to-br from-emerald-50/80 to-card dark:from-emerald-500/10",
      chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    budget: {
      card: "border-orange-300/55 bg-gradient-to-br from-orange-50/70 to-card dark:from-orange-500/10",
      chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
      value: "text-orange-700 dark:text-orange-300",
    },
    meals: {
      card: "border-violet-300/55 bg-gradient-to-br from-violet-50/80 to-card dark:from-violet-500/10",
      chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
      value: "text-violet-700 dark:text-violet-300",
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
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`font-serif text-2xl tabular-nums ${style.value}`}>{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </Card>
  )
}
