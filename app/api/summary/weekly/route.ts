import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import User from "@/lib/models/User"
import Meal from "@/lib/models/Meal"
import { getUserFromRequest } from "@/lib/auth"
import {
  DEFAULT_TZ,
  addDaysToDateKey,
  dayOfWeekLabel,
  tzDateKey,
  tzDayStart,
  tzToday,
} from "@/lib/time"

interface DayBucket {
  date: string
  dayLabel: string
  score: number
  spent: number
  meals: number
  frictionCount: number
}

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()

    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dailyBudget = user.monthlyBudget / 30

    // Build the 7 calendar-date keys (oldest first) in the user's timezone.
    const todayKey = tzToday(DEFAULT_TZ)
    const dateKeys: string[] = []
    for (let i = 6; i >= 0; i--) dateKeys.push(addDaysToDateKey(todayKey, -i))

    const start = tzDayStart(dateKeys[0], DEFAULT_TZ)

    const meals = await Meal.find({
      userId: user._id,
      timestamp: { $gte: start },
    })
      .sort({ timestamp: 1 })
      .lean()

    const buckets: DayBucket[] = dateKeys.map((date) => ({
      date,
      dayLabel: dayOfWeekLabel(date),
      score: 0,
      spent: 0,
      meals: 0,
      frictionCount: 0,
    }))

    for (const m of meals) {
      // Bucket meals by their local-timezone calendar day — the bucket
      // keys and the meal keys must agree on the *same* timezone.
      const key = tzDateKey(new Date(m.timestamp), DEFAULT_TZ)
      const bucket = buckets.find((b) => b.date === key)
      if (bucket) {
        bucket.score += m.nutritionScore
        bucket.spent += m.cost
        bucket.meals += 1
        if (m.frictionTriggered) bucket.frictionCount += 1
      }
    }

    // Generate alerts
    const alerts: string[] = []
    const lowDays = buckets.filter((b) => b.meals > 0 && b.score < 15).length
    if (lowDays >= 3) alerts.push(`${lowDays} low-nutrition days this week`)

    const overBudgetDays = buckets.filter((b) => b.spent > dailyBudget).length
    if (overBudgetDays >= 2) alerts.push(`${overBudgetDays} days over daily budget`)

    const totalFriction = buckets.reduce((s, b) => s + b.frictionCount, 0)
    if (totalFriction >= 3) alerts.push(`${totalFriction} Smart Pauses triggered — keep reflecting`)

    // Highest spending day
    const maxSpent = [...buckets].sort((a, b) => b.spent - a.spent)[0]
    if (maxSpent && maxSpent.spent > 0) {
      alerts.push(`${maxSpent.dayLabel} is your highest-spending day (৳${Math.round(maxSpent.spent)})`)
    }

    // Pattern: justifications on friction meals
    const frictionMeals = meals.filter((m) => m.frictionTriggered && m.justification)
    const stressWords = ["stress", "tired", "bored", "sad", "anxious", "busy"]
    const stressCount = frictionMeals.filter((m) =>
      stressWords.some((w) => m.justification?.toLowerCase().includes(w)),
    ).length
    if (stressCount >= 2) {
      alerts.push(`You often choose paused meals when stressed or tired (${stressCount} times)`)
    }

    // Tips
    const tips: string[] = []
    const avgProteinMeal = meals.length
      ? meals.reduce((s, m) => s + (m.protein_g || 0), 0) / meals.length
      : 0
    if (avgProteinMeal < 12) tips.push("Try adding a boiled egg or dal to meals — easy protein boost")
    if (overBudgetDays >= 2) tips.push("Meal-prep on Sundays to cut weekday spending")
    if (totalFriction === 0 && meals.length > 0) tips.push("Great week — you stayed on track")

    return NextResponse.json({
      days: buckets,
      dailyBudget: Math.round(dailyBudget),
      totals: {
        score: buckets.reduce((s, b) => s + b.score, 0),
        spent: buckets.reduce((s, b) => s + b.spent, 0),
        meals: buckets.reduce((s, b) => s + b.meals, 0),
        frictionCount: totalFriction,
      },
      alerts,
      tips,
      frictionJustifications: frictionMeals.slice(-5).map((m) => ({
        foodItems: m.foodItems,
        cost: m.cost,
        justification: m.justification,
        timestamp: m.timestamp,
      })),
    })
  } catch (error) {
    console.error("[v0] weekly summary error:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}
