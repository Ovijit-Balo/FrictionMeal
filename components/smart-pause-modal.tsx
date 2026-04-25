"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CountdownTimer } from "./countdown-timer"
import {
  Pause,
  Sparkles,
  Wallet,
  Activity,
  AlertTriangle,
  BookOpen,
  Plus,
  ChevronDown,
} from "lucide-react"
import type { Alternative } from "@/lib/nutrition/alternatives"
import type { WhoFlag } from "@/lib/nutrition/whoTargets"
import { NutriGradeBadge, NovaBadge, type NutriGrade } from "./nutri-grade-badge"
import {
  EXPENSIVE_SHARE_OF_DAILY,
  UNHEALTHY_THRESHOLD,
  DAILY_SCORE_TARGET,
  OVER_BUDGET_GRACE,
} from "@/lib/frictionEngine"

export interface CompositionEntry {
  food: string
  parts: Array<{ name: string; grams: number }>
}

export interface PausePayload {
  reason: "expensive" | "unhealthy" | "both" | null
  triggerType?: "offtrack_combo" | "budget_overrun" | "high_risk_combo" | null
  rationale?: string[]
  isMealExpensive?: boolean
  isMealUnhealthy?: boolean
  isOverBudget?: boolean
  todayScore: number
  dailyBudget: number
  spentToday?: number
  mealCost: number
  mealScore: number
  grade?: NutriGrade
  novaGroup?: 1 | 2 | 3 | 4
  whoFlags?: WhoFlag[]
  methodology?: {
    nutriScore: string
    nova: string
    whoTargets: string
  }
  alternatives: Alternative[]
  composition?: CompositionEntry[]
  preview: {
    foodItems: string[]
    protein_g: number
    calories: number
    fiber_g: number
  }
}

interface SmartPauseModalProps {
  open: boolean
  payload: PausePayload | null
  onConfirm: (justification: string, mood?: string) => void
  onCancel: () => void
  /**
   * Called when the user taps an "Add to meal" chip. Parent should close
   * the modal, append the food to the input, and let the user re-log —
   * shaping the meal rather than blocking it.
   */
  onAddFood?: (foodName: string) => void
  submitting?: boolean
}

const MOOD_OPTIONS = ["Stressed", "Tired", "Bored", "Hungry", "Celebrating", "Social"]
const MIN_JUSTIFICATION_CHARS = 15

