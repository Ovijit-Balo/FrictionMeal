"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Wallet } from "lucide-react"

interface BudgetProgressBarProps {
  spent: number
  dailyBudget: number
}

export function BudgetProgressBar({ spent, dailyBudget }: BudgetProgressBarProps) {
  const pct = dailyBudget > 0 ? Math.min(100, (spent / dailyBudget) * 100) : 0
  const over = spent > dailyBudget
  const tone = pct >= 80 ? "warn" : pct >= 60 ? "caution" : "ok"

  const barColor =
    tone === "warn" ? "bg-destructive" : tone === "caution" ? "bg-accent" : "bg-primary"

  const remaining = Math.max(0, dailyBudget - spent)

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            Today&apos;s budget
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-serif text-3xl tabular-nums">৳{Math.round(spent)}</span>
            <span className="text-muted-foreground text-sm">/ ৳{Math.round(dailyBudget)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {over ? "Over by" : "Remaining"}
          </div>
          <div
            className={cn(
              "font-medium tabular-nums",
              over ? "text-destructive" : "text-foreground",
            )}
          >
            ৳{Math.round(Math.abs(over ? spent - dailyBudget : remaining))}
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
    </Card>
  )
}
