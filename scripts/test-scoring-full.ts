/**
 * End-to-end scoring test.
 *
 * Feeds the new Nutri-Score + NOVA + WHO pipeline with realistic meals
 * a Bangladeshi user would log, then prints score, grade, NOVA group,
 * WHO flags, and the alternatives engine output side-by-side so we can
 * eyeball that:
 *   (a) junk foods are being flagged correctly
 *   (b) alternatives change based on the actual WHO flags (not hard-coded)
 *   (c) healthy meals don't get punished
 */

import { lookupMultiple } from "../lib/nutrition/lookup"
import { assessMeal } from "../lib/nutrition/score"
import { suggestAlternatives } from "../lib/nutrition/alternatives"

interface Case {
  label: string
  items: string[]
  portion: number
  expectedGrade?: string
  maxScore?: number
  minScore?: number
}

const cases: Case[] = [
  // Balanced Bangladeshi meals
  { label: "Rice + dal + spinach", items: ["rice", "dal", "spinach"], portion: 1, minScore: 14 },
  { label: "2 eggs + 1 roti + salad", items: ["eggs", "roti", "vegetable salad"], portion: 1, minScore: 14 },
  { label: "Grilled chicken + rice + salad", items: ["chicken", "rice", "vegetable salad"], portion: 1, minScore: 14 },
  { label: "Fish curry + rice", items: ["fish", "rice"], portion: 1, minScore: 10 },

  // Additional Bangladeshi meals
  { label: "Panta bhat + onion", items: ["rice", "onion"], portion: 1, minScore: 8 },
  { label: "Khichuri + vegetables", items: ["rice", "dal", "vegetables"], portion: 1, minScore: 12 },
  { label: "Shutki + rice", items: ["fish", "rice"], portion: 1, minScore: 10 },
  { label: "Muri + gur", items: ["puffed rice", "jaggery"], portion: 1, maxScore: 12 },

  // Middle-ground
  { label: "Biryani", items: ["biryani"], portion: 1, maxScore: 10 },
  { label: "Beef + rice", items: ["beef", "rice"], portion: 1 },
  { label: "Haleem", items: ["haleem"], portion: 1, maxScore: 12 },

  // Junk / ultra-processed
  { label: "Pizza slice", items: ["pizza"], portion: 1, expectedGrade: "D", maxScore: 6 },
  { label: "Burger + fries + coke", items: ["burger", "french fries", "soft drink"], portion: 1, maxScore: 5 },
  { label: "Coke (330 ml)", items: ["soft drink"], portion: 1, maxScore: 4 },
  { label: "French fries only", items: ["french fries"], portion: 1, maxScore: 6 },
  { label: "Chowmein", items: ["chowmein"], portion: 1, maxScore: 8 },

  // Snacks
  { label: "Banana", items: ["banana"], portion: 1, minScore: 14 },
  { label: "Apple", items: ["apple"], portion: 1, minScore: 14 },
  { label: "Yogurt", items: ["yogurt"], portion: 1, minScore: 10 },
  { label: "Tea (sweetened)", items: ["tea"], portion: 1 },
  { label: "Milk", items: ["milk"], portion: 1, minScore: 8 },

  // Bangladeshi street foods
  { label: "Fuchka + chotpoti", items: ["fuchka", "chotpoti"], portion: 1, maxScore: 10 },
  { label: "Jhalmuri", items: ["puffed rice", "spices", "vegetables"], portion: 1, maxScore: 12 },
]

function pad(s: string, n: number) {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length)
}

function padR(s: string, n: number) {
  return s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s
}

async function main() {
  console.log("\n" + "=".repeat(92))
  console.log("  MEAL SCORING — Nutri-Score + NOVA + WHO flag pipeline")
  console.log("=".repeat(92))
  console.log(
    pad("Meal", 36) +
      pad("Grade", 7) +
      padR("Score", 7) +
      padR("NOVA", 6) +
      "  " +
      pad("WHO flags", 32),
  )
  console.log("-".repeat(92))

  let pass = 0
  let fail = 0
  const alternativesObserved = new Map<string, string[]>()

  for (const c of cases) {
    const foods = await lookupMultiple(c.items)
    if (foods.length === 0) {
      console.log(pad(c.label, 36) + "  [items not found]")
      fail++
      continue
    }
    const a = assessMeal(foods, c.portion)
    const alts = suggestAlternatives(foods, a.whoFlags)
    alternativesObserved.set(
      c.label,
      alts.map((x) => x.name),
    )

    const flagsShort = a.whoFlags.map((f) => f.key).join(",") || "—"
    console.log(
      pad(c.label, 36) +
        pad(a.grade, 7) +
        padR(`${a.score}/20`, 7) +
        padR(String(a.novaGroup), 6) +
        "  " +
        pad(flagsShort, 32),
    )

    let ok = true
    if (c.expectedGrade && c.expectedGrade !== a.grade) ok = false
    if (c.maxScore !== undefined && a.score > c.maxScore) ok = false
    if (c.minScore !== undefined && a.score < c.minScore) ok = false
    if (ok) pass++
    else {
      fail++
      console.log(
        `    ^ expected grade=${c.expectedGrade ?? "any"} score ∈ [${c.minScore ?? "?"}, ${c.maxScore ?? "?"}]`,
      )
    }
  }

  console.log("-".repeat(92))
  console.log(`  ${pass} passed · ${fail} failed\n`)

  // Show that alternatives are dynamic — print only meals that had flags
  console.log("=".repeat(92))
  console.log("  ALTERNATIVES (are they actually dynamic per meal?)")
  console.log("=".repeat(92))
  for (const [meal, names] of alternativesObserved.entries()) {
    if (names.length > 0) {
      console.log(`  ${pad(meal, 34)} →  ${names.join("  |  ")}`)
    }
  }
  console.log()

  // Tiny demonstration of aggregation correctness
  console.log("=".repeat(92))
  console.log("  QUANTITY PARSING CHECK (known bug: leading number stripped)")
  console.log("=".repeat(92))
  const two = await lookupMultiple(["2 eggs"])
  const six = await lookupMultiple(["6 eggs"])
  const aTwo = assessMeal(two, 1)
  const aSix = assessMeal(six, 1)
  console.log(
    `  "2 eggs" → ${aTwo.totals.protein_g.toFixed(1)} g protein, ${Math.round(aTwo.totals.energy_kcal)} kcal`,
  )
  console.log(
    `  "6 eggs" → ${aSix.totals.protein_g.toFixed(1)} g protein, ${Math.round(aSix.totals.energy_kcal)} kcal`,
  )
  console.log(
    `  Should differ by 4× — if they match, the quantity multiplier is being dropped.\n`,
  )

  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
