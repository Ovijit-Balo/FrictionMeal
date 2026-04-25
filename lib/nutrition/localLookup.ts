import localDB from "./localDatabase.json"
import type { FoodComponent, FoodGroup, FoodItem } from "./types"
import type { NovaGroup } from "./nova"

interface LocalFoodEntry {
  serving_g: number
  protein_g: number
  fiber_g: number
  calories: number
  carbs_g?: number
  fat_g?: number
  vitamin_c_mg?: number
  iron_mg?: number
  calcium_mg?: number
  potassium_mg?: number
  sat_fat_g: number
  sugars_g: number
  sodium_mg: number
  fruit_veg_legume_pct: number
  novaGroup: NovaGroup
  isBeverage?: boolean
  isVeggie: boolean
  isProcessed: boolean
  foodGroup: string
  foodGroups?: string[]
  composition?: FoodComponent[]
  cost_bdt_per_serving: number
  aliases?: string[]
}

const DB = localDB as Record<string, LocalFoodEntry>

export function normalizeFoodName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(a|an|the|slice|slices|piece|pieces|cup|cups|bowl|bowls|serving|servings|of|plate|plates|glass|glasses|with|and)\b/g, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:g|gram|grams|kg|ml|l)\b/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function lookupLocal(query: string): FoodItem | null {
  const normalized = normalizeFoodName(query)
  if (!normalized) return null

  // direct match
  if (DB[normalized]) {
    return toFoodItem(normalized, DB[normalized], 1, "local exact")
  }

  // alias match
  for (const [key, entry] of Object.entries(DB)) {
    if (entry.aliases?.some((a) => normalized.includes(a) || a.includes(normalized))) {
      return toFoodItem(key, entry, 0.92, "local alias")
    }
    if (normalized.includes(key) || key.includes(normalized)) {
      return toFoodItem(key, entry, 0.82, "local fuzzy")
    }
  }

  return null
}

function toFoodItem(name: string, entry: LocalFoodEntry, confidence: number, matchNote: string): FoodItem {
  const primary = entry.foodGroup as FoodGroup
  // Normalise foodGroups — always an array, always starting with the primary.
  const groupsFromEntry = (entry.foodGroups as FoodGroup[] | undefined) ?? []
  const groups: FoodGroup[] = [primary, ...groupsFromEntry.filter((group) => group !== primary)]

  const fat_g =
    entry.fat_g != null
      ? entry.fat_g
      : Math.max(entry.sat_fat_g || 0, (entry.sat_fat_g || 0) * 2.5)
  const carbs_g =
    entry.carbs_g != null
      ? entry.carbs_g
      : Math.max(0, (entry.calories - (entry.protein_g * 4 + fat_g * 9)) / 4)

  return {
    name,
    serving_g: entry.serving_g,
    protein_g: entry.protein_g,
    fiber_g: entry.fiber_g,
    calories: entry.calories,
    carbs_g: Math.round(carbs_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
    vitamin_c_mg: entry.vitamin_c_mg ?? 0,
    iron_mg: entry.iron_mg ?? 0,
    calcium_mg: entry.calcium_mg ?? 0,
    potassium_mg: entry.potassium_mg ?? 0,
    sat_fat_g: entry.sat_fat_g,
    sugars_g: entry.sugars_g,
    sodium_mg: entry.sodium_mg,
    fruit_veg_legume_pct: entry.fruit_veg_legume_pct,
    novaGroup: entry.novaGroup,
    isBeverage: entry.isBeverage,
    isVeggie: entry.isVeggie,
    isProcessed: entry.isProcessed,
    foodGroup: primary,
    foodGroups: groups,
    composition: entry.composition,
    source: "local",
    cost_bdt_per_serving: entry.cost_bdt_per_serving,
    confidence,
    matchNote,
  }
}

export function getAllLocalFoods(): Record<string, LocalFoodEntry> {
  return DB
}

function tokenSet(value: string): Set<string> {
  return new Set(value.split(" ").filter((t) => t.length > 1))
}

/**
 * Returns the closest local-food keys for typo-tolerant suggestions.
 * Keeps implementation lightweight (token overlap + substring checks)
 * so we can offer usable alternatives without a full fuzzy index.
 */
export function findClosestLocalFoods(query: string, limit = 3): string[] {
  const normalized = normalizeFoodName(query)
  if (!normalized) return []

  const qTokens = tokenSet(normalized)
  const scored: Array<{ key: string; score: number }> = []

  for (const [key, entry] of Object.entries(DB)) {
    const aliasCandidates = [key, ...(entry.aliases ?? [])].map(normalizeFoodName)
    let best = 0

    for (const candidate of aliasCandidates) {
      if (!candidate) continue
      if (candidate === normalized) {
        best = Math.max(best, 100)
        continue
      }
      if (candidate.includes(normalized) || normalized.includes(candidate)) {
        best = Math.max(best, 80)
      }

      const cTokens = tokenSet(candidate)
      const overlap = [...qTokens].filter((t) => cTokens.has(t)).length
      if (overlap > 0) {
        // Weighted overlap score; longer candidate gets slightly lower bonus.
        const denom = Math.max(1, cTokens.size)
        const overlapScore = (overlap / denom) * 60
        const lengthPenalty = Math.max(0, candidate.length - normalized.length) * 0.3
        best = Math.max(best, overlapScore - lengthPenalty)
      }
    }

    if (best >= 20) scored.push({ key, score: best })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.key)
}
