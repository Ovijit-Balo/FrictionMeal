/**
 * NOVA food classification.
 *
 * NOVA (Monteiro et al., University of São Paulo, 2009+) is the food
 * classification system endorsed by the FAO and PAHO for tracking the
 * degree of industrial food processing:
 *
 *   1 — Unprocessed or minimally processed (fruit, rice, milk, eggs)
 *   2 — Processed culinary ingredients (oil, sugar, salt)
 *   3 — Processed foods (canned veg, cheese, bread, fish in oil)
 *   4 — Ultra-processed foods (soft drinks, packaged snacks, fast food,
 *       instant noodles, reconstituted meat products, sweetened cereals)
 *
 * Ultra-processed foods (group 4) are strongly associated with increased
 * all-cause mortality, cardiovascular disease, type 2 diabetes and obesity
 * in large prospective cohorts:
 *
 *   - Srour B. et al. (2019). "Ultra-processed food intake and risk of
 *     cardiovascular disease: prospective cohort study (NutriNet-Santé)."
 *     BMJ 365:l1451.
 *   - Rico-Campà A. et al. (2019). "Association between consumption of
 *     ultra-processed foods and all-cause mortality: SUN prospective
 *     cohort study." BMJ 365:l1949.
 *   - Monteiro CA. et al. (2019). "Ultra-processed foods, diet quality,
 *     and health using the NOVA classification system." FAO.
 *   - Pagliai G. et al. (2021). "Consumption of ultra-processed foods and
 *     health status: systematic review and meta-analysis." British Journal
 *     of Nutrition 125(3):308-318.
 *
 * This module prefers the NOVA group returned by Open Food Facts (crowd-
 * sourced, reviewed) and falls back to a keyword heuristic.
 */

export type NovaGroup = 1 | 2 | 3 | 4

const ULTRA_PROCESSED_KEYWORDS = [
  "soft drink",
  "soda",
  "cola",
  "pepsi",
  "sprite",
  "coke",
  "chips",
  "crisps",
  "fries",
  "french fries",
  "burger",
  "hamburger",
  "cheeseburger",
  "pizza",
  "instant noodle",
  "ramen",
  "packaged",
  "nugget",
  "sausage",
  "hot dog",
  "biscuit",
  "cookie",
  "candy",
  "chocolate bar",
  "ice cream",
  "cereal bar",
  "energy drink",
  "frozen meal",
]

const PROCESSED_KEYWORDS = [
  "canned",
  "pickled",
  "smoked",
  "cured",
  "cheese",
  "bread",
  "white bread",
  "bun",
  "loaf",
  "jam",
  "jelly",
  "butter",
]

const CULINARY_INGREDIENT_KEYWORDS = [
  "oil",
  "ghee",
  "sugar",
  "salt",
  "honey",
  "vinegar",
  "syrup",
]

export function inferNovaFromName(name: string): NovaGroup {
  const n = name.toLowerCase()
  if (ULTRA_PROCESSED_KEYWORDS.some((k) => n.includes(k))) return 4
  if (PROCESSED_KEYWORDS.some((k) => n.includes(k))) return 3
  if (CULINARY_INGREDIENT_KEYWORDS.some((k) => n.includes(k))) return 2
  return 1
}

export function novaLabel(group: NovaGroup): string {
  switch (group) {
    case 1:
      return "Unprocessed / minimally processed"
    case 2:
      return "Processed culinary ingredient"
    case 3:
      return "Processed"
    case 4:
      return "Ultra-processed"
  }
}

/**
 * Evidence-based penalty to apply on top of a Nutri-Score-derived points total.
 * NOVA 4 foods have documented harms independent of nutrient profile
 * (Srour 2019 BMJ; Rico-Campà 2019 BMJ), so we penalise them explicitly.
 */
export function novaAdjustment(group: NovaGroup): number {
  switch (group) {
    case 1:
      return 2
    case 2:
      return 1
    case 3:
      return 0
    case 4:
      return -5
  }
}
