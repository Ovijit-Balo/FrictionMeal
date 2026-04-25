"use client"

import { Card } from "@/components/ui/card"
import { Pause, UtensilsCrossed } from "lucide-react"
import { cn } from "@/lib/utils"
import { NutriGradeBadge, NovaBadge, type NutriGrade } from "./nutri-grade-badge"

export interface MealEntry {
  id: string
  foodItems: string[]
  mealType: string
  portionSize: number
  cost: number
  nutritionScore: number
  nutriGrade?: NutriGrade
  novaGroup?: 1 | 2 | 3 | 4
  protein_g: number
  calories: number
  carbs_g?: number
  fat_g?: number
  vitamin_c_mg?: number
  iron_mg?: number
  calcium_mg?: number
  potassium_mg?: number
  source: string
  sourceBreakdown?: Record<string, number>
  matchConfidence?: number
  frictionTriggered: boolean
  frictionReason?: "expensive" | "unhealthy" | "both" | null
  frictionTriggerType?: "offtrack_combo" | "budget_overrun" | "high_risk_combo" | null
  justification?: string
  mood?: string
  timestamp: string | Date
}

function formatTime(ts: string | Date) {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

function scoreTone(score: number) {
  if (score >= 15) return "text-primary"
  if (score >= 10) return "text-amber-700 dark:text-amber-300"
  return "text-destructive"
}

export function MealHistoryList({ meals }: { meals: MealEntry[] }) {
  if (meals.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">No meals logged yet</div>
            <p className="text-sm text-muted-foreground mt-1">
              Start your day by logging your first meal.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {meals.map((meal) => (
        <Card key={meal.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium uppercase tracking-wide text-foreground/75">
                  {meal.mealType}
                </span>
                <span className="text-xs text-foreground/45">·</span>
                <span className="text-xs text-foreground/70">{formatTime(meal.timestamp)}</span>
                {meal.frictionTriggered && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/20 px-2 py-0.5 text-xs text-amber-900 dark:text-amber-200">
                    <Pause className="h-3 w-3" />
                    {meal.frictionTriggerType === "budget_overrun"
                      ? "Paused · Budget"
                      : meal.frictionReason === "both"
                        ? "Paused · Both"
                        : meal.frictionReason === "expensive"
                          ? "Paused · Cost"
                          : meal.frictionReason === "unhealthy"
                            ? "Paused · Nutrition"
                            : "Paused"}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-foreground truncate">
                {meal.foodItems.join(", ")}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/75">
                <span>৳{Math.round(meal.cost)}</span>
                <span className="text-foreground/45">·</span>
                <span>{meal.calories} kcal</span>
                <span className="text-foreground/45">·</span>
                <span>{meal.protein_g}g protein</span>
                {meal.carbs_g != null && (
                  <>
                    <span className="text-foreground/45">·</span>
                    <span>{meal.carbs_g}g carbs</span>
                  </>
                )}
                {meal.fat_g != null && (
                  <>
                    <span className="text-foreground/45">·</span>
                    <span>{meal.fat_g}g fat</span>
                  </>
                )}
                <span className="text-foreground/45">·</span>
                <span className="uppercase text-foreground/85">{meal.source}</span>
                {meal.matchConfidence != null && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] uppercase",
                      meal.matchConfidence >= 0.85
                        ? "bg-primary/10 text-primary"
                        : meal.matchConfidence >= 0.65
                          ? "bg-accent/30 text-accent-foreground"
                          : "bg-destructive/10 text-destructive",
                    )}
                    title={`Confidence ${(meal.matchConfidence * 100).toFixed(0)}%`}
                  >
                    {(meal.matchConfidence * 100).toFixed(0)}%
                  </span>
                )}
                {meal.novaGroup === 4 && <NovaBadge group={meal.novaGroup} className="ml-1" />}
              </div>
              {meal.justification && (
                <div className="mt-3 rounded-md border border-border/70 bg-muted/45 px-3 py-2 border-l-2 border-accent">
                  <div className="mb-0.5 text-xs text-foreground/70">
                    Reflection{meal.mood ? ` · ${meal.mood}` : ""}
                  </div>
                  <div className="text-sm italic text-foreground">
                    &ldquo;{meal.justification}&rdquo;
                  </div>
                </div>
              )}
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
              <div
                className={cn("font-serif text-2xl tabular-nums", scoreTone(meal.nutritionScore))}
              >
                {meal.nutritionScore}
                <span className="text-xs text-muted-foreground font-sans ml-1">/ 20</span>
              </div>
              {meal.nutriGrade && <NutriGradeBadge grade={meal.nutriGrade} size="sm" />}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
