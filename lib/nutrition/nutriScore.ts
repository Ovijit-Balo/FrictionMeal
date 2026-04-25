/**
 * Nutri-Score implementation (FSA-NPS / Santé Publique France 2017).
 *
 * The algorithm is the official front-of-pack nutrition label adopted by
 * France (2017), Belgium, Germany, Spain, the Netherlands, Luxembourg and
 * Switzerland. It is peer-reviewed and derived from the UK FSA Nutrient
 * Profiling Model (Rayner et al., 2005).
 *
 * References:
 *   - Julia C, Hercberg S. (2017). "Development of a new front-of-pack
 *     nutrition label in France: the five-colour Nutri-Score." Public
 *     Health Panorama 3(4):712-725. WHO-Euro.
 *   - Rayner M, Scarborough P, Stockley L (2005). "Nutrient profiles:
 *     further refinement and testing of model SSCg3d." FSA, London.
 *   - Santé Publique France (2022). "Nutri-Score Scientific Committee
 *     Report - Update of the algorithm for solid foods."
 *
 * This file implements the 2017 algorithm (most-cited, used by all current
 * adopting countries). Thresholds are per 100 g of product.
 */

export type NutriGrade = "A" | "B" | "C" | "D" | "E"

export interface NutriScoreInput {
  /** per 100 g of product */
  energy_kcal: number
  /** per 100 g */
  sat_fat_g: number
  /** total sugars per 100 g */
  sugars_g: number
  /** per 100 g */
  sodium_mg: number
  /** per 100 g */
  fiber_g: number
  /** per 100 g */
  protein_g: number
  /** 0..100 — weight-% of fruits/vegetables/legumes/nuts */
  fruit_veg_legume_pct: number
  /** drinks use a different grade scale */
  isBeverage?: boolean
}

export interface NutriScoreResult {
  /** FSA-NPS numeric score (higher = less healthy). Range roughly -15..+40 */
  points: number
  grade: NutriGrade
  /** Per-component breakdown for transparency */
  breakdown: {
    negative: {
      energy: number
      satFat: number
      sugars: number
      sodium: number
      total: number
    }
    positive: {
      fruitVeg: number
      fiber: number
      protein: number
      total: number
      proteinCounted: boolean
    }
  }
}

/** Energy (kJ) thresholds for solids → FSA-NPS A-points. We accept kcal and convert. */
const ENERGY_KJ_STEPS = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]
const SAT_FAT_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const SUGARS_STEPS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]
const SODIUM_MG_STEPS = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]
const FIBER_STEPS = [0.9, 1.9, 2.8, 3.7, 4.7]
const PROTEIN_STEPS = [1.6, 3.2, 4.8, 6.4, 8.0]

// Beverage-specific thresholds (Santé Publique France 2017 beverage table).
const ENERGY_BEV_STEPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270]
const SUGARS_BEV_STEPS = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5]

function stepwise(value: number, steps: number[]): number {
  for (let i = 0; i < steps.length; i++) {
    if (value <= steps[i]) return i
  }
  return steps.length
}

function fruitVegPoints(pct: number, beverage: boolean): number {
  if (beverage) {
    if (pct > 80) return 10
    if (pct > 60) return 4
    if (pct > 40) return 2
    return 0
  }
  if (pct > 80) return 5
  if (pct > 60) return 2
  if (pct > 40) return 1
  return 0
}

export function computeNutriScore(input: NutriScoreInput): NutriScoreResult {
  const beverage = !!input.isBeverage

  // Negative points
  const energy_kj = input.energy_kcal * 4.184
  const energyPts = stepwise(energy_kj, beverage ? ENERGY_BEV_STEPS : ENERGY_KJ_STEPS)
  const satFatPts = stepwise(input.sat_fat_g, SAT_FAT_STEPS)
  const sugarsPts = stepwise(input.sugars_g, beverage ? SUGARS_BEV_STEPS : SUGARS_STEPS)
  const sodiumPts = stepwise(input.sodium_mg, SODIUM_MG_STEPS)
  const negativeTotal = energyPts + satFatPts + sugarsPts + sodiumPts

  // Positive points
  const fvPts = fruitVegPoints(input.fruit_veg_legume_pct, beverage)
  const fiberPts = stepwise(input.fiber_g, FIBER_STEPS)
  const proteinPts = stepwise(input.protein_g, PROTEIN_STEPS)

  // FSA-NPS rule: if negative >= 11 AND fruit/veg < 5 → protein does NOT count
  // (prevents high-sugar high-protein products from gaming the score).
  const proteinCounted = negativeTotal < 11 || fvPts >= 5
  const positiveTotal = fvPts + fiberPts + (proteinCounted ? proteinPts : 0)

  const points = negativeTotal - positiveTotal

  // Grade thresholds (2017 official algorithm)
  let grade: NutriGrade
  if (beverage) {
    // Water → A; beverages: A(only water) B<=1 C<=5 D<=9 E>=10
    if (points <= 1) grade = "B"
    else if (points <= 5) grade = "C"
    else if (points <= 9) grade = "D"
    else grade = "E"
    // Plain water override is not done here (we never hit it via meal logging).
  } else {
    if (points <= -1) grade = "A"
    else if (points <= 2) grade = "B"
    else if (points <= 10) grade = "C"
    else if (points <= 18) grade = "D"
    else grade = "E"
  }

  return {
    points,
    grade,
    breakdown: {
      negative: {
        energy: energyPts,
        satFat: satFatPts,
        sugars: sugarsPts,
        sodium: sodiumPts,
        total: negativeTotal,
      },
      positive: {
        fruitVeg: fvPts,
        fiber: fiberPts,
        protein: proteinPts,
        total: positiveTotal,
        proteinCounted,
      },
    },
  }
}

/**
 * Map a grade to a 0-20 point scale for the app's display score.
 * Chosen to align with published Nutri-Score consumer-acceptability work:
 * A/B → green zone, C → amber, D/E → red.
 */
export function gradeToPoints(grade: NutriGrade): number {
  switch (grade) {
    case "A":
      return 18
    case "B":
      return 14
    case "C":
      return 10
    case "D":
      return 6
    case "E":
      return 2
  }
}