export function SmartPauseModal({
  open,
  payload,
  onConfirm,
  onCancel,
  onAddFood,
  submitting,
}: SmartPauseModalProps) {
  const [timerDone, setTimerDone] = useState(false)
  const [justification, setJustification] = useState("")
  const [mood, setMood] = useState<string>("")
  const [showMethodology, setShowMethodology] = useState(false)
  const [showComposition, setShowComposition] = useState(false)

  useEffect(() => {
    if (!open) {
      setTimerDone(false)
      setJustification("")
      setMood("")
      setShowMethodology(false)
      setShowComposition(false)
    }
  }, [open])

  if (!payload) return null

  const justificationLen = justification.trim().length
  const canSubmit =
    timerDone && justificationLen >= MIN_JUSTIFICATION_CHARS && !submitting

  const reasonLabel =
    payload.reason === "both"
      ? "This meal is expensive AND low on nutrition."
      : payload.reason === "expensive"
        ? "This meal is expensive for today's budget."
        : "This meal is low on nutrition."
  const projectedSpend = (payload.spentToday ?? 0) + payload.mealCost
  const overBudgetByMath =
    payload.dailyBudget > 0 && projectedSpend > payload.dailyBudget * OVER_BUDGET_GRACE
  const overBudget = payload.isOverBudget ?? overBudgetByMath
  const introLine =
    payload.triggerType === "budget_overrun" || overBudget
      ? "This choice pushes today's spending over budget."
      : payload.triggerType === "high_risk_combo"
        ? "This meal is both costly and low-quality."
        : "Today's nutrition trend and this meal combination signal risk."

  const handleClose = (o: boolean) => {
    if (!o && !submitting) {
      onCancel()
    }
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    onConfirm(justification.trim(), mood || undefined)
  }

  const handleAdd = (food: string) => {
    if (!onAddFood) return
    onAddFood(food)
  }

  const expensiveCutoff = payload.dailyBudget * EXPENSIVE_SHARE_OF_DAILY

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        <div className="bg-accent/30 px-6 py-5 border-b border-border">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Pause className="h-4 w-4" />
              </div>
              <DialogTitle className="font-serif text-2xl">Smart Pause</DialogTitle>
            </div>
            <DialogDescription className="text-foreground/80 text-pretty">
              {introLine} {reasonLabel} Take a breath before you log.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Context row */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <StatTile
              icon={<Activity className="h-4 w-4" />}
              label="Today's score"
              value={`${payload.todayScore}/${DAILY_SCORE_TARGET * 4}`}
              tone={payload.todayScore < DAILY_SCORE_TARGET ? "warn" : "ok"}
            />
            <StatTile
              icon={<Wallet className="h-4 w-4" />}
              label="Meal cost"
              value={`${Math.round(payload.mealCost)}`}
              prefix="৳"
              tone={payload.isMealExpensive ?? payload.mealCost > expensiveCutoff ? "warn" : "ok"}
            />
            <StatTile
              icon={<Sparkles className="h-4 w-4" />}
              label="Meal score"
              value={`${payload.mealScore}/20`}
              tone={
                payload.isMealUnhealthy ?? payload.mealScore < UNHEALTHY_THRESHOLD ? "warn" : "ok"
              }
            />
          </div>

          {/* Budget context */}
          {payload.spentToday != null && payload.dailyBudget > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Spent so far today · ৳{payload.spentToday} of ৳{payload.dailyBudget} daily budget
            </div>
          )}

          {payload.rationale && payload.rationale.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs font-medium text-foreground mb-1.5">Why this pause triggered</div>
              <ul className="space-y-1">
                {payload.rationale.slice(0, 2).map((item, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground leading-snug">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Grade / NOVA badges */}
          {(payload.grade || payload.novaGroup) && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {payload.grade && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Nutri-Score</span>
                  <NutriGradeBadge grade={payload.grade} size="md" />
                </div>
              )}
              {payload.novaGroup && <NovaBadge group={payload.novaGroup} />}
            </div>
          )}

          {/* WHO flags */}
          {payload.whoFlags && payload.whoFlags.length > 0 && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-medium">WHO / EFSA flags</h3>
              </div>
              <ul className="space-y-1.5">
                {payload.whoFlags.map((f, i) => (
                  <li key={i} className="text-xs">
                    <div className="text-foreground">{f.message}</div>
                    <div className="text-[10px] text-muted-foreground italic mt-0.5">
                      {f.citation}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Shape-the-meal: alternatives with one-tap swap */}
          {payload.alternatives.length > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">Shape this meal</h3>
              </div>
              <ul className="space-y-3">
                {payload.alternatives.map((alt, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium">{alt.name}</span>
                          <span className="text-primary text-xs">{alt.benefit}</span>
                        </div>
                        <div className="text-muted-foreground text-xs mt-1 leading-snug">
                          {alt.detail}
                        </div>
                        {alt.citation && (
                          <div className="text-[10px] text-muted-foreground italic mt-1">
                            {alt.citation}
                          </div>
                        )}
                      </div>
                      {alt.addFood && onAddFood && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs shrink-0 gap-1 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleAdd(alt.addFood!)}
                          disabled={submitting}
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {payload.alternatives.some((a) => a.addFood) && onAddFood && (
                <p className="text-[10px] text-muted-foreground mt-3 leading-snug">
                  Tapping <span className="font-medium text-foreground">Add</span> closes this
                  pause and appends the item to your meal — you can re-log with a healthier mix.
                </p>
              )}
            </div>
          )}

          {/* Progressive disclosure: composition */}
          {payload.composition && payload.composition.length > 0 && (
            <DisclosureSection
              open={showComposition}
              onToggle={() => setShowComposition((o) => !o)}
              label="Why this grade?"
            >
              <div className="space-y-3 pt-2">
                {payload.composition.map((c) => (
                  <div key={c.food} className="text-xs">
                    <div className="font-medium text-foreground mb-1 capitalize">{c.food}</div>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {c.parts.map((p, i) => (
                        <li key={i} className="flex justify-between gap-3 tabular-nums">
                          <span>{p.name}</span>
                          <span>{p.grams} g</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </DisclosureSection>
          )}

          {/* Progressive disclosure: methodology */}
          {payload.methodology && (
            <DisclosureSection
              open={showMethodology}
              onToggle={() => setShowMethodology((o) => !o)}
              label="How this is calculated"
              icon={<BookOpen className="h-3 w-3" />}
            >
              <div className="text-[11px] text-muted-foreground leading-snug space-y-1 pt-2">
                <div>Grade · {payload.methodology.nutriScore}</div>
                <div>Processing · {payload.methodology.nova}</div>
                <div>Flags · {payload.methodology.whoTargets}</div>
              </div>
            </DisclosureSection>
          )}

          {/* Timer */}
          <div className="flex justify-center py-2">
            <CountdownTimer durationSeconds={15} onComplete={() => setTimerDone(true)} active={open} />
          </div>

          {/* Mood chips */}
          <div>
            <label className="block text-sm font-medium mb-2">
              How are you feeling?{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(mood === m ? "" : m)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    mood === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Justification */}
          <div>
            <label htmlFor="justification" className="block text-sm font-medium mb-2">
              Why are you choosing this?{" "}
              <span className="text-muted-foreground font-normal">
                (min {MIN_JUSTIFICATION_CHARS} characters)
              </span>
            </label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Being honest with yourself helps you notice patterns later…"
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end mt-1">
              <span
                className={`text-xs tabular-nums ${
                  justificationLen >= MIN_JUSTIFICATION_CHARS
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {justificationLen}/{MIN_JUSTIFICATION_CHARS}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <Button
            type="button"
            variant="default"
            onClick={() => handleClose(false)}
            disabled={submitting}
            className="flex-1"
          >
            Let me reconsider
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1"
          >
            {submitting
              ? "Logging…"
              : !timerDone
                ? "Waiting for pause…"
                : justificationLen < MIN_JUSTIFICATION_CHARS
                  ? `Type ${MIN_JUSTIFICATION_CHARS - justificationLen} more char${
                      MIN_JUSTIFICATION_CHARS - justificationLen === 1 ? "" : "s"
                    }`
                  : "Log meal anyway"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatTile({
  icon,
  label,
  value,
  prefix,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  prefix?: string
  tone: "ok" | "warn"
}) {
  return (
    <div
      className={`rounded-lg border px-2 py-3 ${
        tone === "warn" ? "border-accent/50 bg-accent/10" : "border-border bg-background"
      }`}
    >
      <div
        className={`flex items-center justify-center gap-1 text-xs ${
          tone === "warn" ? "text-accent-foreground" : "text-muted-foreground"
        }`}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-serif text-lg tabular-nums">
        {prefix}
        {value}
      </div>
    </div>
  )
}

function DisclosureSection({
  open,
  onToggle,
  label,
  icon,
  children,
}: {
  open: boolean
  onToggle: () => void
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-3 pb-3 border-t border-border">{children}</div>}
    </div>
  )
}
