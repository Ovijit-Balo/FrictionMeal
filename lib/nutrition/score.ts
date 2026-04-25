import type { FoodItem } from "./types"
import { computeNutriScore, gradeToPoints, type NutriGrade, type NutriScoreResult } from "./nutriScore"
import { novaAdjustment, type NovaGroup } from "./nova"
import { evaluateWhoFlags, type WhoFlag } from "./whoTargets"

/**
 * Composite meal scorer.
 *
 * Replaces the previous hand-picked heuristics with a combination of two
 * peer-reviewed, government-adopted frameworks plus WHO targets:
 *
 *   Nutri-Score  (FSA-NPS / Santé Publique France 2017)  — per-meal grade
 *   NOVA          (Monteiro et al. 2009; FAO/PAHO 2019)  — processing penalty
 *   WHO / EFSA targets  — flags for coaching (sodium, sat fat, sugars, …)
 *
 * The exposed 0-20 score is derived as:
 *   gradeToPoints(grade)  +  novaAdjustment(nova)
 * clamped to [0, 20]. Every point is therefore traceable to a published
 * algorithm, not to an arbitrary weight chosen by the developer.
 */

export interface MealAssessment {
  /** 0-20 final score (backwards-compatible with the existing UI) */
  score: number
  /** Nutri-Score letter grade A-E */
  grade: NutriGrade
  /** NOVA classification 1-4 */
  novaGroup: NovaGroup
  /** Raw FSA-NPS points (negative better) */
  nutriScorePoints: number
  /** Per-100 g density used to grade the meal */
  per100g: {
    energy_kcal: number
    protein_g: number
    fiber_g: number
    sat_fat_g: number
    sugars_g: number
    sodium_mg: number
    fruit_veg_legume_pct: number
  }
  /** Scaled-to-meal totals (used by WHO flag evaluator) */
  totals: {
    weight_g: number
    energy_kcal: number
    protein_g: number
    fiber_g: number
    carbs_g: number
    fat_g: number
    vitamin_c_mg: number
    iron_mg: number
    calcium_mg: number
    potassium_mg: number
    sat_fat_g: number
    sugars_g: number
    sodium_mg: number
    fruit_veg_legume_g: number
  }
  whoFlags: WhoFlag[]
  breakdown: NutriScoreResult["breakdown"]
  methodology: {
    nutriScore: string
    nova: string
    whoTargets: string
  }
  isBeverage: boolean
}

const METHODOLOGY = {
  nutriScore:
    "Nutri-Score FSA-NPS (Julia & Hercberg, WHO Public Health Panorama 2017; Rayner 2005 UK FSA NPM)",
  nova: "NOVA classification (Monteiro et al. 2009; endorsed by FAO/PAHO 2019)",
  whoTargets: "WHO 2012 sodium, 2015 sugars, 2023 sat-fat guidelines; EFSA 2010 fibre; WHO/FAO 2003 fruit-and-veg",
}

function totalWeight(foods: FoodItem[], portion: number): number {
  const sum = foods.reduce((s, f) => s + (f.serving_g || 100) * (f.quantity ?? 1), 0)
  return Math.max(1, sum * portion)
}

