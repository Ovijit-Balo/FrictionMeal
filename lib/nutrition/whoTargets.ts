/**
 * WHO / FAO / EFSA daily nutrient targets used to flag a meal for coaching.
 *
 * We apply single-meal thresholds at ~1/3 of the daily target (typical
 * three-meal split) so a single meal does not trip the flag on the basis
 * of a daily number. This is a common clinical convention; it is not
 * itself a clinical instrument.
 *
 * Sources:
 *   - WHO (2023). "Saturated fatty acid and trans-fatty acid intake for
 *     adults and children: WHO guideline."  →  sat fat < 10 % total
 *     energy (≈ 22 g on a 2000 kcal diet).
 *   - WHO (2015). "Guideline: Sugars intake for adults and children."  →
 *     free sugars < 10 % total energy (≈ 50 g/day; conditional < 5 %).
 *   - WHO (2012). "Guideline: Sodium intake for adults and children."  →
 *     sodium < 2000 mg/day (≈ 5 g salt).
 *   - EFSA (2010). "Scientific Opinion on Dietary Reference Values for
 *     carbohydrates and dietary fibre."  →  25 g fibre/day (adults).
 *   - WHO/FAO (2003). "Diet, nutrition and the prevention of chronic
 *     diseases."  →  ≥ 400 g fruit & vegetables/day.
 *   - IOM/FNB (2005); WHO/FAO/UNU (2007). "Protein and amino acid
 *     requirements in human nutrition."  →  0.83 g protein/kg body
 *     weight/day RDA.
 */

export const WHO_TARGETS = {
  saturatedFat_g_per_day: 22, // 10% of 2000 kcal / 9 kcal/g
  freeSugars_g_per_day: 50, // 10% of 2000 kcal / 4 kcal/g
  sodium_mg_per_day: 2000,
  fiber_g_per_day: 25,
  fruitsVeg_g_per_day: 400,
  protein_g_per_day: 50, // ~0.83 g/kg × 60 kg reference
  vitaminC_mg_per_day: 75, // WHO/FAO RNI range baseline
  iron_mg_per_day: 18, // simplified adult target for coaching
  calcium_mg_per_day: 1000, // common adult reference intake
  potassium_mg_per_day: 3500, // WHO potassium guideline
} as const

export const WHO_PER_MEAL = {
  saturatedFat_g: WHO_TARGETS.saturatedFat_g_per_day / 3,
  freeSugars_g: WHO_TARGETS.freeSugars_g_per_day / 3,
  sodium_mg: WHO_TARGETS.sodium_mg_per_day / 3,
  fiber_g_min: WHO_TARGETS.fiber_g_per_day / 3,
  protein_g_min: WHO_TARGETS.protein_g_per_day / 3,
} as const

export interface WhoFlag {
  key: "sodium" | "satFat" | "sugars" | "lowFiber" | "lowProtein" | "lowFruitVeg"
  severity: "info" | "warn"
  message: string
  citation: string
}

export interface MealNutrientTotals {
  sat_fat_g: number
  sugars_g: number
  sodium_mg: number
  fiber_g: number
  protein_g: number
  fruit_veg_legume_g: number
}

export function evaluateWhoFlags(totals: MealNutrientTotals): WhoFlag[] {
  const flags: WhoFlag[] = []

  if (totals.sodium_mg > WHO_PER_MEAL.sodium_mg) {
    flags.push({
      key: "sodium",
      severity: "warn",
      message: `High sodium: ${Math.round(totals.sodium_mg)} mg vs WHO ${Math.round(WHO_PER_MEAL.sodium_mg)} mg/meal target`,
      citation: "WHO 2012 sodium intake guideline (< 2 g Na/day)",
    })
  }

  if (totals.sat_fat_g > WHO_PER_MEAL.saturatedFat_g) {
    flags.push({
      key: "satFat",
      severity: "warn",
      message: `High saturated fat: ${totals.sat_fat_g.toFixed(1)} g vs ${WHO_PER_MEAL.saturatedFat_g.toFixed(1)} g/meal target`,
      citation: "WHO 2023 saturated fat guideline (< 10 % energy)",
    })
  }

  if (totals.sugars_g > WHO_PER_MEAL.freeSugars_g) {
    flags.push({
      key: "sugars",
      severity: "warn",
      message: `High sugars: ${totals.sugars_g.toFixed(1)} g vs ${WHO_PER_MEAL.freeSugars_g.toFixed(1)} g/meal target`,
      citation: "WHO 2015 free sugars guideline (< 10 % energy)",
    })
  }

  if (totals.fiber_g < WHO_PER_MEAL.fiber_g_min) {
    flags.push({
      key: "lowFiber",
      severity: "info",
      message: `Low fiber: ${totals.fiber_g.toFixed(1)} g vs ${WHO_PER_MEAL.fiber_g_min.toFixed(1)} g/meal goal`,
      citation: "EFSA 2010 (25 g fibre/day)",
    })
  }

  if (totals.protein_g < WHO_PER_MEAL.protein_g_min) {
    flags.push({
      key: "lowProtein",
      severity: "info",
      message: `Low protein: ${totals.protein_g.toFixed(1)} g vs ${WHO_PER_MEAL.protein_g_min.toFixed(1)} g/meal goal`,
      citation: "WHO/FAO/UNU 2007 (0.83 g/kg/day RDA)",
    })
  }

  if (totals.fruit_veg_legume_g < WHO_TARGETS.fruitsVeg_g_per_day / 3) {
    flags.push({
      key: "lowFruitVeg",
      severity: "info",
      message: `Few fruits / vegetables / legumes in this meal`,
      citation: "WHO/FAO 2003 (≥ 400 g fruit & veg/day)",
    })
  }

  return flags
}
