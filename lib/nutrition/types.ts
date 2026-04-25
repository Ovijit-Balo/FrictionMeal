import type { NovaGroup } from "./nova"

export type FoodGroup = "grain" | "protein" | "veggie" | "fruit" | "processed" | "mixed"
export type NutritionSource = "off" | "usda" | "local" | "ai"

/**
 * A single component inside a composite food (e.g. pizza = dough + cheese +
 * sauce + toppings). Used for explanation UIs only — scoring always reads
 * the aggregate per-serving macros so adding this field does not alter any
 * existing calculation.
 */
export interface FoodComponent {
  name: string
  grams: number
}

export interface FoodItem {
  name: string

  /** Size of one canonical serving in grams — used to derive per-100 g density */
  serving_g: number

  // Per-serving totals (existing contract — kept for backwards compatibility)
  protein_g: number
  calories: number
  fiber_g: number
  carbs_g?: number
  fat_g?: number
  vitamin_c_mg?: number
  iron_mg?: number
  calcium_mg?: number
  potassium_mg?: number

  // Newly required for evidence-based scoring. Per-serving values.
  sat_fat_g: number
  sugars_g: number
  sodium_mg: number

  /** Weight-percent of fruits / vegetables / legumes / nuts (0..100) */
  fruit_veg_legume_pct: number

  /** NOVA group 1..4 (Monteiro et al.) */
  novaGroup: NovaGroup

  /** Beverage flag → Nutri-Score uses a different grade scale for drinks */
  isBeverage?: boolean

  // Legacy flags — retained for existing callers
  isVeggie: boolean
  isProcessed: boolean

  /**
   * Primary food group. Kept required for backwards compatibility — callers
   * that need the full set should read `foodGroups` (which defaults to
   * `[foodGroup]` when a source only provides one).
   */
  foodGroup: FoodGroup

  /**
   * All food groups this item contributes to. A pizza contributes to
   * `grain` (dough), `protein` (cheese), and `processed` (cured meat +
   * industrial preparation) simultaneously. Optional to stay back-compat
   * with older DB entries / API responses.
   */
  foodGroups?: FoodGroup[]

  /**
   * Optional ingredient-level breakdown for composite dishes. Not read by
   * the scoring engine — purely for "why this grade?" explanations.
   */
  composition?: FoodComponent[]

  source: NutritionSource
  cost_bdt_per_serving?: number

  /**
   * Count of this item in the meal (e.g. "2 eggs" → quantity = 2).
   * Extracted from the raw query string by `lookupFood`. Downstream
   * scoring multiplies every per-serving nutrient by this before
   * combining with portionSize. Defaults to 1 when omitted.
   */
  quantity?: number

  /**
   * Heuristic confidence in the lookup match (0..1). Local exact matches
   * should be near 1, fuzzy/API matches lower.
   */
  confidence?: number
  matchNote?: string
}
