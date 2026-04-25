"use client"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Info } from "lucide-react"

interface NutritionScoreCardProps {
  score: number
  target?: number
  label?: string
  size?: "small" | "large"
  showBar?: boolean
  /** Show the underlying methodology line beneath the score */
  showMethodology?: boolean
}

/**
 * Daily nutrition score card. Visualizes the total score against a target.
 * Color: red (<target*0.5), amber (target*0.5 .. target), primary (>=target).
 */
export function NutritionScoreCard({
  score,
  target = 45, // ~3 meals × 15 per meal for a "good" day
  label = "Today's nutrition",
  size = "large",
  showBar = true,
  showMethodology = true,
}: NutritionScoreCardProps) {
  const pct = Math.min(100, (score / target) * 100)
  const tone =
    score >= target ? "good" : score >= target * 0.6 ? "warn" : "low"

  const toneColor =
    tone === "good"
      ? "text-primary"
      : tone === "warn"
        ? "text-accent-foreground"
        : "text-destructive"

  const barColor =
    tone === "good"
      ? "bg-primary"
      : tone === "warn"
        ? "bg-accent"
        : "bg-destructive"

  const statusText =
    tone === "good"
      ? "On track"
      : tone === "warn"
        ? "Can improve"
        : "Off track"

  if (size === "small") {
    return (
      <div className="flex items-center gap-3">
        <div className={cn("font-serif text-2xl tabular-nums", toneColor)}>{score}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={cn("font-serif text-5xl tabular-nums leading-none", toneColor)}>
              {score}
            </span>
            <span className="text-muted-foreground text-sm">/ {target}</span>
          </div>
        </div>
        <span
          className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            tone === "good"
              ? "bg-primary/10 text-primary"
              : tone === "warn"
                ? "bg-accent/30 text-accent-foreground"
                : "bg-destructive/10 text-destructive",
          )}
        >
          {statusText}
        </span>
      </div>
      {showBar && (
        <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full transition-all", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {showMethodology && (
        <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            Scoring: Nutri-Score (Santé Publique France 2017) + NOVA
            (Monteiro et al.), flagged against WHO 2012/2015/2023 targets.
          </span>
        </div>
      )}
    </Card>
  )
}
