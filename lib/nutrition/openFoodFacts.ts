import type { FoodItem, FoodGroup } from "./types"
import { inferNovaFromName, type NovaGroup } from "./nova"

interface OFFProduct {
  product_name?: string
  ingredients_text?: string
  ingredients?: Array<{ text?: string; percent_estimate?: number }>
  nutriments?: {
    proteins_100g?: number
    "energy-kcal_100g"?: number
    fiber_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
    "vitamin-c_100g"?: number
    iron_100g?: number
    calcium_100g?: number
    potassium_100g?: number
    "saturated-fat_100g"?: number
    sugars_100g?: number
    sodium_100g?: number // grams per 100 g (OFF convention)
    salt_100g?: number
    "fruits-vegetables-legumes-nuts_100g"?: number
    "fruits-vegetables-nuts-estimate-from-ingredients_100g"?: number
  }
  nova_group?: number
  categories_tags?: string[]
}

interface OFFResponse {
  products?: OFFProduct[]
}

export async function lookupOpenFoodFacts(query: string): Promise<FoodItem | null> {
  try {
    const queryTokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
    const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(
      query,
    )}&fields=product_name,nutriments,nova_group,categories_tags,ingredients,ingredients_text&page_size=5`

    const res = await fetch(url, {
      headers: { "User-Agent": "FrictionMeal/1.0" },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data: OFFResponse = await res.json()
    const ranked = (data.products || [])
      .map((product) => {
        const hay = `${product.product_name || ""} ${(product.categories_tags || []).join(" ")}`.toLowerCase()
        let score = 0
        for (const t of queryTokens) {
          if (hay.includes(t)) score += 1
        }
        if ((product.product_name || "").toLowerCase().startsWith(query.toLowerCase())) score += 2
        return { product, score }
      })
      .sort((a, b) => b.score - a.score)

    const product = ranked[0]?.product
    if (!product || !product.nutriments) return null

    const n = product.nutriments
    const protein_g = n.proteins_100g || 0
    const calories = n["energy-kcal_100g"] || 0
    const fiber_g = n.fiber_100g || 0
    const carbs_g = n.carbohydrates_100g || 0
    const fat_g = n.fat_100g || 0
    const sat_fat_g = n["saturated-fat_100g"] || 0
    const sugars_g = n.sugars_100g || 0
    const vitamin_c_mg = n["vitamin-c_100g"] || 0
    const iron_mg = n.iron_100g || 0
    const calcium_mg = n.calcium_100g || 0
    const potassium_mg = n.potassium_100g || 0
    // OFF `sodium_100g` is grams → convert to mg; fall back to salt × 400.
    const sodium_mg = n.sodium_100g != null ? n.sodium_100g * 1000 : (n.salt_100g || 0) * 400

    const fruit_veg_legume_pct =
      n["fruits-vegetables-legumes-nuts_100g"] ??
      n["fruits-vegetables-nuts-estimate-from-ingredients_100g"] ??
      0

    const categories = product.categories_tags || []
    const isVeggie = categories.some((c) => c.includes("vegetable") || c.includes("salad"))
    const isBeverage = categories.some((c) => c.includes("beverage") || c.includes("drink"))

    const novaFromOff = product.nova_group
    const novaGroup: NovaGroup =
      novaFromOff && novaFromOff >= 1 && novaFromOff <= 4
        ? (novaFromOff as NovaGroup)
        : inferNovaFromName(product.product_name || query)

    const isProcessed = novaGroup >= 3

    const foodGroup: FoodGroup = isProcessed
      ? "processed"
      : isVeggie
        ? "veggie"
        : categories.some((c) => c.includes("fruit"))
          ? "fruit"
          : categories.some((c) => c.includes("meat") || c.includes("dairy"))
            ? "protein"
            : categories.some((c) => c.includes("cereal") || c.includes("bread"))
              ? "grain"
              : "mixed"

    const composition = (product.ingredients || [])
      .filter((i) => !!i?.text)
      .slice(0, 6)
      .map((i) => ({
        name: String(i.text || "").trim(),
        grams: Math.max(1, Math.round((i.percent_estimate ?? 0) || 0)),
      }))

    return {
      name: product.product_name || query,
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
      composition: composition.length > 0 ? composition : undefined,
      source: "off",
      confidence: Math.min(0.85, 0.4 + (ranked[0]?.score || 0) * 0.1),
      matchNote: "openfoodfacts ranked top result",
    }
  } catch {
    return null
  }
}
