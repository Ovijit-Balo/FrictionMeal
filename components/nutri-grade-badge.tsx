"use client"

import { cn } from "@/lib/utils"

export type NutriGrade = "A" | "B" | "C" | "D" | "E"

const GRADE_STYLES: Record<NutriGrade, string> = {
  A: "bg-primary/15 text-primary border-primary/30",
  B: "bg-primary/10 text-primary border-primary/20",
  C: "bg-accent/30 text-accent-foreground border-accent/40",
  D: "bg-destructive/10 text-destructive border-destructive/20",
  E: "bg-destructive/20 text-destructive border-destructive/30",
}

export function NutriGradeBadge({
  grade,
  size = "sm",
  className,
}: {
  grade: NutriGrade
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const sizeCls =
    size === "lg"
      ? "h-10 w-10 text-lg"
      : size === "md"
        ? "h-8 w-8 text-sm"
        : "h-6 w-6 text-xs"

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-serif font-semibold tabular-nums",
        GRADE_STYLES[grade],
        sizeCls,
        className,
      )}
      title={`Nutri-Score ${grade}`}
      aria-label={`Nutri-Score ${grade}`}
    >
      {grade}
    </span>
  )
}

export function NovaBadge({
  group,
  className,
}: {
  group: 1 | 2 | 3 | 4
  className?: string
}) {
  const tone =
    group === 4
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : group === 3
        ? "bg-accent/30 text-accent-foreground border-accent/40"
        : "bg-muted text-muted-foreground border-border"
  const label =
    group === 4 ? "Ultra-processed" : group === 3 ? "Processed" : group === 2 ? "Culinary" : "Whole food"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tone,
        className,
      )}
      title={`NOVA group ${group}`}
    >
      NOVA {group} · {label}
    </span>
  )
}
