import type { FoodItem } from "./types"
import type { WhoFlag } from "./whoTargets"

export interface Alternative {
  name: string
  benefit: string
  detail: string
  /** Short provenance string shown in UI — keeps suggestions accountable */
  citation?: string
  /**
   * Concrete food name that can be appended to the meal in one tap.
   * Must resolve via `lookupFood` (typically a key / alias in
   * `localDatabase.json`). Optional — some alternatives are behavioural
   * advice rather than a substitute item.
   */
  addFood?: string
}

export interface AlternativeContext {
  pauseReason?: "expensive" | "unhealthy" | "both" | null
  mealCost?: number
  dailyBudget?: number
}

/**
 * Suggests additions / swaps driven by WHO / EFSA / FAO targets rather than
 * hand-picked rules. Each suggestion is tied to a published dietary guideline
 * so the user can see *why* it is recommended.
 *
 * When `addFood` is set, the UI may offer a one-tap "Add to meal" chip that
 * prepends the named food (which must exist in `localDatabase.json`) to the
 * text input so the user can re-log with a healthier composition.
 */
export function suggestAlternatives(
  foodItems: FoodItem[],
  whoFlags: WhoFlag[] = [],
  context: AlternativeContext = {},
): Alternative[] {
  const out: Alternative[] = []
  const flagged = new Set(whoFlags.map((f) => f.key))
  const hasUltraProcessed = foodItems.some((f) => (f.novaGroup ?? 1) === 4)
  const isCostHeavy =
    (context.pauseReason === "expensive" || context.pauseReason === "both") &&
    (context.mealCost ?? 0) > 0

  if (flagged.has("sodium")) {
    out.push({
      name: "Swap to a home-cooked version",
      benefit: "Cuts sodium sharply",
      detail:
        "Restaurant / packaged versions often supply > 800 mg Na per serving. A home-cooked plate with a pinch of salt is typically 1/3 of that.",
      citation: "WHO 2012 sodium guideline",
    })
  }

  if (flagged.has("satFat")) {
    out.push({
      name: "Grilled or steamed instead of fried",
      benefit: "Lowers saturated fat",
      detail:
        "Substituting fried protein with grilled, baked or steamed preparation typically removes 5-10 g of saturated fat per serving.",
      citation: "WHO 2023 saturated fat guideline",
    })
  }

  if (flagged.has("sugars")) {
    out.push({
      name: "Water or unsweetened tea",
      benefit: "Removes free sugars",
      detail:
        "A 330 ml sugary drink carries ~35 g of free sugars — ~70 % of the WHO daily ceiling on its own.",
      citation: "WHO 2015 free-sugars guideline",
      addFood: "tea",
    })
  }

  if (flagged.has("lowFiber") || flagged.has("lowFruitVeg")) {
    out.push({
      name: "Add a side of leafy greens",
      benefit: "More fiber, vitamins",
      detail:
        "A 100 g portion of shak / spinach adds ~3 g fiber and moves you towards the 400 g fruit-and-veg daily goal.",
      citation: "WHO/FAO 2003; EFSA 2010",
      addFood: "spinach",
    })
  }

  if (flagged.has("lowProtein")) {
    out.push({
      name: "Add a cup of dal",
      benefit: "+18 g protein, +15 g fiber",
      detail:
        "Low-cost protein hits your per-meal goal (~17 g) without adding ultra-processed content.",
      citation: "WHO/FAO/UNU 2007 protein requirements",
      addFood: "dal",
    })
  }

  if (isCostHeavy) {
    out.push({
      name: "Try a lower-cost balanced base",
      benefit: "Cuts cost, keeps satiety",
      detail:
        "Use rice + dal + vegetables as the base and add smaller portions of premium items. This usually lowers cost while keeping fiber and protein stable.",
      citation: "Food-based dietary guideline pattern",
      addFood: "dal",
    })
  }

  const mealIsHealthy =
    !flagged.has("sodium") &&
    !flagged.has("satFat") &&
    !flagged.has("sugars") &&
    !flagged.has("lowFiber") &&
    !flagged.has("lowFruitVeg") &&
    !flagged.has("lowProtein")
  if (isCostHeavy && mealIsHealthy) {
    out.push({
      name: "Keep the meal, reduce quantity",
      benefit: "Same choice, less spend",
      detail:
        "Your quality is already good. Logging 0.5-1 portion instead of 1.5-2 can keep nutrition quality while protecting daily budget.",
    })
  }

  if (hasUltraProcessed && !flagged.has("satFat") && !flagged.has("sodium")) {
    out.push({
      name: "Reduce ultra-processed share",
      benefit: "Lower UPF exposure",
      detail:
        "Cohort studies link high UPF intake to cardiovascular disease and all-cause mortality — try a minimally-processed swap when possible.",
      citation: "Srour 2019 BMJ; Rico-Campà 2019 BMJ",
    })
  }

  if (out.length === 0) {
    out.push({
      name: "Drink water first",
      benefit: "Check if you're actually hungry",
      detail: "Thirst is frequently mistaken for hunger — wait 5 minutes before eating.",
    })
  }

  return out.slice(0, 3)
}
