import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import User from "@/lib/models/User"
import Meal from "@/lib/models/Meal"
import { getUserFromRequest } from "@/lib/auth"
import { DEFAULT_TZ, tzDayEnd, tzDayStart, tzToday } from "@/lib/time"
import { getMicronutrientTargets } from "@/lib/nutrition/micronutrientTargets"

function normalizeMealMacros(meal: {
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  sat_fat_g?: number
}) {
  const calories = Number(meal.calories || 0)
  const protein_g = Number(meal.protein_g || 0)
  let fat_g = Number(meal.fat_g || 0)
  let carbs_g = Number(meal.carbs_g || 0)

  // Backfill logic for legacy rows where carbs/fat were not stored yet.
  if (fat_g <= 0 && (meal.sat_fat_g || 0) > 0) {
    fat_g = Math.max(Number(meal.sat_fat_g || 0), Number(meal.sat_fat_g || 0) * 2.5)
  }
  if (carbs_g <= 0 && calories > 0) {
    carbs_g = Math.max(0, (calories - (protein_g * 4 + fat_g * 9)) / 4)
  }

  return {
    carbs_g: Math.round(carbs_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
  }
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

    const todayKey = tzToday(DEFAULT_TZ)
    const start = tzDayStart(todayKey, DEFAULT_TZ)
    const end = tzDayEnd(todayKey, DEFAULT_TZ)

    const meals = await Meal.find({
      userId: user._id,
      timestamp: { $gte: start, $lte: end },
    })
      .sort({ timestamp: -1 })
      .lean()

    const mealsNormalized = meals.map((m) => ({
      ...m,
      ...normalizeMealMacros(m),
    }))

    const totalScore = mealsNormalized.reduce((s, m) => s + m.nutritionScore, 0)
    const totalSpent = mealsNormalized.reduce((s, m) => s + m.cost, 0)
    const totalProtein = mealsNormalized.reduce((s, m) => s + (m.protein_g || 0), 0)
    const totalCalories = mealsNormalized.reduce((s, m) => s + (m.calories || 0), 0)
    const totalCarbs = mealsNormalized.reduce((s, m) => s + (m.carbs_g || 0), 0)
    const totalFat = mealsNormalized.reduce((s, m) => s + (m.fat_g || 0), 0)
    const totalVitaminC = mealsNormalized.reduce((s, m) => s + (m.vitamin_c_mg || 0), 0)
    const totalIron = mealsNormalized.reduce((s, m) => s + (m.iron_mg || 0), 0)
    const totalCalcium = mealsNormalized.reduce((s, m) => s + (m.calcium_mg || 0), 0)
    const totalPotassium = mealsNormalized.reduce((s, m) => s + (m.potassium_mg || 0), 0)
    const frictionCount = mealsNormalized.filter((m) => m.frictionTriggered).length

    const dailyBudget = Math.round(user.monthlyBudget / 30)
    const micronutrientTargets = getMicronutrientTargets({
      age: user.age,
      biologicalSex: user.biologicalSex,
      weightKg: user.weightKg,
      heightCm: user.heightCm,
    })

    return NextResponse.json({
      meals: mealsNormalized.map((m) => ({
        id: m._id.toString(),
        foodItems: m.foodItems,
        mealType: m.mealType,
        portionSize: m.portionSize,
        cost: m.cost,
        nutritionScore: m.nutritionScore,
        nutriGrade: m.nutriGrade,
        novaGroup: m.novaGroup,
        protein_g: m.protein_g,
        calories: m.calories,
        carbs_g: m.carbs_g,
        fat_g: m.fat_g,
        vitamin_c_mg: m.vitamin_c_mg,
        iron_mg: m.iron_mg,
        calcium_mg: m.calcium_mg,
        potassium_mg: m.potassium_mg,
        fiber_g: m.fiber_g,
        sat_fat_g: m.sat_fat_g,
        sugars_g: m.sugars_g,
        sodium_mg: m.sodium_mg,
        source: m.source,
        sourceBreakdown: m.sourceBreakdown,
        matchConfidence: m.matchConfidence,
        frictionTriggered: m.frictionTriggered,
        frictionReason: m.frictionReason,
        frictionTriggerType: m.frictionTriggerType,
        justification: m.justification,
        mood: m.mood,
        timestamp: m.timestamp,
      })),
      totals: {
        score: totalScore,
        spent: totalSpent,
        protein_g: Math.round(totalProtein * 10) / 10,
        calories: totalCalories,
        carbs_g: Math.round(totalCarbs * 10) / 10,
        fat_g: Math.round(totalFat * 10) / 10,
        vitamin_c_mg: Math.round(totalVitaminC * 10) / 10,
        iron_mg: Math.round(totalIron * 10) / 10,
        calcium_mg: Math.round(totalCalcium * 10) / 10,
        potassium_mg: Math.round(totalPotassium * 10) / 10,
        frictionCount,
        mealsCount: meals.length,
      },
      dailyBudget,
      monthlyBudget: user.monthlyBudget,
      micronutrientTargets,
    })
  } catch (error) {
    console.error("[v0] today meals error:", error)
    return NextResponse.json({ error: "Failed to fetch meals" }, { status: 500 })
  }
}
