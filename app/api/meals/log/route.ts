import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import User from "@/lib/models/User"
import Meal from "@/lib/models/Meal"
import DailySummary from "@/lib/models/DailySummary"
import { getUserFromRequest } from "@/lib/auth"
import {
  isLikelySameFood,
  lookupMultiple,
  parseFoodItems,
  suggestLocalMatchesForQueries,
} from "@/lib/nutrition/lookup"
import { assessMeal, aggregateMealNutrition } from "@/lib/nutrition/score"
import { evaluateSmartPause } from "@/lib/frictionEngine"
import { suggestAlternatives } from "@/lib/nutrition/alternatives"
import { DEFAULT_TZ, tzDayEnd, tzDayStart, tzLocalHour, tzToday } from "@/lib/time"

/**
 * Meal logging with Smart Pause Engine.
 *
 * Flow:
 *  1. Client POSTs meal WITHOUT justification.
 *  2. Backend calculates nutrition score + checks Smart Pause trigger.
 *  3. If pause required → return 200 { pauseRequired: true, ... } WITHOUT saving.
 *  4. Client shows pause modal, collects justification, re-POSTs with justification.
 *  5. Backend saves meal + updates daily summary.
 */
export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      foodItemsInput, // raw string OR array of strings
      portionSize,
      cost,
      mealType,
      photoUrl,
      justification,
      mood,
    } = body

    if (!foodItemsInput || !portionSize || cost === undefined || !mealType) {
      return NextResponse.json(
        { error: "foodItemsInput, portionSize, cost, and mealType are required" },
        { status: 400 },
      )
    }

    const queries: string[] = Array.isArray(foodItemsInput)
      ? foodItemsInput.filter((s: unknown): s is string => typeof s === "string" && s.length > 0)
      : parseFoodItems(String(foodItemsInput))

    if (queries.length === 0) {
      return NextResponse.json({ error: "No food items provided" }, { status: 400 })
    }

    await connectDB()

    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Lookup nutrition for each food item
    const foods = await lookupMultiple(queries)

    // For unrecognized items, still include them as text so meal isn't lost
    const recognizedNames = foods.map((f) => f.name)
    const unrecognized = queries.filter(
      (q) => !recognizedNames.some((n) => isLikelySameFood(q, n)),
    )
    const suggestionsByQuery = suggestLocalMatchesForQueries(unrecognized)

    const assessment = assessMeal(foods, portionSize)
    const mealScore = assessment.score
    const aggregated = aggregateMealNutrition(foods, portionSize)
    const primarySource = foods[0]?.source || "local"
    const sourceBreakdown = foods.reduce<Record<string, number>>((acc, f) => {
      const k = f.source || "local"
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})

    // Compute today's score so far (anchored to the user's local day).
    const todayKey = tzToday(DEFAULT_TZ)
    const todayStart = tzDayStart(todayKey, DEFAULT_TZ)
    const todayEnd = tzDayEnd(todayKey, DEFAULT_TZ)
    const todayMeals = await Meal.find({
      userId: user._id,
      timestamp: { $gte: todayStart, $lte: todayEnd },
    })
    const todayScoreSoFar = todayMeals.reduce((sum, m) => sum + m.nutritionScore, 0)
    const spentToday = todayMeals.reduce((sum, m) => sum + (m.cost || 0), 0)

    const dailyBudget = user.monthlyBudget / 30

    const pause = evaluateSmartPause({
      todayScore: todayScoreSoFar,
      mealCost: cost,
      dailyBudget,
      mealScore,
      mealsToday: todayMeals.length,
      localHour: tzLocalHour(new Date(), DEFAULT_TZ),
      spentToday,
    })

    // Phase 1: If pause required AND no justification yet → return pause prompt
    if (pause.shouldPause && !justification) {
      const alternatives = suggestAlternatives(foods, assessment.whoFlags, {
        pauseReason: pause.reason,
        mealCost: cost,
        dailyBudget,
      })

      // Collect ingredient-level breakdowns for dishes that have one.
      // Used by the modal to explain *why* a meal scored poorly without
      // changing any scoring math.
      const composition = foods
        .filter((f) => f.composition && f.composition.length > 0)
        .map((f) => ({
          food: f.name,
          parts: f.composition!,
        }))

      return NextResponse.json({
        pauseRequired: true,
        reason: pause.reason,
        rationale: pause.rationale,
        triggerType: pause.triggerType,
        isOverBudget: pause.isOverBudget,
        isMealExpensive: pause.isMealExpensive,
        isMealUnhealthy: pause.isMealUnhealthy,
        todayScore: todayScoreSoFar,
        dailyBudget: Math.round(dailyBudget),
        spentToday: Math.round(spentToday),
        mealCost: cost,
        mealScore,
        grade: assessment.grade,
        novaGroup: assessment.novaGroup,
        whoFlags: assessment.whoFlags,
        methodology: assessment.methodology,
        alternatives,
        composition,
        preview: {
          foodItems: queries,
          protein_g: aggregated.protein_g,
          calories: aggregated.calories,
          fiber_g: aggregated.fiber_g,
          carbs_g: aggregated.carbs_g,
          fat_g: aggregated.fat_g,
          vitamin_c_mg: aggregated.vitamin_c_mg,
          iron_mg: aggregated.iron_mg,
          calcium_mg: aggregated.calcium_mg,
          potassium_mg: aggregated.potassium_mg,
          confidence: aggregated.confidence,
        },
        unrecognized,
        suggestionsByQuery,
      })
    }

    // Phase 2: Save the meal
    if (pause.shouldPause && (!justification || justification.trim().length < 15)) {
      return NextResponse.json(
        { error: "Justification (min 15 characters) required for this meal" },
        { status: 400 },
      )
    }

    const meal = await Meal.create({
      userId: user._id,
      foodItems: queries,
      portionSize,
      cost,
      mealType,
      photoUrl,
      nutritionScore: mealScore,
      nutriGrade: assessment.grade,
      novaGroup: assessment.novaGroup,
      protein_g: aggregated.protein_g,
      calories: aggregated.calories,
      fiber_g: aggregated.fiber_g,
      carbs_g: aggregated.carbs_g,
      fat_g: aggregated.fat_g,
      vitamin_c_mg: aggregated.vitamin_c_mg,
      iron_mg: aggregated.iron_mg,
      calcium_mg: aggregated.calcium_mg,
      potassium_mg: aggregated.potassium_mg,
      sat_fat_g: Math.round(assessment.totals.sat_fat_g * 10) / 10,
      sugars_g: Math.round(assessment.totals.sugars_g * 10) / 10,
      sodium_mg: Math.round(assessment.totals.sodium_mg),
      source: primarySource,
      sourceBreakdown,
      matchConfidence: Math.round((aggregated.confidence || 0) * 100) / 100,
      frictionTriggered: pause.shouldPause,
      frictionReason: pause.reason,
      frictionTriggerType: pause.triggerType,
      justification: justification?.trim(),
      mood: mood?.trim(),
      timestamp: new Date(),
    })

    // Upsert daily summary keyed on the user's *local* day boundary
    // (stored as the UTC instant of local midnight).
    await DailySummary.findOneAndUpdate(
      { userId: user._id, date: todayStart },
      {
        $inc: {
          totalNutritionScore: mealScore,
          totalSpent: cost,
          mealsCount: 1,
          frictionCount: pause.shouldPause ? 1 : 0,
          proteinTotal_g: aggregated.protein_g,
        },
        $setOnInsert: { userId: user._id, date: todayStart },
      },
      { upsert: true, new: true },
    )

    return NextResponse.json({
      success: true,
      meal: {
        id: meal._id.toString(),
        foodItems: meal.foodItems,
        mealType: meal.mealType,
        portionSize: meal.portionSize,
        cost: meal.cost,
        nutritionScore: meal.nutritionScore,
        nutriGrade: meal.nutriGrade,
        novaGroup: meal.novaGroup,
        protein_g: meal.protein_g,
        calories: meal.calories,
        fiber_g: meal.fiber_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        vitamin_c_mg: meal.vitamin_c_mg,
        iron_mg: meal.iron_mg,
        calcium_mg: meal.calcium_mg,
        potassium_mg: meal.potassium_mg,
        sat_fat_g: meal.sat_fat_g,
        sugars_g: meal.sugars_g,
        sodium_mg: meal.sodium_mg,
        source: meal.source,
        sourceBreakdown: meal.sourceBreakdown,
        matchConfidence: meal.matchConfidence,
        frictionTriggered: meal.frictionTriggered,
        frictionReason: meal.frictionReason,
        frictionTriggerType: meal.frictionTriggerType,
        justification: meal.justification,
        timestamp: meal.timestamp,
      },
      assessment: {
        grade: assessment.grade,
        novaGroup: assessment.novaGroup,
        nutriScorePoints: assessment.nutriScorePoints,
        whoFlags: assessment.whoFlags,
        methodology: assessment.methodology,
      },
      unrecognized,
      suggestionsByQuery,
      lookupDiagnostics: foods.map((f) => ({
        input: f.name,
        source: f.source,
        confidence: f.confidence ?? null,
        matchNote: f.matchNote ?? null,
      })),
    })
  } catch (error) {
    console.error("[v0] meal log error:", error)
    return NextResponse.json({ error: "Failed to log meal" }, { status: 500 })
  }
}
