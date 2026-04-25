import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import User from "@/lib/models/User"
import Meal from "@/lib/models/Meal"
import { getUserFromRequest } from "@/lib/auth"
import { DEFAULT_TZ, addDaysToDateKey, tzDayStart, tzToday } from "@/lib/time"

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

    const todayKey = tzToday(DEFAULT_TZ)
    const weekStartKey = addDaysToDateKey(todayKey, -6)
    const start = tzDayStart(weekStartKey, DEFAULT_TZ)

    const meals = await Meal.find({
      userId: user._id,
      timestamp: { $gte: start },
    })
      .sort({ timestamp: 1 })
      .lean()

    return NextResponse.json({
      meals: meals.map((m) => ({
        id: m._id.toString(),
        foodItems: m.foodItems,
        mealType: m.mealType,
        cost: m.cost,
        nutritionScore: m.nutritionScore,
        frictionTriggered: m.frictionTriggered,
        justification: m.justification,
        timestamp: m.timestamp,
      })),
      dailyBudget: Math.round(user.monthlyBudget / 30),
    })
  } catch (error) {
    console.error("[v0] week meals error:", error)
    return NextResponse.json({ error: "Failed to fetch week meals" }, { status: 500 })
  }
}
