import type { FoodItem, FoodGroup } from "./types"
import { inferNovaFromName, type NovaGroup } from "./nova"

interface USDANutrient {
  nutrientId: number
  nutrientName: string
  value: number
}

interface USDAFood {
  fdcId?: number
  description?: string
  foodNutrients?: USDANutrient[]
  foodCategory?: string | { description?: string }
}

interface USDAResponse {
  foods?: USDAFood[]
}

/**
 * USDA FoodData Central nutrient IDs used here (all per 100 g edible portion):
 *   1003  Protein
 *   1008  Energy (kcal)
 *   1079  Fibre, total dietary
 *   1258  Fatty acids, total saturated
 *   2000  Sugars, total including NLEA
 *   1235  Sugars, added (fallback)
 *   1093  Sodium, Na
 *   1162  Vitamin C, total ascorbic acid
 *   1089  Iron, Fe
 *   1087  Calcium, Ca
 *   1092  Potassium, K
 */
export async function lookupUSDA(query: string): Promise<FoodItem | null> {
  const apiKey = process.env.USDA_API_KEY
  if (!apiKey) return null

  try {
    const tokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
      query,
    )}&pageSize=5&api_key=${apiKey}`

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null

    const data: USDAResponse = await res.json()
    const rankedFoods = (data.foods || [])
      .map((food) => {
        const text =
          `${food.description || ""} ${
            typeof food.foodCategory === "string"
              ? food.foodCategory
              : food.foodCategory?.description || ""
          }`.toLowerCase()
        let score = 0
        for (const t of tokens) {
          if (text.includes(t)) score += 1
        }
        if (text.startsWith(query.toLowerCase())) score += 2
        return { food, score }
      })
      .sort((a, b) => b.score - a.score)
    const food = rankedFoods[0]?.food
    if (!food || !food.foodNutrients) return null

    const findNutrient = (id: number) =>
      food.foodNutrients?.find((n) => n.nutrientId === id)?.value || 0

    const protein_g = findNutrient(1003)
    const calories = findNutrient(1008)
    const fiber_g = findNutrient(1079)
    const carbs_g = findNutrient(1005)
    const fat_g = findNutrient(1004)
    const sat_fat_g = findNutrient(1258)
    const sugars_total = findNutrient(2000)
    const sugars_added = findNutrient(1235)
    const sugars_g = sugars_total || sugars_added
    const sodium_mg = findNutrient(1093)
    const vitamin_c_mg = findNutrient(1162)
    const iron_mg = findNutrient(1089)
    const calcium_mg = findNutrient(1087)
    const potassium_mg = findNutrient(1092)

    const rawCategory = food.foodCategory
    const category = (typeof rawCategory === "string" ? rawCategory : rawCategory?.description || "").toLowerCase()

    const isVeggie = category.includes("vegetable")
    const isFruit = category.includes("fruit")
    const isProtein =
      category.includes("meat") ||
      category.includes("poultry") ||
      category.includes("dairy") ||
      category.includes("egg") ||
      category.includes("legume")
    const isGrain = category.includes("cereal") || category.includes("baked") || category.includes("grain")
    const isProcessed =
      category.includes("snack") ||
      category.includes("sweet") ||
      category.includes("fast") ||
      category.includes("soup") ||
      category.includes("sauce")
    const isBeverage = category.includes("beverage") || category.includes("drink")

    const fruit_veg_legume_pct = isVeggie || isFruit || category.includes("legume") ? 100 : 0

    // NOVA heuristic: prefer name-based inference, bump to at least 3 for
    // categorical processed items (canned, packaged, fast-food etc.)
    let novaGroup: NovaGroup = inferNovaFromName(food.description || query)
    if (isProcessed && novaGroup < 3) novaGroup = 3

    const foodGroup: FoodGroup = isProcessed
      ? "processed"
      : isVeggie
        ? "veggie"
        : isFruit
          ? "fruit"
          : isProtein
            ? "protein"
            : isGrain
              ? "grain"
              : "mixed"

    // USDA values are per 100 g — we treat one USDA "serving" as 100 g.
    return {
      name: food.description || query,
      serving_g: 100,
      protein_g,
      calories,
      fiber_g,
      carbs_g,
      fat_g,
      sat_fat_g,
      sugars_g,
      sodium_mg,
      vitamin_c_mg,
      iron_mg,
      calcium_mg,
      potassium_mg,
      fruit_veg_legume_pct,
      novaGroup,
      isBeverage: isBeverage || undefined,
      isVeggie,
      isProcessed,
      foodGroup,
      foodGroups: [foodGroup],
      source: "usda",
      confidence: Math.min(0.9, 0.45 + (rankedFoods[0]?.score || 0) * 0.1),
      matchNote: "usda ranked top result",
    }
  } catch {
    return null
  }
}
