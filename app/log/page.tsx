import { AppShell } from "@/components/app-shell"
import { MealLogger } from "@/components/meal-logger"

export default function LogPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="font-serif text-3xl md:text-4xl text-balance">Log a meal</h1>
          <p className="text-muted-foreground mt-1 text-pretty">
            We&apos;ll check your day&apos;s nutrition and budget — if things are off-track, the
            Smart Pause Engine will gently interrupt.
          </p>
        </header>
        <MealLogger />
      </div>
    </AppShell>
  )
}