export function assessMeal(foods: FoodItem[], portionSize: number): MealAssessment {
  const defaultAssessment: MealAssessment = {
    score: 0,
    grade: "E",
    novaGroup: 1,
    nutriScorePoints: 0,
    per100g: {
      energy_kcal: 0,
      protein_g: 0,
      fiber_g: 0,
      sat_fat_g: 0,
      sugars_g: 0,
      sodium_mg: 0,
      fruit_veg_legume_pct: 0,
    },
    totals: {
      weight_g: 0,
      energy_kcal: 0,
      protein_g: 0,
      fiber_g: 0,
      carbs_g: 0,
      fat_g: 0,
      vitamin_c_mg: 0,
      iron_mg: 0,
      calcium_mg: 0,
      potassium_mg: 0,
      sat_fat_g: 0,
      sugars_g: 0,
      sodium_mg: 0,
      fruit_veg_legume_g: 0,
    },
    whoFlags: [],
    breakdown: {
      negative: { energy: 0, satFat: 0, sugars: 0, sodium: 0, total: 0 },
      positive: { fruitVeg: 0, fiber: 0, protein: 0, total: 0, proteinCounted: true },
    },
    methodology: METHODOLOGY,
    isBeverage: false,
  }

  if (foods.length === 0) return defaultAssessment

  // Weight-based aggregation. Each item contributes serving_g × portionSize.
  const weight_g = totalWeight(foods, portionSize)

  let energy_kcal = 0
  let protein_g = 0
  let fiber_g = 0
  let carbs_g = 0
  let fat_g = 0
  let vitamin_c_mg = 0
  let iron_mg = 0
  let calcium_mg = 0
  let potassium_mg = 0
  let sat_fat_g = 0
  let sugars_g = 0
  let sodium_mg = 0
  let fruit_veg_legume_g = 0
  let maxNova: NovaGroup = 1
  let beverageWeight = 0

  for (const f of foods) {
    const q = f.quantity ?? 1
    const multiplier = portionSize * q
    const w = (f.serving_g || 100) * multiplier
    energy_kcal += (f.calories || 0) * multiplier
    protein_g += (f.protein_g || 0) * multiplier
    fiber_g += (f.fiber_g || 0) * multiplier
    carbs_g += (f.carbs_g || 0) * multiplier
    fat_g += (f.fat_g || 0) * multiplier
    vitamin_c_mg += (f.vitamin_c_mg || 0) * multiplier
    iron_mg += (f.iron_mg || 0) * multiplier
    calcium_mg += (f.calcium_mg || 0) * multiplier
    potassium_mg += (f.potassium_mg || 0) * multiplier
    sat_fat_g += (f.sat_fat_g || 0) * multiplier
    sugars_g += (f.sugars_g || 0) * multiplier
    sodium_mg += (f.sodium_mg || 0) * multiplier
    fruit_veg_legume_g += (w * (f.fruit_veg_legume_pct || 0)) / 100
    if ((f.novaGroup || 1) > maxNova) maxNova = f.novaGroup
    if (f.isBeverage) beverageWeight += w
  }

  const per100 = (n: number) => (n * 100) / weight_g
  const per100g = {
    energy_kcal: per100(energy_kcal),
    protein_g: per100(protein_g),
    fiber_g: per100(fiber_g),
    sat_fat_g: per100(sat_fat_g),
    sugars_g: per100(sugars_g),
    sodium_mg: per100(sodium_mg),
    fruit_veg_legume_pct: (fruit_veg_legume_g / weight_g) * 100,
  }

  // Treat the meal as a beverage only if every contributing item is a drink
  const isBeverage = beverageWeight > 0 && beverageWeight >= weight_g * 0.95

  const nutri = computeNutriScore({ ...per100g, isBeverage })
  const base = gradeToPoints(nutri.grade)
  const adjusted = base + novaAdjustment(maxNova)
  const score = Math.max(0, Math.min(20, Math.round(adjusted)))

  const totals = {
    weight_g,
    energy_kcal,
    protein_g,
    fiber_g,
    carbs_g,
    fat_g,
    vitamin_c_mg,
    iron_mg,
    calcium_mg,
    potassium_mg,
    sat_fat_g,
    sugars_g,
    sodium_mg,
    fruit_veg_legume_g,
  }

  const whoFlags = evaluateWhoFlags(totals)

  return {
    score,
    grade: nutri.grade,
    novaGroup: maxNova,
    nutriScorePoints: nutri.points,
    per100g,
    totals,
    whoFlags,
    breakdown: nutri.breakdown,
    methodology: METHODOLOGY,
    isBeverage,
  }
}

/**
 * Backwards-compatible entry point used across the codebase.
 * Delegates to the Nutri-Score + NOVA composite.
 */
export function calculateMealScore(foodItems: FoodItem[], portionSize: number): number {
  return assessMeal(foodItems, portionSize).score
}

export function aggregateMealNutrition(foodItems: FoodItem[], portionSize: number) {
  let protein_g = 0
  let calories = 0
  let fiber_g = 0
  let carbs_g = 0
  let fat_g = 0
  let vitamin_c_mg = 0
  let iron_mg = 0
  let calcium_mg = 0
  let potassium_mg = 0
  let confidenceWeighted = 0
  let confidenceWeight = 0

  for (const item of foodItems) {
    const q = item.quantity ?? 1
    protein_g += (item.protein_g || 0) * q
    calories += (item.calories || 0) * q
    fiber_g += (item.fiber_g || 0) * q
    carbs_g += (item.carbs_g || 0) * q
    fat_g += (item.fat_g || 0) * q
    vitamin_c_mg += (item.vitamin_c_mg || 0) * q
    iron_mg += (item.iron_mg || 0) * q
    calcium_mg += (item.calcium_mg || 0) * q
    potassium_mg += (item.potassium_mg || 0) * q
    confidenceWeighted += (item.confidence ?? 0.5) * q
    confidenceWeight += q
  }

  return {
    protein_g: Math.round(protein_g * portionSize * 10) / 10,
    calories: Math.round(calories * portionSize),
    fiber_g: Math.round(fiber_g * portionSize * 10) / 10,
    carbs_g: Math.round(carbs_g * portionSize * 10) / 10,
    fat_g: Math.round(fat_g * portionSize * 10) / 10,
    vitamin_c_mg: Math.round(vitamin_c_mg * portionSize * 10) / 10,
    iron_mg: Math.round(iron_mg * portionSize * 10) / 10,
    calcium_mg: Math.round(calcium_mg * portionSize * 10) / 10,
    potassium_mg: Math.round(potassium_mg * portionSize * 10) / 10,
    confidence: confidenceWeight > 0 ? confidenceWeighted / confidenceWeight : 0,
  }
}
