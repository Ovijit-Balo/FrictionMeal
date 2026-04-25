import type { FoodItem } from "./types"
import { findClosestLocalFoods, lookupLocal, normalizeFoodName } from "./localLookup"
import { lookupOpenFoodFacts } from "./openFoodFacts"
import { lookupUSDA } from "./usda"

/**
 * Splits a raw item string like "2 eggs" or "1.5 roti" into
 * { quantity, rest }. Falls back to quantity = 1 if no leading number.
 *
 * This is the *only* place we extract the quantity. Downstream lookups
 * (local / USDA / OFF) receive the food name without the number, so we
 * don't have to duplicate the normalization logic across providers.
 */
type UnitToken = "g" | "kg" | "ml" | "l" | null

function extractQuantity(raw: string): { quantity: number; rest: string; amount?: number; unit: UnitToken } {
  const trimmed = raw.trim()
  const unitMatch = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*(g|gram|grams|kg|ml|l)\s+(.+)$/i,
  )
  if (unitMatch) {
    const amount = Number(unitMatch[1])
    const unitRaw = unitMatch[2].toLowerCase()
    const unit: UnitToken =
      unitRaw === "g" || unitRaw === "gram" || unitRaw === "grams"
        ? "g"
        : unitRaw === "kg"
          ? "kg"
          : unitRaw === "ml"
            ? "ml"
            : "l"
    if (Number.isFinite(amount) && amount > 0) {
      return { quantity: 1, rest: unitMatch[3].trim(), amount, unit }
    }
  }

  const fractionOnly = trimmed.match(/^(\d+)\s*\/\s*(\d+)\s+(.+)$/)
  if (fractionOnly) {
    const num = Number(fractionOnly[1])
    const den = Number(fractionOnly[2])
    const q = den > 0 ? num / den : NaN
    if (Number.isFinite(q) && q > 0) return { quantity: q, rest: fractionOnly[3].trim(), unit: null }
  }

  const withFraction = trimmed.match(/^(\d+(?:\.\d+)?)\s+(\d+)\s*\/\s*(\d+)\s+(.+)$/)
  if (withFraction) {
    const whole = Number(withFraction[1])
    const num = Number(withFraction[2])
    const den = Number(withFraction[3])
    const q = den > 0 ? whole + num / den : NaN
    if (Number.isFinite(q) && q > 0) return { quantity: q, rest: withFraction[4].trim(), unit: null }
  }

  const m = trimmed.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)
  if (m) {
    const q = parseFloat(m[1])
    if (Number.isFinite(q) && q > 0) return { quantity: q, rest: m[2].trim(), unit: null }
  }
  return { quantity: 1, rest: trimmed, unit: null }
}

function quantityFromAmount(
  item: FoodItem,
  amount: number | undefined,
  unit: UnitToken,
): { quantity: number; note?: string } {
  if (!amount || !unit) return { quantity: 1 }
  const grams = unit === "kg" ? amount * 1000 : unit === "l" ? amount * 1000 : amount
  const base = item.serving_g || 100
  if (!Number.isFinite(base) || base <= 0) return { quantity: 1 }
  return {
    quantity: Math.max(0.1, grams / base),
    note: `${Math.round(grams)}${unit === "ml" || unit === "l" ? " ml" : " g"} normalized to serving`,
  }
}

/**
 * Cascade lookup: Local first (fast, reliable for local foods) → USDA → Open Food Facts.
 * Local is prioritized because it has Bangladeshi foods that OFF/USDA don't know well.
 *
 * The returned FoodItem carries `quantity` so that `assessMeal` can scale
 * per-serving nutrients by the right multiple ("2 eggs" vs "6 eggs").
 */
export async function lookupFood(query: string): Promise<FoodItem | null> {
  const parsed = extractQuantity(query)
  const { quantity, rest, amount, unit } = parsed

  // 1. Local database (fast)
  const local = lookupLocal(rest)
  if (local) {
    const unitBased = quantityFromAmount(local, amount, unit)
    return {
      ...local,
      quantity: unit ? unitBased.quantity : quantity,
      matchNote: local.matchNote || unitBased.note,
    }
  }

  // 2. USDA (good for generic foods)
  const usda = await lookupUSDA(rest)
  if (usda && usda.calories > 0) {
    const unitBased = quantityFromAmount(usda, amount, unit)
    return {
      ...usda,
      quantity: unit ? unitBased.quantity : quantity,
      matchNote: usda.matchNote || unitBased.note,
    }
  }

  // 3. Open Food Facts (good for branded foods)
  const off = await lookupOpenFoodFacts(rest)
  if (off && off.calories > 0) {
    const unitBased = quantityFromAmount(off, amount, unit)
    return {
      ...off,
      quantity: unit ? unitBased.quantity : quantity,
      matchNote: off.matchNote || unitBased.note,
    }
  }

  return null
}

/**
 * Parses a user's meal text like "2 eggs, 1 roti, rice" into an array of
 * raw item queries. Each returned string keeps its leading quantity so
 * that (a) it can be echoed back to the client verbatim (`meal.foodItems`)
 * and (b) `lookupFood` can extract the quantity when looking it up.
 */
export function parseFoodItems(text: string): string[] {
  return text
    .replace(/\s+(?:and|with|\+)\s+/gi, ", ")
    .split(/[,;\n|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export async function lookupMultiple(queries: string[]): Promise<FoodItem[]> {
  const results = await Promise.all(queries.map((q) => lookupFood(q)))
  return results.filter((r): r is FoodItem => r !== null)
}

export function isLikelySameFood(query: string, resolvedName: string): boolean {
  const q = normalizeFoodName(extractQuantity(query).rest)
  const r = normalizeFoodName(resolvedName)
  if (!q || !r) return false
  return q === r || q.includes(r) || r.includes(q)
}

export function suggestLocalMatchesForQueries(queries: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const q of queries) {
    const suggestions = findClosestLocalFoods(q, 3)
    if (suggestions.length > 0) out[q] = suggestions
  }
  return out
}
